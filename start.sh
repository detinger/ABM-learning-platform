#!/bin/bash
# ABM Learning Platform — start backend + frontend

echo "ABM Learning Platform"
echo "=========================="

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Virtual environment
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi
source .venv/bin/activate

echo -e "${BLUE}Installing Python dependencies...${NC}"
pip install -q -r requirements.txt

# Frontend dependencies
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${BLUE}Installing frontend dependencies...${NC}"
    cd frontend && npm install && cd ..
fi

echo -e "${GREEN}✓ Dependencies ready${NC}"
echo ""

# Backend — run from backend/ so relative imports work
echo -e "${GREEN}Starting FastAPI backend on http://localhost:8000${NC}"
cd backend && python main_api.py &
BACKEND_PID=$!
cd ..

sleep 2

# Frontend
echo -e "${GREEN}Starting React frontend on http://localhost:3000${NC}"
cd frontend && npm run dev &
FRONTEND_PID=$!
cd ..

sleep 2

echo ""
echo "=========================="
echo "Both servers are running!"
echo ""
echo "  Frontend : http://localhost:3000"
echo "  Backend  : http://localhost:8000"
echo "  API Docs : http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop"
echo "=========================="
echo ""

trap "echo ''; echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT
wait
