import { useState, useCallback, useRef, useEffect } from 'react';
import { GridState, HistoryPoint, CreateRequest } from '../types';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const API_BASE_URL = (() => {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  return configured ? trimTrailingSlash(configured) : '';
})();

const WS_BASE_URL = (() => {
  const configured = import.meta.env.VITE_WS_BASE_URL?.trim();
  if (configured) {
    return trimTrailingSlash(configured);
  }

  if (typeof window === 'undefined') {
    return 'ws://localhost:8000';
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}`;
})();

const apiUrl = (path: string) => `${API_BASE_URL}${path}`;
const wsUrl = (path: string) => `${WS_BASE_URL}${path}`;

export const useSimulation = () => {
  const [simulationId, setSimulationId] = useState<string | null>(null);
  const [gridState, setGridState] = useState<GridState | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  const loadSimulationSnapshot = useCallback(async (id: string) => {
    const [stateRes, historyRes] = await Promise.all([
      fetch(apiUrl(`/api/simulation/${id}/state`)),
      fetch(apiUrl(`/api/simulation/${id}/history`)),
    ]);

    if (!stateRes.ok) throw new Error(await stateRes.text());
    if (!historyRes.ok) throw new Error(await historyRes.text());

    const state = await stateRes.json();
    const historyPayload = await historyRes.json();
    setGridState(state);
    setHistory(historyPayload.history ?? []);
  }, []);

  const createSimulation = useCallback(async (req: CreateRequest) => {
    try {
      setError(null);
      setIsConnected(false);
      setIsRunning(false);
      setGridState(null);
      setHistory([]);

      const res = await fetch(apiUrl('/api/simulation/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSimulationId(data.simulation_id);
      await loadSimulationSnapshot(data.simulation_id);
      setError(null);
      return data.simulation_id as string;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      throw err;
    }
  }, [loadSimulationSnapshot]);

  const connectWebSocket = useCallback((id: string) => {
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      wsRef.current.close();
    }

    setIsConnected(false);
    setIsRunning(false);

    const ws = new WebSocket(wsUrl(`/ws/simulation/${id}`));
    wsRef.current = ws;
    let opened = false;
    const connectTimeout = window.setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        setError(`Timed out connecting to the simulation backend on ${wsUrl('/ws')}`);
        setIsConnected(false);
        ws.close();
      }
    }, 5000);

    ws.onopen = () => {
      opened = true;
      window.clearTimeout(connectTimeout);
      setIsConnected(true);
      setError(null);
      ws.send(JSON.stringify({ command: 'get_state' }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === 'state_update') {
        setGridState(msg.data);
        if (msg.history) setHistory(msg.history);
      } else if (msg.type === 'simulation_ended') {
        setIsRunning(false);
        setError(`Simulation ended at step ${msg.step}: ${msg.message}`);
      } else if (msg.type === 'paused') {
        setIsRunning(false);
      } else if (msg.type === 'reset') {
        setGridState(msg.data);
        setHistory([]);
        setIsRunning(false);
        setError(null);
      }
    };

    ws.onclose = () => {
      window.clearTimeout(connectTimeout);
      setIsConnected(false);
      if (!opened && !gridState) {
        setError((current) => current ?? `Unable to reach the simulation WebSocket at ${wsUrl('/ws')}`);
      }
    };
    ws.onerror = () => {
      window.clearTimeout(connectTimeout);
      setError(`WebSocket connection error at ${wsUrl('/ws')}`);
      setIsConnected(false);
    };
  }, [gridState]);

  const startSimulation = useCallback((speed = 0.5) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setIsRunning(true);
      wsRef.current.send(JSON.stringify({ command: 'start', speed }));
    }
  }, []);

  const pauseSimulation = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ command: 'pause' }));
  }, []);

  const stepSimulation = useCallback((steps = 1) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command: 'step', steps }));
    }
  }, []);

  const resetSimulation = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ command: 'reset' }));
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
    setIsRunning(false);
  }, []);

  useEffect(() => () => disconnect(), [disconnect]);

  return {
    simulationId,
    gridState,
    history,
    isRunning,
    isConnected,
    error,
    createSimulation,
    connectWebSocket,
    startSimulation,
    pauseSimulation,
    stepSimulation,
    resetSimulation,
    disconnect,
  };
};
