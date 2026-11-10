# syntax=docker/dockerfile:1

# ---- 1. Build the frontend -------------------------------------------------
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# ---- 2. Python runtime ------------------------------------------------------
FROM python:3.13-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8000
WORKDIR /app

COPY requirements.txt ./
RUN pip install -r requirements.txt

COPY backend/ ./backend/
COPY --from=frontend /app/frontend/dist ./frontend/dist

RUN useradd --create-home --uid 10001 app
USER app

EXPOSE 8000
# Railway sets $PORT; the shell form lets it expand. One worker on purpose:
# simulations live in process memory.
CMD uvicorn backend.main_api:app --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips='*'
