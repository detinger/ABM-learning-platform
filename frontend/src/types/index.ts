export interface Agent {
  id: number;
  type: string;
  x: number;
  y: number;
  properties?: Record<string, unknown>;
}

export interface GridState {
  step: number;
  model_type: string;
  agents: Agent[];
  counts: Record<string, number>;
  width: number;
  height: number;
}

export interface HistoryPoint {
  step: number;
  [key: string]: number;
}

export interface CreateRequest {
  model_type: string;
  params: Record<string, number>;
}
