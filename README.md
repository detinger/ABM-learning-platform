# ABM Learning Platform

An interactive learning platform for exploring **agent-based models (ABM)** in the browser. The project combines a **FastAPI + Mesa 3** backend with a **React + TypeScript + Vite** frontend so you can launch simulations, tune parameters, and watch system-level behavior emerge in real time.

## Included Models

| Model | Key Concepts |
|---|---|
| 🐺 **Predator-Prey** | Lotka-Volterra dynamics, population cycles, trophic cascades |
| 🦠 **SIR Epidemic** | Disease spreading, herd immunity, R₀, epidemic curves |
| 🔥 **Forest Fire** | Percolation theory, phase transitions, critical density threshold |
| 💡 **Diffusion of Innovations** | Bass model, S-curves, innovation vs. imitation coefficients |
| 🏘️ **Schelling Segregation** | Emergence, tipping points, micro-macro link, residential segregation |
| 💰 **Wealth Distribution** | Sugarscape, Gini coefficient, resource competition, Pareto principle |

## Stack

- Backend: Python, Mesa 3, FastAPI, Uvicorn
- Frontend: React 18, TypeScript, Vite, Recharts
- Communication: REST for simulation creation, WebSocket for live updates

## Project Layout

```text
ABM-learning-platform/
├── backend/
│   ├── main_api.py              # FastAPI app + WebSocket simulation loop
│   └── models/
│       ├── registry.py          # Model factory/registry
│       ├── predator_prey.py
│       ├── sir_model.py
│       ├── forest_fire.py
│       ├── diffusion.py
│       ├── schelling.py
│       └── wealth.py
├── frontend/
│   ├── src/
│   │   ├── components/          # Grid, charts, controls, code modal
│   │   ├── hooks/               # WebSocket and API state handling
│   │   ├── models/              # UI model configs and code generators
│   │   ├── pages/               # Library and simulation screens
│   │   └── types/
│   ├── package.json
│   └── vite.config.ts           # Dev server on port 3000 with API/WS proxy
├── requirements.txt
├── start.sh
└── README.md
```

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+

### One-command Start

```bash
chmod +x start.sh
./start.sh
```

This starts:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- OpenAPI docs: `http://localhost:8000/docs`

### Manual Start

**Backend**

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd backend
python main_api.py
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server runs on port `3000` and proxies `/api` and `/ws` traffic to the backend on port `8000`.

## How It Works

1. Create a simulation with `POST /api/simulation/create`.
2. Connect to `ws://localhost:8000/ws/simulation/{id}`.
3. Send commands such as `get_state`, `start`, `pause`, `step`, or `reset`.
4. Receive state snapshots and metric history as JSON messages.

If `frontend/dist` exists, the backend can also serve the built frontend at `http://localhost:8000/app`.

## API

### Create a Simulation

```http
POST /api/simulation/create
{
  "model_type": "sir",
  "params": {
    "width": 30,
    "height": 30,
    "population": 400,
    "initial_infected": 5,
    "transmission_rate": 0.3,
    "recovery_time": 14
  }
}
```

Returns:

```json
{
  "simulation_id": "abc12345",
  "model_type": "sir",
  "is_running": false,
  "current_step": 0
}
```

### WebSocket

```text
WS ws://localhost:8000/ws/simulation/{id}
```

| Command | Effect |
|---|---|
| `{"command":"get_state"}` | Fetch current grid and full history |
| `{"command":"start","speed":0.3}` | Run continuously at 0.3 s/step |
| `{"command":"pause"}` | Pause the simulation |
| `{"command":"step","steps":1}` | Advance by a fixed number of steps |
| `{"command":"reset"}` | Restore the initial state |

## Adding a New Model

1. Create `backend/models/my_model.py` with a Mesa `Model` subclass and a unique `MODEL_TYPE`.
2. Expose state/history through `get_api_state()` and `get_api_history()`.
3. Register the model in `backend/models/registry.py`.
4. Add a matching UI config in `frontend/src/models/configs.ts`.
5. Add the model id to the frontend ordering list.

## Model Parameter Reference

### Predator-Prey

| Param | Default | Description |
|---|---|---|
| width / height | 20 | Grid dimensions |
| initial_sheep | 100 | Starting sheep count |
| initial_wolves | 50 | Starting wolf count |
| sheep_reproduce_threshold | 8 | Energy needed to reproduce |
| wolf_reproduce_threshold | 16 | Energy needed to reproduce |
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
| minority_pct | 0.30 | Fraction that are type B (Red) |
| homophily | 0.30 | Min fraction of same-type neighbors to be happy |

### Wealth Distribution (Sugarscape)

| Param | Default | Description |
|---|---|---|
| num_agents | 200 | Number of agents |
| max_vision | 5 | Maximum look-ahead distance |
| max_metabolism | 4 | Maximum sugar cost per step |
| max_initial_sugar | 20 | Peak sugar capacity in mountains |

## Dependencies

**Python**

```text
mesa>=3.0.0
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
numpy>=1.24.0
pydantic>=2.0.0
websockets>=12.0
```

**Node**

```text
react@18
recharts@2
lucide-react
tailwindcss
vite
```
