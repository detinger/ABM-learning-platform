# Improvement plan

## Status (2026-11-10, branch `improvements`)

| Section | Status |
|---|---|
| §1 Bugs 1–7 | Done. Covered by `backend/tests` and ESLint `react-hooks` |
| §2 Railway and local | Done. `Dockerfile`, `railway.json`, `.env.example`, `start.sh --prod`, `/api/health`, SPA at `/`. The Docker image was not built locally (no Docker on the dev machine); CI builds and smoke-tests it |
| §3.1 STYLE.md | Done. Adapted to this app; §9 is now the simulation grid |
| §3.2–3.3 UI | Done. Tokens, both themes, UI kit, sidebar shell, config/results layout, canvas grid, chart and table tabs, accessible dialog and tabs |
| §4 Tests, tooling, CI | Done. pytest (28 tests), ruff, ESLint, GitHub Actions |
| §4 Learning features | CSV export, random seed, bookmarkable `/models/:id` URLs and live parameters done. **Not done:** side-by-side comparison of two runs |

Reviewed: backend, frontend, `start.sh`, README, and `STYLE.md`. The frontend type-checks cleanly (`tsc --noEmit`).

Suggested order: **§1 → §2** (deployable app) **→ §3 steps 1–3 → canvas grid and §4**.

## 1. Bugs to fix first

| # | Issue | Where |
|---|---|---|
| 1 | **A React hook is called after an early return.** `useMemo` runs only when `gridState` is non-null, so the number of hooks changes between renders. React can then throw "Rendered more hooks than during the previous render" as the grid loads. | `frontend/src/components/SimulationGrid.tsx` |
| 2 | **`update_params` sets any attribute the client sends.** A client can overwrite `step`, `grid` or `running`. Accept only known parameters. | `backend/main_api.py` (WS `update_params`) |
| 3 | **No server-side input validation.** Grid size, agent count and `steps` have no upper limit, so one request for a 5000×5000 grid can take down a public instance. Add Pydantic bounds that match the frontend `parameterConfig`. | `create_simulation`, WS `step` |
| 4 | **Simulations are never removed from memory**, which leaks on a long-running server. Add a TTL and a cap (e.g. 30 min idle, 200 simulations), and delete a simulation when its WebSocket closes. | `active_simulations` |
| 5 | **History is inconsistent.** `step` sends the full history, but the run loop sends only the last 100 points, so the chart jumps and gets cut off. Send only the new point each tick and let the client append it. | WS handlers |
| 6 | `connectWebSocket` depends on `gridState`, which gives it a stale closure and recreates it on every update. Invalid JSON kills the socket. The run loop can end without notifying the client, so the UI stays on "Running". | `frontend/src/hooks/useSimulation.ts`, `backend/main_api.py` |
| 7 | `allow_origins=["*"]` combined with `allow_credentials=True` is a combination browsers reject. It isn't needed for same-origin production. Make origins configurable. | CORS middleware |

## 2. Railway deployment and local runs (one codebase)

The goal is **one service, same origin**: FastAPI serves the built SPA and also handles `/api` and `/ws`. This removes CORS and WebSocket URL configuration in production; the hook's existing `window.location.host` logic already handles it.

- **Port and host from the environment:** `PORT` (set by Railway), `HOST=0.0.0.0`, and `CORS_ORIGINS` (dev only).
- **Serve the SPA at `/`** with a fallback to `index.html` for client routes. Move the current JSON response at `/` to `/api`. Add `GET /api/health` for Railway's healthcheck.
- **Fix the import path.** `from models.registry` only works when the current directory is `backend/`. Make `backend` a package and run it as `uvicorn backend.main_api:app`.
- **Add a multi-stage `Dockerfile`:**
  - Node stage: `npm ci && npm run build`
  - Python slim stage: copy `frontend/dist`, install requirements, run `uvicorn backend.main_api:app --host 0.0.0.0 --port $PORT`
  - Add `.dockerignore` (`node_modules`, `.venv`, `dist`, `.git`) and `railway.json` (healthcheck path, restart policy).
- **Trim `requirements.txt`.** `matplotlib`, `solara`, `aiofiles` and `python-multipart` are never imported; dropping them makes the image much smaller (keep `networkx`: mesa imports it at startup). Pin versions or add a lock file.
- **Run a single replica.** Simulation state lives in memory, so scaling out would break WebSocket sessions. Document this, and note that a redeploy loses running simulations (acceptable for a learning app).
- **Local development:**
  - Keep `start.sh` (Vite on 3000 proxying to FastAPI on 8000) for hot reload.
  - Add `./start.sh --prod`, which builds the frontend and serves everything from port 8000, the same way Railway does.
  - Add `.env.example` with the variables above.
- Minor: rename the `predator-prey-frontend` package; fix the missing `/vite.svg` favicon.

## 3. Style: STYLE.md compared with the current UI

### 3.1 Adapt STYLE.md itself

`STYLE.md` is the untracked BPMN Studio guide. It still has that product's name, BPMN canvas tokens (§9) and a source map pointing to files that don't exist in this repo. Rewrite it as the **ABM Learning Platform design language**:

- Keep §1–8, §10 and §11.
- Replace §9 with **simulation grid tokens**: cell and agent colors per model, readable in both themes.
- Point the source map at this repo's real files.
- Commit it.

### 3.2 Gaps in the current UI

The UI is dark-only and uses hardcoded Tailwind `slate-*` classes throughout.

| STYLE.md says | Current app does |
|---|---|
| Semantic CSS tokens, light and dark themes, plus a `system` option | Dark only, Tailwind slate literals everywhere |
| No gradients, glass or heavy shadows | Gradient hero text, gradient logo, gradient card headers, `backdrop-blur`, `shadow-2xl` |
| Linked card hover changes border and shadow, with no scaling | `hover:scale-[1.02]` |
| Radii of 6 / 10 / 14px | `rounded-2xl` and `rounded-xl` mixed |
| Blue primary action, orange accent for an active simulation | Green Start and amber Pause buttons |
| Lucide outline icons | Emoji icons for models and counts |
| Charts: tokens, 2px lines, 10% flat fill, a table view | Hardcoded colors, gradient fills, no table |
| 14px body, Inter self-hosted, tabular numerals | Inter is declared but never loaded |
| Focus ring, skip link, dialog with Escape and focus handling | None of these; the code modal doesn't close on Escape |

### 3.3 Implementation steps

1. **Tokens:** define the CSS variables in `index.css` (`:root` and `[data-theme="dark"]`) and map them into `tailwind.config.js` (`bg: 'var(--bg)'`, `primary: 'var(--primary)'`, …). Components keep using Tailwind but gain both themes. Remove the predator-prey-specific colors from the Tailwind config.
2. **UI kit:** add a small `src/components/ui/` set (Button, Card, Badge, Callout, Dialog, KpiTile, Tabs) following STYLE.md §6.
3. **Shell and layout:** a 232px sidebar listing the models (collapses to 64px; horizontal at ≤820px). The Simulation page uses the "configuration and results" layout: a `380px` config column next to flexible results.
4. **Theme:** a toggle with saved preference that also follows the system theme. Charts resolve colors from tokens and re-theme when the theme changes.
5. **Canvas grid:** render the simulation grid on a `<canvas>` instead of one DOM node per cell (900–2500 divs re-render every tick). This is the biggest performance gain, and it makes theming the cells easy.

## 4. Quality and nice-to-haves

- **Tests:** `pytest` smoke tests for each model (create, step 50 times, check the state shape), plus API and WebSocket tests with FastAPI's `TestClient`.
- **Tooling:** `ruff` for Python, ESLint for the frontend, and a GitHub Action that runs the tests and builds the Docker image.
- **Learning features:**
  - Compare two runs side by side.
  - Export history as CSV.
  - A random seed for reproducible runs.
  - Bookmarkable URLs per model (`/models/sir`) instead of `useState` routing.
- **Docs:** update the README with Railway deploy steps, environment variables and the `--prod` local mode.
