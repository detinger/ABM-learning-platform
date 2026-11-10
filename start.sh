#!/bin/bash
# ABM Learning Platform: local runner.
#
#   ./start.sh          Development: FastAPI with auto-reload on :8000 and the
#                       Vite dev server on :3000 (open http://localhost:3000).
#   ./start.sh --prod   Production-like: build the frontend and serve everything
#                       from FastAPI on :8000, the same way Railway runs it.
#
# Environment: PORT (backend port, default 8000), plus anything in .env.

set -euo pipefail

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$REPO_ROOT/.venv"
FRONTEND_DIR="$REPO_ROOT/frontend"
VENV_PYTHON="$VENV_DIR/bin/python"
MODE="dev"

case "${1:-}" in
    --prod|prod) MODE="prod" ;;
    ""|--dev|dev) MODE="dev" ;;
    -h|--help) sed -n '2,10p' "$0"; exit 0 ;;
    *) echo "Unknown option: $1 (use --prod or --dev)"; exit 1 ;;
esac

GREEN='\033[0;32m'; BLUE='\033[0;34m'; RED='\033[0;31m'; NC='\033[0m'
info() { echo -e "${BLUE}$*${NC}"; }
ok()   { echo -e "${GREEN}$*${NC}"; }
die()  { echo -e "${RED}Error: $*${NC}"; exit 1; }

# Load .env if present (simple KEY=VALUE lines).
if [ -f "$REPO_ROOT/.env" ]; then
    set -a; . "$REPO_ROOT/.env"; set +a
fi
BACKEND_PORT="${PORT:-8000}"
FRONTEND_PORT=3000

command -v python3 >/dev/null 2>&1 || die "python3 is required but was not found on PATH."
command -v npm >/dev/null 2>&1 || die "npm is required but was not found on PATH."

port_in_use() {
    if command -v lsof >/dev/null 2>&1; then
        [ -n "$(lsof -tiTCP:"$1" -sTCP:LISTEN 2>/dev/null || true)" ]
    else
        (echo >"/dev/tcp/127.0.0.1/$1") >/dev/null 2>&1
    fi
}

echo "ABM Learning Platform ($MODE)"
echo "=========================="

# ---- Dependencies -----------------------------------------------------------
if [ ! -x "$VENV_PYTHON" ]; then
    info "Creating virtual environment in .venv ..."
    python3 -m venv "$VENV_DIR"
fi
info "Installing Python dependencies..."
"$VENV_PYTHON" -m pip install -q -r "$REPO_ROOT/requirements.txt"

if [ ! -d "$FRONTEND_DIR/node_modules" ] || [ "$FRONTEND_DIR/package-lock.json" -nt "$FRONTEND_DIR/node_modules" ]; then
    info "Installing frontend dependencies..."
    (cd "$FRONTEND_DIR" && npm install --no-audit --no-fund && touch node_modules)
fi
ok "✓ Dependencies ready"
echo ""

port_in_use "$BACKEND_PORT" && die "port $BACKEND_PORT is already in use. Stop that process or set PORT=<other>."

# ---- Production-like --------------------------------------------------------
if [ "$MODE" = "prod" ]; then
    info "Building frontend..."
    (cd "$FRONTEND_DIR" && npm run build)
    ok "Serving app + API on http://localhost:$BACKEND_PORT (Ctrl+C to stop)"
    cd "$REPO_ROOT"
    PORT="$BACKEND_PORT" exec "$VENV_PYTHON" -m backend.main_api
fi

# ---- Development ------------------------------------------------------------
port_in_use "$FRONTEND_PORT" && die "port $FRONTEND_PORT is already in use (another Vite server?)."

PIDS=()
cleanup() {
    trap - EXIT INT TERM
    echo ""; echo "Stopping..."
    for pid in "${PIDS[@]:-}"; do [ -n "$pid" ] && kill "$pid" 2>/dev/null || true; done
    wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

cd "$REPO_ROOT"
"$VENV_PYTHON" -m uvicorn backend.main_api:app --reload --reload-dir backend \
    --host 127.0.0.1 --port "$BACKEND_PORT" &
PIDS+=($!)

(cd "$FRONTEND_DIR" && BACKEND_PORT="$BACKEND_PORT" exec npm run dev -- --port "$FRONTEND_PORT" --strictPort) &
PIDS+=($!)

sleep 2
for pid in "${PIDS[@]}"; do kill -0 "$pid" 2>/dev/null || die "a service failed to start; see the logs above."; done

echo ""
echo "=========================="
ok "  App      : http://localhost:$FRONTEND_PORT"
echo "  API      : http://localhost:$BACKEND_PORT/api"
echo "  API docs : http://localhost:$BACKEND_PORT/docs"
echo "  Ctrl+C stops both"
echo "=========================="
wait
