import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Code, Download, Grid3x3, LineChart, Table2 } from 'lucide-react';
import { useSimulation } from '../hooks/useSimulation';
import SimulationCanvas from '../components/SimulationCanvas';
import PopulationChart from '../components/PopulationChart';
import HistoryTable from '../components/HistoryTable';
import { downloadText, historyToCsv } from '../lib/export';
import CodeModal from '../components/CodeModal';
import { ParametersCard, RunControls } from '../components/SimulationControls';
import { Callout, Card, EmptyState, TabPanel, Tabs } from '../components/ui';
import { modelTokens, transformParams, type CountDisplay, type ModelConfig } from '../models/configs';
import { generateCode } from '../models/codeGenerators';
import { useTokens } from '../app/theme';

function formatCount(value: number | undefined, format: CountDisplay['format']) {
  if (typeof value !== 'number') return '—';
  if (format === 'percent') return `${value.toFixed(1)}%`;
  if (format === 'decimal') return value.toLocaleString(undefined, { maximumFractionDigits: 3 });
  return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2);
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) && (target as HTMLInputElement).type !== 'range');

const SimulationPage: React.FC<{ config: ModelConfig }> = ({ config }) => {
  const sim = useSimulation();
  const { launch, start, pause, step, reset, setSpeed: sendSpeed, updateLiveParams } = sim;
  const [params, setParams] = useState<Record<string, number>>(config.defaultParams);
  const [applied, setApplied] = useState<Record<string, number>>(config.defaultParams);
  const [seed, setSeed] = useState('');
  const [speed, setSpeed] = useState(0.3);
  const [showCode, setShowCode] = useState(false);
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const colors = useTokens(useMemo(() => modelTokens(config), [config]));

  const create = useCallback(
    (values: Record<string, number>, seedText: string) => {
      const backend: Record<string, number> = transformParams(config.id, values);
      if (seedText) backend.seed = Number(seedText);
      setApplied(values);
      void launch(config.id, backend);
    },
    [config.id, launch],
  );

  // A fresh simulation whenever the model changes (navigating between models).
  useEffect(() => {
    setParams(config.defaultParams);
    setSeed('');
    create(config.defaultParams, '');
  }, [config, create]);

  useEffect(() => {
    document.title = `${config.name} · ABM Learning Platform`;
  }, [config.name]);

  const handleStart = useCallback(() => start(speed), [start, speed]);
  const handleSpeed = (value: number) => {
    setSpeed(value);
    if (sim.isRunning) sendSpeed(value);
  };

  // Keyboard shortcuts: Space run/pause, S step, R reset.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target) || showCode) return;
      if (event.target instanceof HTMLButtonElement && event.key === ' ') return; // let buttons handle Space
      if (event.key === ' ') {
        event.preventDefault();
        if (sim.isRunning) pause();
        else if (sim.status === 'ready') handleStart();
      } else if (event.key.toLowerCase() === 's' && sim.status === 'ready') {
        step(1);
      } else if (event.key.toLowerCase() === 'r' && sim.isConnected) {
        reset();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sim.isRunning, sim.isConnected, sim.status, pause, handleStart, step, reset, showCode]);

  const code = useMemo(() => generateCode(config.id, transformParams(config.id, params)), [config.id, params]);
  const Icon = config.icon;
  const counts = sim.gridState?.counts ?? {};

  return (
    <div className="page">
      <header className="page-header">
        <div className="min-w-0">
          <div className="eyebrow">Model</div>
          <h1 className="flex items-center gap-2">
            <Icon size={24} className="text-primary" aria-hidden />
            {config.name}
          </h1>
          <p className="page-description">{config.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn"
            disabled={sim.history.length === 0}
            onClick={() => downloadText(`${config.id}-history.csv`, historyToCsv(sim.history, config.metrics))}
          >
            <Download size={16} /> Export CSV
          </button>
          <button type="button" className="btn" onClick={() => setShowCode(true)}>
            <Code size={16} /> Python code
          </button>
        </div>
      </header>

      <div className="config-results">
        <div className="stack">
          <RunControls
            status={sim.status}
            step={sim.gridState?.step ?? 0}
            speed={speed}
            onSpeedChange={handleSpeed}
            onStart={handleStart}
            onPause={pause}
            onStep={step}
            onReset={reset}
          />
          <ParametersCard
            config={config}
            params={params}
            applied={applied}
            seed={seed}
            onSeedChange={setSeed}
            onChange={setParams}
            onLiveChange={(key, value) => updateLiveParams(transformParams(config.id, { [key]: value }))}
            onCreate={() => create(params, seed)}
            onRestoreDefaults={() => setParams(config.defaultParams)}
            busy={sim.status === 'connecting'}
          />
          <Card title="How it works">
            <ul className="prose m-0 flex list-disc flex-col gap-1.5 pl-5 text-[13px] text-muted">
              {config.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
            <h3 className="mb-2 mt-4 text-[13px]">Key concepts</h3>
            <div className="chips">
              {config.concepts.map((c) => (
                <span key={c} className="chip">
                  {c}
                </span>
              ))}
            </div>
          </Card>
        </div>

        <div className="stack">
          {sim.error && (
            <Callout tone="error" title="Something went wrong" onDismiss={sim.status === 'error' ? undefined : sim.clearError}>
              <p>{sim.error}</p>
              {(sim.status === 'error' || sim.status === 'disconnected') && (
                <button type="button" className="btn btn-sm mt-1" onClick={() => create(params, seed)}>
                  Try again
                </button>
              )}
            </Callout>
          )}
          {sim.notice && (
            <Callout tone={sim.notice.tone} onDismiss={sim.clearNotice}>
              <p>{sim.notice.message}</p>
            </Callout>
          )}

          <div className="kpi-grid" aria-live="polite">
            {config.countDisplay.map((cd) => (
              <div key={cd.key} className="kpi">
                <div className="kpi-label">
                  {cd.token && <span className="swatch" style={{ background: colors[cd.token] }} aria-hidden />}
                  {cd.label}
                </div>
                <div className="kpi-value">{formatCount(counts[cd.key], cd.format)}</div>
                {cd.detail && <div className="kpi-detail">{cd.detail}</div>}
              </div>
            ))}
          </div>

          <Card
            title="Grid"
            subtitle={sim.gridState ? `Step ${sim.gridState.step.toLocaleString()}` : 'Waiting for the first state'}
          >
            <div className="legend mb-3">
              {config.legend.map((entry) => (
                <span key={entry.label} className="legend-item">
                  <span className="swatch" style={{ background: colors[entry.token] }} aria-hidden />
                  {entry.label}
                </span>
              ))}
            </div>
            {sim.gridState ? (
              <SimulationCanvas gridState={sim.gridState} config={config} />
            ) : sim.status === 'connecting' ? (
              <div className="sim-canvas-frame items-center">
                <div className="empty-state">
                  <div className="spinner" aria-hidden />
                  <h3>Creating simulation…</h3>
                </div>
              </div>
            ) : (
              <EmptyState icon={<Grid3x3 size={22} />} title="No simulation">
                <p>Create a new simulation to see the grid.</p>
              </EmptyState>
            )}
          </Card>

          <Card title="Time series" subtitle="Metric values per step">
            <Tabs
              idPrefix="series"
              label="Time series view"
              dense
              value={view}
              onChange={setView}
              items={[
                { id: 'chart', label: 'Chart', icon: <LineChart size={14} /> },
                { id: 'table', label: 'Table', icon: <Table2 size={14} /> },
              ]}
            />
            <TabPanel idPrefix="series" id={view} className="pt-4">
              {view === 'chart' ? (
                <PopulationChart data={sim.history} metrics={config.metrics} />
              ) : (
                <HistoryTable data={sim.history} metrics={config.metrics} />
              )}
            </TabPanel>
          </Card>
        </div>
      </div>

      {showCode && <CodeModal modelName={config.name} modelId={config.id} code={code} onClose={() => setShowCode(false)} />}
    </div>
  );
};

export default SimulationPage;
