# ABM Learning Platform

An interactive learning platform for exploring **agent-based models (ABM)** in the browser. A **FastAPI + Mesa 3** backend runs the simulations and a **React + TypeScript + Vite** frontend lets you launch them, tune parameters (some while they run), and watch system-level behavior emerge step by step.

## Included models

| Model | Key concepts |
|---|---|
| **Predator-Prey** | Lotka-Volterra dynamics, population cycles, trophic cascades |
| **SIR Epidemic** | Disease spreading, herd immunity, R₀, epidemic curves |
| **Forest Fire** | Percolation theory, phase transitions, critical density threshold |
| **Diffusion of Innovations** | Bass model, S-curves, innovation vs. imitation coefficients |
| **Schelling Segregation** | Emergence, tipping points, micro-macro link |
| **Wealth Distribution** | Sugarscape, Gini coefficient, resource competition |

## Stack

- Backend: Python 3.11+, Mesa 3, FastAPI, Uvicorn
- Frontend: React 18, TypeScript, Vite, Tailwind (layout), Recharts
- Communication: REST to create simulations, WebSocket for live updates
- Design: see [STYLE.md](STYLE.md) (tokens, components, light and dark themes)

## Running locally

Prerequisites: Python 3.11+ and Node.js 18+.

```bash
./start.sh          # development: hot reload on both sides
./start.sh --prod   # production-like: one process, same as Railway
```

| Mode | Open | What runs |
|---|---|---|
| `./start.sh` | http://localhost:3000 | FastAPI with `--reload` on :8000, Vite dev server on :3000 proxying `/api` and `/ws` |
| `./start.sh --prod` | http://localhost:8000 | Builds `frontend/dist`, then FastAPI serves the app, API and WebSocket on one port |

API docs are at http://localhost:8000/docs in both modes. The script creates `.venv`, installs dependencies, and loads `.env` if present.

### Manual start

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn backend.main_api:app --reload          # from the repository root

cd frontend && npm install && npm run dev       # in a second terminal
```

## Deploying to Railway

The repository deploys as **one service** from the [Dockerfile](Dockerfile): a Node stage builds the frontend, and a Python stage serves it together with the API and WebSocket on Railway's `$PORT`. [railway.json](railway.json) sets the health check (`/api/health`), the restart policy and a single replica.

1. Create a Railway project and choose **Deploy from GitHub repo** (or run `railway up` with the Railway CLI from the repository root).
2. Railway detects `railway.json` and builds the Dockerfile. No variables are required.
3. Under **Settings → Networking**, select **Generate Domain**. WebSockets work over the same domain (`wss://`).

Keep the service at **one replica**. Simulations live in process memory, so a second replica would not know about a simulation created on the first, and a redeploy or restart drops running simulations. Idle simulations expire after `SIM_TTL_SECONDS`, and a simulation is deleted as soon as its last browser tab disconnects.

### Environment variables

All are optional; see [.env.example](.env.example).

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8000` | Listening port (Railway sets it) |
| `HOST` | `0.0.0.0` | Bind address |
| `LOG_LEVEL` | `info` | Uvicorn and app log level |
| `CORS_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Origins allowed to call the API cross-origin. Not needed when the frontend is served by the backend |
| `SIM_TTL_SECONDS` | `1800` | Idle time before an unwatched simulation is removed |
| `MAX_SIMULATIONS` | `200` | Cap on simulations kept in memory (least recently used are evicted) |
| `MAX_STEPS_PER_REQUEST` | `100` | Upper bound for a single `step` request |
| `FRONTEND_DIST` | `frontend/dist` | Built frontend to serve |
| `VITE_API_BASE_URL`, `VITE_WS_BASE_URL` | same origin | Build-time overrides when the API is hosted elsewhere |

## Project layout

```text
ABM-learning-platform/
├── backend/
│   ├── main_api.py          # FastAPI app: REST, WebSocket, SPA serving
│   ├── settings.py          # Environment configuration
│   ├── store.py             # In-memory simulation store (TTL + LRU cap)
│   ├── models/
│   │   ├── registry.py      # Model registry, parameter bounds, live parameters
│   │   ├── base.py          # Incremental history helper
│   │   └── *.py             # One Mesa model per file
│   └── tests/               # pytest: models, API, WebSocket protocol
├── frontend/
│   ├── src/
│   │   ├── app/             # Shell, router, theme
│   │   ├── components/      # UI primitives, canvas grid, chart, controls
│   │   ├── hooks/           # useSimulation (REST + WebSocket)
│   │   ├── models/          # Per-model UI config and Python code generators
│   │   └── pages/           # Model library, simulation page
│   └── vite.config.ts       # Dev server on :3000 with API/WS proxy
├── Dockerfile, railway.json # Deployment
├── start.sh                 # Local runner (dev and --prod)
├── STYLE.md                 # Design language
└── plan.md                  # Improvement plan and status
```

## Testing and linting

```bash
source .venv/bin/activate
pytest                      # backend tests
ruff check backend          # backend lint

cd frontend
npm run lint                # ESLint, including the Rules of Hooks
npm run build               # type-check and production build
```

GitHub Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs all of these on each push and pull request, then builds the Docker image and smoke-tests it.

## API

### REST

| Method and path | Purpose |
|---|---|
| `GET /api/health` | Health check (used by Railway) |
| `GET /api/models` | Model types with parameter bounds and which parameters are live |
| `POST /api/simulation/create` | Create a simulation: `{"model_type": "sir", "params": {"population": 400, "seed": 42}}` |
| `GET /api/simulation/{id}/state` | Current grid and counts |
| `GET /api/simulation/{id}/history` | Full metric history |
| `POST /api/simulation/{id}/control` | `{"action": "step", "steps": 5}` or `{"action": "reset"}` |
| `DELETE /api/simulation/{id}` | Remove a simulation |

### WebSocket

Connect to `/ws/simulation/{id}` (`ws://` locally, `wss://` behind HTTPS) and send JSON commands:

| Command | Effect |
|---|---|
| `{"command": "get_state"}` | Send the current state and full history |
| `{"command": "start", "speed": 0.3}` | Run continuously with 0.3 s between steps |
| `{"command": "set_speed", "speed": 0.1}` | Change the delay while running |
| `{"command": "pause"}` | Pause |
| `{"command": "step", "steps": 1}` | Advance 1–100 steps |
| `{"command": "reset"}` | Rebuild from the initial parameters (and seed) |
| `{"command": "update_params", "params": {"transmission_rate": 0.5}}` | Change a live parameter mid-run |

The server replies with:

| Message | Meaning |
|---|---|
| `{"type": "state", "data": {...}, "history": [...], "append": bool}` | New state. When `append` is true, `history` holds only rows the client has not seen; otherwise it is the full series |
| `{"type": "ended", "step": n, "message": "..."}` | The model reached a terminal state |
| `{"type": "paused", "step": n}` | Run loop stopped |
| `{"type": "params_updated", "params": {...}}` | Live parameters applied |
| `{"type": "error", "message": "..."}` | Invalid command or parameters; the connection stays open |

## Adding a new model

1. Create `backend/models/my_model.py` with a Mesa `Model` subclass that takes `seed=None`, calls `super().__init__(rng=seed)`, uses `self.random` for randomness, stores `initial_params`, and implements `get_api_state()` and `get_api_history(start=0)` (use `history_rows` from `base.py`).
2. Register it in `backend/models/registry.py` with `PARAM_SPECS` bounds and any `LIVE_PARAMS`. The tests check that the specs match the constructor.
3. Add `--sim-*` color tokens for its states to both theme blocks in `frontend/src/index.css` (see STYLE.md §9).
4. Add a `ModelConfig` (icon, parameters, metrics, KPIs, agent styles, legend, preview) in `frontend/src/models/configs.ts` and the id to `MODEL_ORDER`.
5. Optionally add a Colab code generator in `frontend/src/models/codeGenerators.ts`.

## Model parameter reference

### Predator-Prey

| Param | Default | Description |
|---|---|---|
| width / height | 20 | Grid dimensions |
| initial_sheep | 100 | Starting sheep count |
| initial_wolves | 20 | Starting wolf count |
| sheep_reproduce_threshold | 6 | Energy needed to reproduce |
| wolf_reproduce_threshold | 24 | Energy needed to reproduce |
| sheep_gain_from_food | 4 | Energy per grass patch |
| wolf_gain_from_food | 20 | Energy per sheep eaten |
| grass_regrowth_time | 30 | Steps to regrow |

### SIR Epidemic

| Param | Default | Description |
|---|---|---|
| population | 400 | Total agents |
| initial_infected | 5 | Seed infections |
| transmission_rate | 0.30 | Probability of infection per contact |
| recovery_time | 14 | Steps until recovery |

### Forest Fire

| Param | Default | Description |
|---|---|---|
| tree_density | 0.65 | Fraction of cells with trees |
| spread_prob | 1.0 | Fire spread probability to adjacent tree |

*Critical threshold: ~0.59 for a square grid (von Neumann neighborhood).*

### Diffusion of Innovations

| Param | Default | Description |
|---|---|---|
| density | 0.85 | Population density on grid |
| innovation_coeff (p) | 0.01 | Spontaneous adoption rate |
| imitation_coeff (q) | 0.50 | Neighbor-influenced adoption rate |
| initial_adopters | 3 | Seed adopters |

### Schelling Segregation

| Param | Default | Description |
|---|---|---|
| density | 0.80 | Fraction of cells occupied |
| minority_pct | 0.30 | Fraction that are type B (orange) |
| homophily | 0.30 | Min fraction of same-type neighbors to be happy |

### Wealth Distribution (Sugarscape)

| Param | Default | Description |
|---|---|---|
| num_agents | 200 | Number of agents |
| max_vision | 5 | Maximum look-ahead distance |
| max_metabolism | 4 | Maximum sugar cost per step |
| max_initial_sugar | 20 | Peak sugar capacity in mountains |

Every model also accepts an optional integer `seed` for reproducible runs. The server rejects unknown parameters and values outside the bounds listed by `GET /api/models`.
