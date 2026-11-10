import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Pause, Play, RotateCcw, StepForward } from 'lucide-react';
import { useSimulation } from '../../hooks/useSimulation';
import { MODEL_CONFIGS, modelTokens, transformParams } from '../../models/configs';
import { useTokens } from '../../app/theme';
import { Link } from '../../app/router';
import SimulationCanvas from '../SimulationCanvas';
import PopulationChart from '../PopulationChart';
import ModelPreview from '../ModelPreview';
import { ParamField } from '../SimulationControls';
import { Badge, Callout } from '../ui';
import { Inline } from './Rich';

const SPEED = 0.1;

/**
 * A simulation embedded in a lesson. Nothing is created on the server until the reader
 * starts it, and the simulation is removed when the section unmounts.
 */
const LessonSim: React.FC<{
  model: string;
  params?: Record<string, number>;
  controls?: string[];
  seed?: number;
  prompt?: string;
}> = ({ model, params: preset, controls = [], seed, prompt }) => {
  const config = MODEL_CONFIGS[model];
  const sim = useSimulation();
  const { launch, start, pause, step, reset, updateLiveParams } = sim;
  const initial = useMemo(() => ({ ...config.defaultParams, ...preset }), [config, preset]);
  const [values, setValues] = useState(initial);
  const [applied, setApplied] = useState(initial);
  const [launched, setLaunched] = useState(false);
  const colors = useTokens(useMemo(() => modelTokens(config), [config]));
  const liveTimer = useRef<number>();
  useEffect(() => () => window.clearTimeout(liveTimer.current), []);

  const fields = config.parameterConfig.filter((pc) => controls.includes(pc.key));
  const dirty = fields.some((pc) => !pc.live && values[pc.key] !== applied[pc.key]);

  const create = useCallback(
    (next: Record<string, number>) => {
      const backend = transformParams(config.id, next);
      if (seed !== undefined) backend.seed = seed;
      setApplied(next);
      setLaunched(true);
      void launch(config.id, backend);
    },
    [config.id, launch, seed],
  );

  const onField = (key: string, value: number, live?: boolean) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (live && sim.isConnected) {
      window.clearTimeout(liveTimer.current);
      liveTimer.current = window.setTimeout(() => {
        updateLiveParams(transformParams(config.id, { [key]: value }));
        setApplied((prev) => ({ ...prev, [key]: value }));
      }, 150);
    }
  };

  const counts = sim.gridState?.counts ?? {};

  return (
    <section className="lesson-sim" aria-label={`Live simulation: ${config.name}`}>
      <div className="lesson-sim-head">
        <div className="flex min-w-0 items-center gap-2">
          <config.icon size={16} className="text-primary" aria-hidden />
          <span className="font-semibold">Live simulation · {config.name}</span>
          {seed !== undefined && <Badge tone="primary">Seed {seed}</Badge>}
        </div>
        <Link to={`/models/${config.id}`} className="btn btn-ghost btn-sm">
          Open in workspace <ExternalLink size={14} aria-hidden />
        </Link>
      </div>
      {prompt && (
        <p className="lesson-sim-prompt">
          <strong>Try this:</strong> <Inline text={prompt} />
        </p>
      )}

      {!launched ? (
        <div className="lesson-sim-idle">
          <div className="lesson-sim-preview" aria-hidden>
            <ModelPreview config={config} />
          </div>
          <button type="button" className="btn btn-primary" onClick={() => create(values)}>
            <Play size={16} /> Start the simulation
          </button>
        </div>
      ) : (
        <>
          <div className="lesson-sim-toolbar">
            {sim.isRunning ? (
              <button type="button" className="btn btn-accent btn-sm" onClick={pause}>
                <Pause size={14} /> Pause
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => start(SPEED)}
                disabled={sim.status !== 'ready'}
              >
                <Play size={14} /> Run
              </button>
            )}
            <button type="button" className="btn btn-sm" onClick={() => step(1)} disabled={sim.status !== 'ready'}>
              <StepForward size={14} /> Step
            </button>
            <button type="button" className="btn btn-sm" onClick={reset} disabled={!sim.isConnected} title="Reset to step 0">
              <RotateCcw size={14} /> Reset
            </button>
            <span className="tabular ml-auto text-[13px] text-subtle">Step {(sim.gridState?.step ?? 0).toLocaleString()}</span>
          </div>

          {sim.error && (
            <Callout tone="error" title="Simulation unavailable">
              <p>{sim.error}</p>
              <button type="button" className="btn btn-sm mt-1" onClick={() => create(values)}>
                Try again
              </button>
            </Callout>
          )}
          {sim.notice && (
            <Callout tone={sim.notice.tone} onDismiss={sim.clearNotice}>
              <p>{sim.notice.message}</p>
            </Callout>
          )}

          <div className="lesson-sim-body">
            <div className="min-w-0">
              {sim.gridState ? (
                <SimulationCanvas gridState={sim.gridState} config={config} maxSize={380} />
              ) : (
                <div className="sim-canvas-frame items-center">
                  <div className="spinner" aria-label="Creating simulation" />
                </div>
              )}
              <div className="legend mt-2">
                {config.countDisplay.map((cd) => (
                  <span key={cd.key} className="legend-item tabular">
                    {cd.token && <span className="swatch" style={{ background: colors[cd.token] }} aria-hidden />}
                    {cd.label}:{' '}
                    <strong>
                      {typeof counts[cd.key] === 'number'
                        ? cd.format === 'percent'
                          ? `${counts[cd.key].toFixed(1)}%`
                          : Number.isInteger(counts[cd.key])
                            ? counts[cd.key].toLocaleString()
                            : counts[cd.key].toFixed(2)
                        : '—'}
                    </strong>
                  </span>
                ))}
              </div>
            </div>
            <div className="min-w-0">
              <PopulationChart data={sim.history} metrics={config.metrics} />
            </div>
          </div>
        </>
      )}

      {fields.length > 0 && (
        <div className="lesson-sim-controls">
          {fields.map((pc) => (
            <ParamField
              key={pc.key}
              pc={pc}
              value={values[pc.key] ?? pc.default}
              modified={values[pc.key] !== applied[pc.key]}
              onChange={(value) => onField(pc.key, value, pc.live)}
            />
          ))}
          {launched && (
            <button type="button" className={dirty ? 'btn btn-primary btn-sm' : 'btn btn-sm'} onClick={() => create(values)}>
              <RotateCcw size={14} /> {dirty ? 'Restart with changes' : 'Restart'}
            </button>
          )}
        </div>
      )}
    </section>
  );
};

export default LessonSim;
