import React, { useEffect, useId, useRef } from 'react';
import { Pause, Play, RefreshCw, RotateCcw, Shuffle, StepForward } from 'lucide-react';
import type { ModelConfig, ParamConfig } from '../models/configs';
import type { SimulationStatus } from '../hooks/useSimulation';
import { Badge, Card } from './ui';

// ─────────────────────────── Run controls ───────────────────────────

const STATUS_BADGE: Record<SimulationStatus, { tone: React.ComponentProps<typeof Badge>['tone']; label: string }> = {
  idle: { tone: 'info', label: 'Idle' },
  connecting: { tone: 'info', label: 'Connecting' },
  ready: { tone: 'primary', label: 'Ready' },
  running: { tone: 'accent', label: 'Running' },
  ended: { tone: 'success', label: 'Finished' },
  disconnected: { tone: 'warning', label: 'Disconnected' },
  error: { tone: 'error', label: 'Error' },
};

export const RunControls: React.FC<{
  status: SimulationStatus;
  step: number;
  speed: number;
  onSpeedChange: (speed: number) => void;
  onStart: () => void;
  onPause: () => void;
  onStep: (steps: number) => void;
  onReset: () => void;
}> = ({ status, step, speed, onSpeedChange, onStart, onPause, onStep, onReset }) => {
  const speedId = useId();
  const running = status === 'running';
  const connected = status === 'ready' || status === 'running' || status === 'ended';
  const finished = status === 'ended';
  const badge = STATUS_BADGE[status];

  return (
    <Card
      title="Run"
      subtitle={
        <span className="tabular">
          Step {step.toLocaleString()}
        </span>
      }
      actions={<Badge tone={badge.tone} dot>{badge.label}</Badge>}
    >
      <div className="flex flex-wrap gap-2">
        {running ? (
          <button type="button" className="btn btn-accent flex-1" onClick={onPause} aria-keyshortcuts="Space">
            <Pause size={16} /> Pause
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary flex-1"
            onClick={onStart}
            disabled={!connected || finished}
            aria-keyshortcuts="Space"
          >
            <Play size={16} /> Run simulation
          </button>
        )}
        <button
          type="button"
          className="btn"
          onClick={() => onStep(1)}
          disabled={!connected || running || finished}
          aria-keyshortcuts="S"
        >
          <StepForward size={16} /> Step
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => onStep(10)}
          disabled={!connected || running || finished}
          title="Advance 10 steps"
        >
          +10
        </button>
        <button type="button" className="btn btn-icon" onClick={onReset} disabled={!connected} aria-label="Reset to step 0" title="Reset to step 0 (R)" aria-keyshortcuts="R">
          <RotateCcw size={16} />
        </button>
      </div>

      <div className="field mt-4">
        <label className="field-label" htmlFor={speedId}>
          Delay between steps
          <span className="field-value">{speed.toFixed(2)} s</span>
        </label>
        <input
          id={speedId}
          className="range"
          type="range"
          min={0.02}
          max={1.5}
          step={0.02}
          value={speed}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
        />
        <div className="range-scale" aria-hidden>
          <span>Faster</span>
          <span>Slower</span>
        </div>
      </div>

      <p className="hint mb-0 mt-3">
        Shortcuts: <kbd>Space</kbd> run or pause, <kbd>S</kbd> step, <kbd>R</kbd> reset.
      </p>
    </Card>
  );
};

// ─────────────────────────── Parameters ───────────────────────────

export const ParamField: React.FC<{
  pc: ParamConfig;
  value: number;
  modified: boolean;
  onChange: (value: number) => void;
}> = ({ pc, value, modified, onChange }) => {
  const id = useId();
  const hintId = useId();
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        <span className="flex items-center gap-1.5">
          {pc.label}
          {pc.live && <Badge tone="primary">Live</Badge>}
          {modified && !pc.live && <Badge tone="warning">Changed</Badge>}
        </span>
        <span className="field-value">
          {value}
          {pc.unit && <span className="text-subtle"> {pc.unit}</span>}
        </span>
      </label>
      <input
        id={id}
        className="range"
        type="range"
        min={pc.min}
        max={pc.max}
        step={pc.step}
        value={value}
        aria-describedby={pc.hint ? hintId : undefined}
        onChange={(e) => onChange(pc.type === 'float' ? parseFloat(e.target.value) : parseInt(e.target.value, 10))}
      />
      <div className="range-scale" aria-hidden>
        <span>{pc.min}</span>
        <span>{pc.max}</span>
      </div>
      {pc.hint && (
        <span id={hintId} className="hint">
          {pc.hint}
        </span>
      )}
    </div>
  );
};

export const ParametersCard: React.FC<{
  config: ModelConfig;
  params: Record<string, number>;
  applied: Record<string, number>;
  seed: string;
  onSeedChange: (seed: string) => void;
  onChange: (params: Record<string, number>) => void;
  onLiveChange: (key: string, value: number) => void;
  onCreate: () => void;
  onRestoreDefaults: () => void;
  busy: boolean;
  subtitle?: string;
}> = ({ config, params, applied, seed, onSeedChange, onChange, onLiveChange, onCreate, onRestoreDefaults, busy, subtitle }) => {
  const seedId = useId();
  const pendingLive = useRef<Record<string, number>>({});
  const timer = useRef<number>();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const dirty = config.parameterConfig.some((pc) => !pc.live && params[pc.key] !== applied[pc.key]);

  const handleChange = (pc: ParamConfig, value: number) => {
    onChange({ ...params, [pc.key]: value });
    if (pc.live) {
      // Debounce so dragging a slider sends one update, not dozens.
      pendingLive.current[pc.key] = value;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        for (const [key, v] of Object.entries(pendingLive.current)) onLiveChange(key, v);
        pendingLive.current = {};
      }, 150);
    }
  };

  return (
    <Card
      title="Parameters"
      subtitle={subtitle ?? 'Live parameters apply immediately. The others take effect when you create a new simulation.'}
      actions={
        <button type="button" className="btn btn-ghost btn-sm" onClick={onRestoreDefaults} title="Restore default values">
          <RefreshCw size={14} /> Defaults
        </button>
      }
    >
      {config.parameterConfig.map((pc) => (
        <ParamField
          key={pc.key}
          pc={pc}
          value={params[pc.key] ?? pc.default}
          modified={params[pc.key] !== applied[pc.key]}
          onChange={(value) => handleChange(pc, value)}
        />
      ))}

      <div className="field">
        <label className="field-label" htmlFor={seedId}>
          Random seed
        </label>
        <div className="flex gap-2">
          <input
            id={seedId}
            className="input min-w-0 flex-1 tabular"
            inputMode="numeric"
            placeholder="Random each run"
            value={seed}
            onChange={(e) => onSeedChange(e.target.value.replace(/[^0-9]/g, '').slice(0, 9))}
          />
          <button
            type="button"
            className="btn btn-icon"
            aria-label="Pick a random seed"
            title="Pick a random seed"
            onClick={() => onSeedChange(String(Math.floor(Math.random() * 1_000_000)))}
          >
            <Shuffle size={16} />
          </button>
        </div>
        <span className="hint">Use the same seed and parameters to reproduce a run exactly.</span>
      </div>

      <button type="button" className={dirty ? 'btn btn-primary mt-4 w-full' : 'btn mt-4 w-full'} onClick={onCreate} disabled={busy}>
        <Play size={16} /> {dirty ? 'Create simulation with changes' : 'Create new simulation'}
      </button>
    </Card>
  );
};
