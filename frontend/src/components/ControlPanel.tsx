import React, { useState } from 'react';
import {
  Play, Pause, StepForward, RotateCcw, Zap,
  Settings, Activity, AlertCircle, ChevronDown, ChevronUp,
} from 'lucide-react';
import { ModelConfig, ParamConfig } from '../models/configs';
import { cn } from '../lib/utils';

interface Props {
  config: ModelConfig;
  params: Record<string, number>;
  setParams: (p: Record<string, number>) => void;
  isRunning: boolean;
  isConnected: boolean;
  currentStep: number;
  counts: Record<string, number>;
  onStart: (speed: number) => void;
  onPause: () => void;
  onStep: () => void;
  onReset: () => void;
  onCreateNew: (params: Record<string, number>) => void;
  error: string | null;
}

const ParamInput: React.FC<{
  pc: ParamConfig;
  value: number;
  onChange: (v: number) => void;
}> = ({ pc, value, onChange }) => (
  <div>
    <div className="flex justify-between mb-1">
      <label className="text-xs text-slate-400">{pc.label}</label>
      <span className="text-xs text-slate-300 font-mono">{value}</span>
    </div>
    <input
      type="range"
      min={pc.min}
      max={pc.max}
      step={pc.step}
      value={value}
      onChange={(e) => onChange(pc.type === 'float' ? parseFloat(e.target.value) : parseInt(e.target.value))}
      className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-blue-500"
    />
    <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
      <span>{pc.min}</span>
      <span>{pc.max}</span>
    </div>
  </div>
);

const ControlPanel: React.FC<Props> = ({
  config, params, setParams,
  isRunning, isConnected, currentStep,
  counts, onStart, onPause, onStep, onReset, onCreateNew, error,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [speed, setSpeed] = useState(0.3);

  return (
    <div className="space-y-4">
      {/* Error */}
      {error && (
        <div className="bg-red-950/50 border border-red-700/40 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {/* Status */}
      <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-2.5 h-2.5 rounded-full',
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            )} />
            <span className="text-xs font-medium text-slate-300">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Activity className="w-3.5 h-3.5" />
            Step {currentStep}
          </div>
        </div>

        {/* Counts */}
        <div className={cn('grid gap-2', config.countDisplay.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
          {config.countDisplay.map((cd) => {
            const val = counts[cd.key];
            const display = typeof val === 'number'
              ? (Number.isInteger(val) ? val.toLocaleString() : val.toFixed(2))
              : '—';
            return (
              <div key={cd.key} className={cn('rounded-lg p-2 text-center', cd.colorClass)}>
                <div className="text-lg font-bold text-white leading-tight">{display}</div>
                <div className="text-[10px] text-slate-400">{cd.emoji} {cd.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Control buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => (isRunning ? onPause() : onStart(speed))}
          disabled={!isConnected}
          className={cn(
            'flex-1 min-w-[90px] flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
            isRunning
              ? 'bg-amber-600 hover:bg-amber-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white',
            !isConnected && 'opacity-40 cursor-not-allowed'
          )}
        >
          {isRunning ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Start</>}
        </button>

        <button
          onClick={() => onStep()}
          disabled={!isConnected || isRunning}
          className="flex-1 min-w-[90px] flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <StepForward className="w-4 h-4" /> Step
        </button>

        <button
          onClick={() => onReset()}
          disabled={!isConnected}
          className="flex-1 min-w-[90px] flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RotateCcw className="w-4 h-4" /> Reset
        </button>
      </div>

      {/* Speed */}
      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-3.5 h-3.5 text-yellow-500" />
          <span className="text-xs font-medium text-slate-300">Speed</span>
          <span className="ml-auto text-xs text-slate-500">{speed}s/step</span>
        </div>
        <input
          type="range"
          min="0.05" max="2" step="0.05"
          value={speed}
          onChange={(e) => setSpeed(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-blue-500"
        />
        <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
          <span>Fast</span>
          <span>Slow</span>
        </div>
      </div>

      {/* Settings toggle */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-all"
      >
        <span className="flex items-center gap-2">
          <Settings className="w-4 h-4" />
          New Simulation
        </span>
        {showSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {showSettings && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 space-y-4">
          <p className="text-xs text-slate-500">Adjust parameters, then click Create to start a fresh simulation.</p>

          {config.parameterConfig.map((pc) => (
            <ParamInput
              key={pc.key}
              pc={pc}
              value={params[pc.key] ?? pc.default}
              onChange={(v) => setParams({ ...params, [pc.key]: v })}
            />
          ))}

          <button
            onClick={() => { onCreateNew(params); setShowSettings(false); }}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all"
          >
            Create New Simulation
          </button>
        </div>
      )}
    </div>
  );
};

export default ControlPanel;
