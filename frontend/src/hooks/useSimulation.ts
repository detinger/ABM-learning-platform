import { useCallback, useEffect, useRef, useState } from 'react';
import type { GridState, HistoryPoint } from '../types';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

// Same-origin by default (Vite proxies in dev; FastAPI serves the app in production).
// Override only when the API lives on another origin.
const API_BASE_URL = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL?.trim() ?? '');
const WS_BASE_URL = (() => {
  const configured = import.meta.env.VITE_WS_BASE_URL?.trim();
  if (configured) return trimTrailingSlash(configured);
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}`;
})();

/** Client-side history cap; long runs keep the most recent points. */
const MAX_HISTORY = 5000;

export type SimulationStatus = 'idle' | 'connecting' | 'ready' | 'running' | 'ended' | 'disconnected' | 'error';

export interface Notice {
  tone: 'info' | 'success' | 'warning';
  message: string;
}

type ServerMessage =
  | { type: 'state'; data: GridState; history: HistoryPoint[]; append: boolean }
  | { type: 'ended'; step: number; message: string }
  | { type: 'paused'; step: number }
  | { type: 'params_updated'; params: Record<string, number> }
  | { type: 'error'; message: string };

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === 'string') return body.detail;
    if (Array.isArray(body?.detail)) return body.detail.map((d: { msg?: string }) => d.msg).join('; ');
  } catch {
    /* not JSON */
  }
  return `${res.status} ${res.statusText}`;
}

export function useSimulation() {
  const [simulationId, setSimulationId] = useState<string | null>(null);
  const [gridState, setGridState] = useState<GridState | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [status, setStatus] = useState<SimulationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  // Incremented on every launch so late responses from a previous run are ignored.
  const generation = useRef(0);

  const send = useCallback((payload: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }, []);

  const closeSocket = useCallback(() => {
    const ws = wsRef.current;
    wsRef.current = null;
    if (ws) {
      ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null;
      ws.close();
    }
  }, []);

  const connect = useCallback((id: string, gen: number) => {
    const ws = new WebSocket(`${WS_BASE_URL}/ws/simulation/${id}`);
    wsRef.current = ws;
    const timeout = window.setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN && gen === generation.current) {
        setStatus('error');
        setError('Timed out connecting to the simulation server. Check that the backend is running, then try again.');
        closeSocket();
      }
    }, 8000);

    ws.onopen = () => {
      window.clearTimeout(timeout);
      ws.send(JSON.stringify({ command: 'get_state' }));
    };

    ws.onmessage = (event) => {
      if (gen !== generation.current) return;
      let msg: ServerMessage;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      switch (msg.type) {
        case 'state':
          setGridState(msg.data);
          setHistory((prev) => {
            const next = msg.append ? prev.concat(msg.history) : msg.history;
            return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
          });
          setStatus((s) => (s === 'connecting' || s === 'ended' ? 'ready' : s));
          if (!msg.append) setNotice(null);
          break;
        case 'ended':
          setStatus('ended');
          setNotice({ tone: 'success', message: `The simulation reached a terminal state at step ${msg.step}. Reset or create a new simulation to continue.` });
          break;
        case 'paused':
          setStatus('ready');
          break;
        case 'params_updated':
          break;
        case 'error':
          setError(msg.message);
          break;
      }
    };

    ws.onclose = () => {
      window.clearTimeout(timeout);
      if (gen !== generation.current) return;
      wsRef.current = null;
      setStatus((s) => (s === 'error' ? s : 'disconnected'));
      setError((e) => e ?? 'The connection to the simulation server closed. Create a new simulation to continue.');
    };

    ws.onerror = () => {
      window.clearTimeout(timeout);
      if (gen !== generation.current) return;
      setStatus('error');
      setError('Could not reach the simulation server. Check that the backend is running, then try again.');
    };
  }, [closeSocket]);

  /** Create a simulation on the server and stream it over a WebSocket. */
  const launch = useCallback(async (modelType: string, params: Record<string, number>) => {
    const gen = ++generation.current;
    closeSocket();
    setStatus('connecting');
    setError(null);
    setNotice(null);
    setGridState(null);
    setHistory([]);
    setSimulationId(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/simulation/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_type: modelType, params }),
      });
      if (!res.ok) throw new Error(await readError(res));
      const data: { simulation_id: string } = await res.json();
      if (gen !== generation.current) return;
      setSimulationId(data.simulation_id);
      connect(data.simulation_id, gen);
    } catch (err) {
      if (gen !== generation.current) return;
      setStatus('error');
      const detail = err instanceof Error ? err.message : String(err);
      setError(`Could not create the simulation: ${detail}`);
    }
  }, [closeSocket, connect]);

  const start = useCallback((speed: number) => {
    if (send({ command: 'start', speed })) setStatus('running');
  }, [send]);
  const pause = useCallback(() => send({ command: 'pause' }), [send]);
  const step = useCallback((steps = 1) => send({ command: 'step', steps }), [send]);
  const reset = useCallback(() => {
    if (send({ command: 'reset' })) {
      setStatus('ready');
      setNotice(null);
    }
  }, [send]);
  const setSpeed = useCallback((speed: number) => send({ command: 'set_speed', speed }), [send]);
  const updateLiveParams = useCallback(
    (params: Record<string, number>) => send({ command: 'update_params', params }),
    [send],
  );

  useEffect(
    () => () => {
      generation.current++;
      closeSocket();
    },
    [closeSocket],
  );

  return {
    simulationId,
    gridState,
    history,
    status,
    isConnected: status === 'ready' || status === 'running' || status === 'ended',
    isRunning: status === 'running',
    error,
    notice,
    clearError: () => setError(null),
    clearNotice: () => setNotice(null),
    launch,
    start,
    pause,
    step,
    reset,
    setSpeed,
    updateLiveParams,
  };
}
