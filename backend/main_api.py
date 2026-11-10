"""
FastAPI backend for the ABM Learning Platform.

Serves Mesa agent-based models via REST + WebSocket and, when a frontend build is
present, the single-page app itself, so one process handles everything on one origin.

Run from the repository root:
    uvicorn backend.main_api:app --reload        # development
    python -m backend.main_api                    # uses HOST / PORT env vars
"""

import asyncio
import json
import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import settings
from .models.registry import LIVE_PARAMS, MODEL_REGISTRY, PARAM_SPECS, validate_params
from .store import Session, SimulationStore

API_VERSION = "2.1.0"
log = logging.getLogger("abm")

store = SimulationStore(settings.SIM_TTL_SECONDS, settings.MAX_SIMULATIONS)


async def _sweep_forever() -> None:
    while True:
        await asyncio.sleep(settings.SWEEP_INTERVAL_SECONDS)
        removed = store.sweep()
        if removed:
            log.info("Expired %d idle simulation(s); %d active", removed, len(store))


@asynccontextmanager
async def lifespan(_: FastAPI):
    sweeper = asyncio.create_task(_sweep_forever())
    try:
        yield
    finally:
        sweeper.cancel()


app = FastAPI(
    title="ABM Learning Platform API",
    description="REST + WebSocket API for Mesa agent-based simulations",
    version=API_VERSION,
    lifespan=lifespan,
)

# Production serves the SPA from the same origin, so CORS only matters when the
# frontend runs elsewhere. Credentials are never used, so they stay disabled.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== Schemas ====================

class CreateRequest(BaseModel):
    model_type: str = "predator_prey"
    params: dict[str, Any] = Field(default_factory=dict)


class ControlRequest(BaseModel):
    action: str
    steps: int = Field(default=1, ge=1, le=settings.MAX_STEPS_PER_REQUEST)


def _require(sim_id: str) -> Session:
    session = store.get(sim_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return session


def _advance(session: Session, steps: int) -> int:
    """Step up to ``steps`` times, stopping early at a terminal state. Returns steps taken."""
    taken = 0
    for _ in range(steps):
        if not session.model.running:
            break
        session.model.step()
        taken += 1
    return taken


# ==================== REST ====================

def _api_info() -> dict[str, Any]:
    return {"message": "ABM Learning Platform API", "version": API_VERSION, "models": list(MODEL_REGISTRY)}


@app.get("/api")
async def api_root():
    return _api_info()


@app.get("/api/health")
async def health():
    return {"status": "ok", "simulations": len(store)}


@app.get("/api/models")
async def list_models():
    """List model types with their accepted parameters and bounds."""
    return {
        "models": list(MODEL_REGISTRY),
        "params": {
            model_type: {
                name: {"type": spec.kind.__name__, "min": spec.min, "max": spec.max,
                       "live": name in LIVE_PARAMS[model_type]}
                for name, spec in specs.items()
            }
            for model_type, specs in PARAM_SPECS.items()
        },
    }


@app.post("/api/simulation/create")
async def create_simulation(req: CreateRequest):
    try:
        session = store.create(req.model_type, req.params)
    except (ValueError, TypeError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {
        "simulation_id": session.id,
        "model_type": session.model_type,
        "seed": session.model.initial_params.get("seed"),
        "is_running": False,
        "current_step": 0,
    }


@app.get("/api/simulations")
async def list_simulations():
    return {
        "simulations": [
            {"id": s.id, "model_type": s.model_type, "step": s.model.steps,
             "finished": not s.model.running, "connections": s.connections}
            for s in store
        ]
    }


@app.get("/api/simulation/{sim_id}/state")
async def get_state(sim_id: str):
    return _require(sim_id).model.get_api_state()


@app.get("/api/simulation/{sim_id}/history")
async def get_history(sim_id: str):
    return {"simulation_id": sim_id, "history": _require(sim_id).model.get_api_history()}


@app.post("/api/simulation/{sim_id}/control")
async def control(sim_id: str, req: ControlRequest):
    session = _require(sim_id)
    if req.action == "step":
        taken = _advance(session, req.steps)
        return {"status": "stepped", "steps_taken": taken, "current_step": session.model.steps,
                "finished": not session.model.running}
    if req.action == "reset":
        session.reset()
        return {"status": "reset", "current_step": 0}
    raise HTTPException(status_code=400, detail=f"Unknown action '{req.action}'. Use 'step' or 'reset'.")


@app.delete("/api/simulation/{sim_id}")
async def delete_simulation(sim_id: str):
    if not store.delete(sim_id):
        raise HTTPException(status_code=404, detail="Simulation not found")
    return {"status": "deleted", "simulation_id": sim_id}


# ==================== WebSocket ====================
#
# Client -> server: {"command": "get_state" | "start" | "pause" | "step" | "reset"
#                               | "set_speed" | "update_params", ...}
# Server -> client:
#   {"type": "state", "data": {...}, "history": [...], "append": bool}
#       append=false: history is the full series; append=true: only new rows.
#   {"type": "ended", "step": n, "message": str}   terminal state reached
#   {"type": "paused", "step": n}
#   {"type": "params_updated", "params": {...}}
#   {"type": "error", "message": str}              the socket stays open


class _Connection:
    def __init__(self, websocket: WebSocket, session: Session):
        self.ws = websocket
        self.session = session
        self.sent_rows = 0  # history rows this client already has
        self.speed = 0.3
        self.run_task: asyncio.Task | None = None
        self._send_lock = asyncio.Lock()

    async def send(self, payload: dict[str, Any]) -> None:
        async with self._send_lock:
            await self.ws.send_json(payload)

    async def send_state(self, *, full: bool) -> None:
        model = self.session.model
        start = 0 if full else self.sent_rows
        rows = model.get_api_history(start)
        self.sent_rows = start + len(rows)
        await self.send({"type": "state", "data": model.get_api_state(), "history": rows, "append": not full})

    async def send_ended(self) -> None:
        await self.send({"type": "ended", "step": self.session.model.steps,
                         "message": "The simulation reached a terminal state."})

    async def stop_running(self) -> None:
        task, self.run_task = self.run_task, None
        if task and not task.done():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

    async def _run_loop(self) -> None:
        model = self.session.model
        while True:
            model.step()
            self.session.touch()
            await self.send_state(full=False)
            if not model.running:
                await self.send_ended()
                return
            await asyncio.sleep(self.speed)

    def _set_speed(self, raw: Any) -> None:
        try:
            speed = float(raw)
        except (TypeError, ValueError):
            return
        self.speed = min(max(speed, settings.MIN_SPEED_SECONDS), settings.MAX_SPEED_SECONDS)

    async def handle(self, data: dict[str, Any]) -> None:
        command = data.get("command")
        model = self.session.model

        if command == "get_state":
            await self.send_state(full=True)

        elif command == "step":
            await self.stop_running()
            try:
                steps = int(data.get("steps", 1))
            except (TypeError, ValueError):
                steps = 1
            steps = min(max(steps, 1), settings.MAX_STEPS_PER_REQUEST)
            _advance(self.session, steps)
            await self.send_state(full=False)
            if not model.running:
                await self.send_ended()

        elif command == "start":
            await self.stop_running()
            if "speed" in data:
                self._set_speed(data["speed"])
            if not model.running:
                await self.send_ended()
                return
            self.run_task = asyncio.create_task(self._run_loop())

        elif command == "set_speed":
            self._set_speed(data.get("speed"))

        elif command == "pause":
            await self.stop_running()
            await self.send({"type": "paused", "step": model.steps})

        elif command == "reset":
            await self.stop_running()
            self.session.reset()
            await self.send_state(full=True)

        elif command == "update_params":
            # Live params apply to the next step without pausing the run.
            params = validate_params(self.session.model_type, data.get("params") or {}, live_only=True)
            for name, value in params.items():
                setattr(model, name, value)
                model.initial_params[name] = value
            await self.send({"type": "params_updated", "params": params})

        else:
            await self.send({"type": "error", "message": f"Unknown command '{command}'"})


@app.websocket("/ws/simulation/{sim_id}")
async def simulation_websocket(websocket: WebSocket, sim_id: str):
    await websocket.accept()
    session = store.get(sim_id)
    if session is None:
        await websocket.send_json({"type": "error", "message": "Simulation not found. It may have expired."})
        await websocket.close(code=4404)
        return

    conn = _Connection(websocket, session)
    session.connections += 1
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
                if not isinstance(data, dict):
                    raise ValueError("Expected a JSON object")
                await conn.handle(data)
            except (ValueError, TypeError) as exc:
                await conn.send({"type": "error", "message": str(exc)})
    except WebSocketDisconnect:
        pass
    except Exception:  # noqa: BLE001 - log and close rather than crash the worker
        log.exception("WebSocket error for simulation %s", sim_id)
        try:
            await websocket.close(code=1011)
        except Exception:  # noqa: BLE001
            pass
    finally:
        await conn.stop_running()
        session.connections -= 1
        # The UI creates a fresh simulation per visit, so an unwatched one is garbage.
        if session.connections <= 0:
            store.delete(sim_id)


# ==================== Frontend (SPA) ====================

_index_html = settings.FRONTEND_DIST / "index.html"

if _index_html.is_file():
    _assets = settings.FRONTEND_DIST / "assets"
    if _assets.is_dir():
        app.mount("/assets", StaticFiles(directory=_assets), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa(full_path: str):
        if full_path.startswith(("api/", "ws/")):
            raise HTTPException(status_code=404, detail="Not found")
        candidate = (settings.FRONTEND_DIST / full_path).resolve()
        if full_path and candidate.is_file() and settings.FRONTEND_DIST in candidate.parents:
            return FileResponse(candidate)
        # Client-side routes (/, /models/sir, ...) all get the app shell.
        return FileResponse(_index_html, headers={"Cache-Control": "no-cache"})
else:
    @app.get("/", include_in_schema=False)
    async def root():
        info = _api_info()
        info["frontend"] = "Not built. Run `npm run build` in frontend/ or use the Vite dev server on :3000."
        return info


def main() -> None:
    import uvicorn

    logging.basicConfig(level=settings.LOG_LEVEL.upper())
    uvicorn.run("backend.main_api:app", host=settings.HOST, port=settings.PORT,
                log_level=settings.LOG_LEVEL, proxy_headers=True, forwarded_allow_ips="*")


if __name__ == "__main__":
    main()
