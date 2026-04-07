#!/bin/bash
# ABM Learning Platform — start backend + frontend

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$SCRIPT_DIR"
VENV_DIR="$REPO_ROOT/.venv"
BACKEND_DIR="$REPO_ROOT/backend"
FRONTEND_DIR="$REPO_ROOT/frontend"
VENV_PYTHON="$VENV_DIR/bin/python"

echo "ABM Learning Platform"
echo "=========================="

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    if [ -z "${BACKEND_PID:-}" ] && [ -z "${FRONTEND_PID:-}" ]; then
        return
    fi

    echo ""
    echo "Stopping..."
    if [ -n "${BACKEND_PID:-}" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "${FRONTEND_PID:-}" ]; then
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
}

port_listener_pids() {
    local port="$1"
    lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true
}

port_is_in_use() {
    local port="$1"
    if [ -n "$(port_listener_pids "$port")" ]; then
        return 0
    fi
    return 1
}

describe_port_usage() {
    local port="$1"
    lsof -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true
}

require_running() {
    local pid="$1"
    local name="$2"
    local url="$3"

    if ! kill -0 "$pid" 2>/dev/null; then
        echo -e "${RED}Error: ${name} failed to start. Check the logs above for details.${NC}"
        exit 1
    fi

    echo -e "${GREEN}${name} is running at ${url}${NC}"
}

trap cleanup EXIT INT TERM

cd "$REPO_ROOT"

if ! command -v python3 >/dev/null 2>&1; then
    echo -e "${RED}Error: python3 is required but was not found on PATH.${NC}"
    exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
    echo -e "${RED}Error: npm is required but was not found on PATH.${NC}"
    exit 1
fi

if ! command -v lsof >/dev/null 2>&1; then
    echo -e "${RED}Error: lsof is required but was not found on PATH.${NC}"
    exit 1
fi

# Virtual environment
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment..."
    python3 -m venv "$VENV_DIR"
fi

if [ ! -x "$VENV_PYTHON" ]; then
    echo -e "${RED}Error: virtual environment is missing python in $VENV_DIR/bin.${NC}"
    exit 1
fi

echo -e "${BLUE}Installing Python dependencies...${NC}"
"$VENV_PYTHON" -m pip install -q -r "$REPO_ROOT/requirements.txt"

# Frontend dependencies
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo -e "${BLUE}Installing frontend dependencies...${NC}"
    (
        cd "$FRONTEND_DIR"
        npm install
    )
fi

echo -e "${GREEN}✓ Dependencies ready${NC}"
echo ""

# Backend — run from backend/ so relative imports work
if port_is_in_use 8000; then
    echo -e "${BLUE}FastAPI backend already appears to be running on http://localhost:8000${NC}"
    describe_port_usage 8000
else
    echo -e "${GREEN}Starting FastAPI backend on http://localhost:8000${NC}"
    (
        cd "$BACKEND_DIR"
        exec "$VENV_PYTHON" main_api.py
    ) &
    BACKEND_PID=$!

    sleep 2
    require_running "$BACKEND_PID" "FastAPI backend" "http://localhost:8000"
fi

# Frontend
if port_is_in_use 3000; then
    echo -e "${BLUE}React frontend already appears to be running on http://localhost:3000${NC}"
    describe_port_usage 3000
else
    echo -e "${GREEN}Starting React frontend on http://localhost:3000${NC}"
    (
        cd "$FRONTEND_DIR"
        exec npm run dev
    ) &
    FRONTEND_PID=$!

    sleep 2
    require_running "$FRONTEND_PID" "React frontend" "http://localhost:3000"
fi

echo ""
echo "=========================="
echo "Services are available!"
echo ""
echo "  Frontend : http://localhost:3000"
echo "  Backend  : http://localhost:8000"
echo "  API Docs : http://localhost:8000/docs"
echo ""
if [ -n "${BACKEND_PID:-}" ] || [ -n "${FRONTEND_PID:-}" ]; then
    echo "Press Ctrl+C to stop the services started by this script"
else
    echo "Both services were already running, so nothing new was started"
fi
echo "=========================="
echo ""

wait
