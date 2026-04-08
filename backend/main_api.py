"""
FastAPI backend for the ABM Learning Platform
Serves multiple Mesa agent-based models via REST + WebSocket.
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Any, Dict, Optional
import asyncio
import json
import os
import uuid

from models.registry import MODEL_REGISTRY, create_model

app = FastAPI(
    title="ABM Learning Platform API",
    description="REST + WebSocket API for Mesa agent-based simulations",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory simulation store
active_simulations: Dict[str, Any] = {}   # id -> model instance
simulation_types: Dict[str, str] = {}      # id -> model_type


# ==================== Pydantic Models ====================

class CreateRequest(BaseModel):
    model_type: str = "predator_prey"
    params: Dict[str, Any] = {}


class ControlRequest(BaseModel):
    action: str
    steps: Optional[int] = 1


# ==================== REST Endpoints ====================

@app.get("/")
async def root():
    return {
        "message": "ABM Learning Platform API",
        "version": "2.0.0",
        "models": list(MODEL_REGISTRY.keys()),
    }


@app.get("/api/models")
async def list_models():
    """List all available model types."""
    return {"models": list(MODEL_REGISTRY.keys())}


@app.post("/api/simulation/create")
async def create_simulation(req: CreateRequest):
    """Create a new simulation of the given model type."""
    try:
        model = create_model(req.model_type, req.params)
    except (ValueError, TypeError) as e:
        raise HTTPException(status_code=400, detail=str(e))

    sim_id = str(uuid.uuid4())[:8]
    active_simulations[sim_id] = model
    simulation_types[sim_id] = req.model_type

    return {
        "simulation_id": sim_id,
        "model_type": req.model_type,
        "is_running": False,
        "current_step": 0,
    }


@app.get("/api/simulations")
async def list_simulations():
    return {
        "simulations": [
            {"id": sid, "model_type": simulation_types.get(sid), "step": m.steps, "running": m.running}
            for sid, m in active_simulations.items()
        ]
    }


@app.get("/api/simulation/{sim_id}/state")
async def get_state(sim_id: str):
    if sim_id not in active_simulations:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return active_simulations[sim_id].get_api_state()


@app.get("/api/simulation/{sim_id}/history")
async def get_history(sim_id: str):
    if sim_id not in active_simulations:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return {"simulation_id": sim_id, "history": active_simulations[sim_id].get_api_history()}


@app.post("/api/simulation/{sim_id}/control")
async def control(sim_id: str, req: ControlRequest):
    if sim_id not in active_simulations:
        raise HTTPException(status_code=404, detail="Simulation not found")
    model = active_simulations[sim_id]

    if req.action == "step":
        for _ in range(req.steps or 1):
            if model.running:
                model.step()
        return {"status": "stepped", "current_step": model.steps}
    elif req.action in ("run", "resume"):
        model.running = True
        return {"status": "running", "current_step": model.steps}
    elif req.action in ("pause", "stop"):
        model.running = False
        return {"status": req.action, "current_step": model.steps}
    elif req.action == "reset":
        new_model = create_model(simulation_types[sim_id], model.initial_params)
        active_simulations[sim_id] = new_model
        return {"status": "reset", "current_step": 0}
    else:
        raise HTTPException(status_code=400, detail=f"Unknown action: {req.action}")


@app.delete("/api/simulation/{sim_id}")
async def delete_simulation(sim_id: str):
    if sim_id not in active_simulations:
        raise HTTPException(status_code=404, detail="Simulation not found")
    del active_simulations[sim_id]
    simulation_types.pop(sim_id, None)
    return {"status": "deleted", "simulation_id": sim_id}


# ==================== WebSocket ====================

@app.websocket("/ws/simulation/{sim_id}")
async def simulation_websocket(websocket: WebSocket, sim_id: str):
    await websocket.accept()

    if sim_id not in active_simulations:
        await websocket.send_json({"error": "Simulation not found"})
        await websocket.close()
        return

    run_task: asyncio.Task | None = None

    async def cancel_run_task():
        nonlocal run_task
        if run_task and not run_task.done():
            run_task.cancel()
            try:
                await run_task
            except asyncio.CancelledError:
                pass
        run_task = None

    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)
            command = data.get("command", "")

            model = active_simulations[sim_id]

            if command == "get_state":
                await websocket.send_json({
                    "type": "state_update",
                    "data": model.get_api_state(),
                    "history": model.get_api_history(),
                })

            elif command == "step":
                await cancel_run_task()
                steps = data.get("steps", 1)
                for _ in range(steps):
                    model.step()
                await websocket.send_json({
                    "type": "state_update",
                    "data": model.get_api_state(),
                    "history": model.get_api_history(),
                })

            elif command == "start":
                await cancel_run_task()
                model.running = True
                speed = float(data.get("speed", 0.5))

                async def run_loop(m=model, spd=speed):
                    while m.running:
                        m.step()
                        await websocket.send_json({
                            "type": "state_update",
                            "data": m.get_api_state(),
                            "history": m.get_api_history()[-100:],
                        })
                        if not m.running:
                            await websocket.send_json({
                                "type": "simulation_ended",
                                "message": "Simulation reached a terminal state",
                                "step": m.steps,
                            })
                            break
                        await asyncio.sleep(spd)

                run_task = asyncio.create_task(run_loop())

            elif command == "pause":
                model.running = False
                await cancel_run_task()
                await websocket.send_json({"type": "paused", "step": model.steps})

            elif command == "reset":
                model.running = False
                await cancel_run_task()
                new_model = create_model(simulation_types[sim_id], model.initial_params)
                active_simulations[sim_id] = new_model
                await websocket.send_json({
                    "type": "reset",
                    "data": new_model.get_api_state(),
                })

            elif command == "update_params":
                params = data.get("params", {})
                for k, v in params.items():
                    if hasattr(model, k):
                        setattr(model, k, v)
                await websocket.send_json({"type": "params_updated"})

    except WebSocketDisconnect:
        await cancel_run_task()
    except Exception as e:
        print(f"WebSocket error for {sim_id}: {e}")
        await cancel_run_task()
        try:
            await websocket.close()
        except Exception:
            pass


# ==================== Static files ====================

frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(frontend_dist):
    @app.get("/app")
    async def serve_app():
        return FileResponse(os.path.join(frontend_dist, "index.html"))

    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main_api:app", host="0.0.0.0", port=8000, reload=False)
