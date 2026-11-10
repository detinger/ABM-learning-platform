"""Runtime configuration read from environment variables.

Every value has a default that works for local development, so no .env file is
required. Railway injects PORT; everything else is optional.
"""

import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent


def _int(name: str, default: int) -> int:
    raw = os.getenv(name, "").strip()
    return int(raw) if raw else default


def _list(name: str, default: str) -> list[str]:
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


HOST = os.getenv("HOST", "0.0.0.0")
PORT = _int("PORT", 8000)

# Only needed when the frontend is served from a different origin (the Vite dev
# server proxies to the backend, so even local dev rarely needs this).
CORS_ORIGINS = _list("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")

# Where the built frontend lives. When it exists, the backend serves the SPA at "/".
FRONTEND_DIST = Path(os.getenv("FRONTEND_DIST", str(REPO_ROOT / "frontend" / "dist"))).resolve()

# In-memory simulation limits.
SIM_TTL_SECONDS = _int("SIM_TTL_SECONDS", 30 * 60)
MAX_SIMULATIONS = _int("MAX_SIMULATIONS", 200)
SWEEP_INTERVAL_SECONDS = _int("SWEEP_INTERVAL_SECONDS", 60)

# Per-request limits.
MAX_STEPS_PER_REQUEST = _int("MAX_STEPS_PER_REQUEST", 100)
MIN_SPEED_SECONDS = 0.02
MAX_SPEED_SECONDS = 5.0

LOG_LEVEL = os.getenv("LOG_LEVEL", "info")
