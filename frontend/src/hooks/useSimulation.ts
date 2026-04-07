import { useState, useCallback, useRef, useEffect } from 'react';
import { GridState, HistoryPoint, CreateRequest } from '../types';

const API_URL = 'http://localhost:8000';

export const useSimulation = () => {
  const [simulationId, setSimulationId] = useState<string | null>(null);
  const [gridState, setGridState] = useState<GridState | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  const createSimulation = useCallback(async (req: CreateRequest) => {
    try {
      const res = await fetch(`${API_URL}/api/simulation/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSimulationId(data.simulation_id);
      setError(null);
      return data.simulation_id as string;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      throw err;
    }
  }, []);

  const connectWebSocket = useCallback((id: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }

    const ws = new WebSocket(`ws://localhost:8000/ws/simulation/${id}`);
    wsRef.current = ws;

    ws.onopen = () => {
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

    ws.onclose = () => setIsConnected(false);
    ws.onerror = () => {
      setError('WebSocket connection error');
      setIsConnected(false);
    };
  }, []);

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
