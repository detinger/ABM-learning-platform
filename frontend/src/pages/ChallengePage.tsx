import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Circle, Lightbulb, Lock, RotateCcw, Target, Trophy, XCircle } from 'lucide-react';
import { Link } from '../app/router';
import { useTokens } from '../app/theme';
import { useSimulation } from '../hooks/useSimulation';
import SimulationCanvas from '../components/SimulationCanvas';
import PopulationChart from '../components/PopulationChart';
import { ParametersCard, RunControls } from '../components/SimulationControls';
import { Badge, Callout, Card, cn } from '../components/ui';
import { Inline } from '../components/learn/Rich';
import { MODEL_CONFIGS, modelTokens, transformParams, type ModelConfig } from '../models/configs';
import { CHALLENGES } from '../learn/challenges';
import { LESSON_BY_ID } from '../learn/lessons';
import { recordAttempt, useProgress } from '../learn/progress';
import type { Challenge, GoalStatus } from '../learn/types';
import { LEVEL_TONE } from './LearnPage';

const GOAL_ICON: Record<GoalStatus, React.ReactNode> = {
  met: <CheckCircle2 size={18} aria-hidden />,
  failed: <XCircle size={18} aria-hidden />,
  pending: <Circle size={18} aria-hidden />,
};
const GOAL_LABEL: Record<GoalStatus, string> = { met: 'Met', failed: 'Failed', pending: 'In progress' };

/** The model config restricted to the challenge's editable parameters and bounds. */
function challengeConfig(base: ModelConfig, challenge: Challenge): ModelConfig {
  const defaults = { ...base.defaultParams, ...challenge.start };
  return {
    ...base,
    defaultParams: defaults,
    parameterConfig: base.parameterConfig
      .filter((pc) => pc.key in challenge.editable)
      .map((pc) => {
        const bounds = challenge.editable[pc.key];
        // Live changes are disabled so every attempt is judged on the parameters it started with.
        return { ...pc, live: false, min: bounds.min ?? pc.min, max: bounds.max ?? pc.max, default: defaults[pc.key] };
      }),
  };
}

const ChallengePage: React.FC<{ challenge: Challenge }> = ({ challenge }) => {
  const base = MODEL_CONFIGS[challenge.model];
  const config = useMemo(() => challengeConfig(base, challenge), [base, challenge]);
  const locked = base.parameterConfig.filter((pc) => !(pc.key in challenge.editable));
  const sim = useSimulation();
  const { launch, start, pause, step, reset, setSpeed: sendSpeed, isRunning } = sim;
  const [params, setParams] = useState(config.defaultParams);
  const [applied, setApplied] = useState(config.defaultParams);
  const [seed, setSeed] = useState('');
  const [speed, setSpeed] = useState(0.05);
  const [hints, setHints] = useState(0);
  const [fresh, setFresh] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const judged = useRef(0);
  const progress = useProgress().challenges[challenge.id];
  const colors = useTokens(useMemo(() => modelTokens(base), [base]));

  const create = useCallback(
    (values: Record<string, number>, seedText: string) => {
      const backend = transformParams(challenge.model, values);
      if (seedText) backend.seed = Number(seedText);
      setApplied(values);
      setFresh(false);
      void launch(challenge.model, backend);
    },
    [challenge.model, launch],
  );

  useEffect(() => {
    create(config.defaultParams, '');
  }, [config, create]);

  useEffect(() => {
    document.title = `${challenge.title} · Challenges · ABM Learning Platform`;
  }, [challenge.title]);

  // A new attempt begins when a step-0 state arrives after creating or resetting.
  useEffect(() => {
    if (!fresh && sim.gridState?.step === 0) {
      setFresh(true);
      setAttempt((a) => a + 1);
    }
  }, [sim.gridState, fresh]);

  const currentStep = sim.gridState?.step ?? 0;
  const history = useMemo(() => sim.history.filter((row) => row.step <= challenge.horizon), [sim.history, challenge.horizon]);
  const final = sim.status === 'ended' || currentStep >= challenge.horizon;
  const liveResults = challenge.goals.map((goal) => ({
    goal,
    ...goal.evaluate({
      history,
      state: sim.gridState,
      params: applied,
      step: Math.min(currentStep, challenge.horizon),
      final,
    }),
  }));
  const liveVerdict: 'passed' | 'failed' | null =
    !fresh || !sim.gridState
      ? null
      : liveResults.some((r) => r.status === 'failed') ? 'failed'
      : liveResults.every((r) => r.status === 'met') ? 'passed'
      : null;

  // Freeze the outcome once judged, so states that arrive after pausing can't change it.
  const [frozen, setFrozen] = useState<{ attempt: number; verdict: 'passed' | 'failed'; results: typeof liveResults } | null>(null);
  const isFrozen = frozen !== null && frozen.attempt === attempt && fresh;
  const verdict = isFrozen ? frozen.verdict : liveVerdict;
  const results = isFrozen ? frozen.results : liveResults;

  useEffect(() => {
    if (!liveVerdict || judged.current === attempt) return;
    judged.current = attempt;
    setFrozen({ attempt, verdict: liveVerdict, results: liveResults });
    recordAttempt(challenge.id, liveVerdict === 'passed');
    if (isRunning) pause();
  }, [liveVerdict, liveResults, attempt, challenge.id, pause, isRunning]);

  const handleReset = () => {
    setFresh(false);
    reset();
  };
  const handleSpeed = (value: number) => {
    setSpeed(value);
    if (sim.isRunning) sendSpeed(value);
  };

  const lesson = challenge.lesson ? LESSON_BY_ID[challenge.lesson] : undefined;
  const index = CHALLENGES.findIndex((c) => c.id === challenge.id);
  const next = CHALLENGES[index + 1];

  return (
    <div className="page">
      <header className="page-header">
        <div className="min-w-0">
          <Link to="/challenges" className="btn btn-ghost btn-sm mb-2 -ml-2">
            <ArrowLeft size={14} aria-hidden /> All challenges
          </Link>
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <Badge tone={LEVEL_TONE[challenge.level]}>{challenge.level}</Badge>
            <span className="flex items-center gap-1 text-[12px] text-subtle">
              <base.icon size={12} aria-hidden /> {base.name}
            </span>
            {progress?.passed && (
              <Badge tone="success">
                <CheckCircle2 size={12} aria-hidden /> Passed before
              </Badge>
            )}
          </div>
          <h1 className="flex items-center gap-2">
            <Target size={24} className="text-accent" aria-hidden /> {challenge.title}
          </h1>
          <p className="page-description">{challenge.brief}</p>
        </div>
        {lesson && (
          <Link to={`/learn/${lesson.id}`} className="btn">
            <BookOpen size={16} aria-hidden /> Lesson: {lesson.title}
          </Link>
        )}
      </header>

      <div className="config-results">
        <div className="stack">
          <RunControls
            status={verdict ? 'ended' : sim.status}
            step={currentStep}
            speed={speed}
            onSpeedChange={handleSpeed}
            onStart={() => start(speed)}
            onPause={pause}
            onStep={step}
            onReset={handleReset}
          />
          <ParametersCard
            config={config}
            params={params}
            applied={applied}
            seed={seed}
            onSeedChange={setSeed}
            onChange={setParams}
            onLiveChange={() => undefined}
            onCreate={() => create(params, seed)}
            onRestoreDefaults={() => setParams(config.defaultParams)}
            busy={sim.status === 'connecting'}
            subtitle="Only these parameters are yours to change. Changes take effect when you start a new attempt."
          />
          {locked.length > 0 && (
            <Card title="Locked" subtitle="Fixed for this challenge" compact>
              <ul className="locked-list">
                {locked.map((pc) => (
                  <li key={pc.key}>
                    <Lock size={12} aria-hidden />
                    <span className="flex-1">{pc.label}</span>
                    <span className="tabular text-muted">
                      {config.defaultParams[pc.key]}
                      {pc.unit && ` ${pc.unit}`}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="stack">
          {sim.error && (
            <Callout tone="error" title="Something went wrong">
              <p>{sim.error}</p>
              <button type="button" className="btn btn-sm mt-1" onClick={() => create(params, seed)}>
                Try again
              </button>
            </Callout>
          )}

          {verdict === 'passed' && (
            <section className="verdict verdict-pass" aria-live="polite">
              <div className="verdict-badge" aria-hidden>
                <Trophy size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <h2>Challenge passed</h2>
                <p>
                  <strong>Why it works:</strong> <Inline text={challenge.insight} />
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {next && (
                    <Link to={`/challenges/${next.id}`} className="btn btn-primary">
                      Next challenge: {next.title} <ArrowRight size={16} aria-hidden />
                    </Link>
                  )}
                  <button type="button" className="btn" onClick={handleReset}>
                    <RotateCcw size={16} aria-hidden /> Run it again
                  </button>
                </div>
              </div>
            </section>
          )}
          {verdict === 'failed' && (
            <section className="verdict verdict-fail" aria-live="polite">
              <div className="verdict-badge" aria-hidden>
                <XCircle size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <h2>Not this time</h2>
                <p>Adjust the parameters and start a new attempt. Hints are below the goals if you need one.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="btn btn-primary" onClick={() => create(params, seed)}>
                    <RotateCcw size={16} aria-hidden /> New attempt
                  </button>
                </div>
              </div>
            </section>
          )}

          <Card
            title="Goals"
            subtitle={`Checked live. Judged at step ${challenge.horizon >= 1000 ? 'the end of the run' : challenge.horizon} or when the run ends.`}
            actions={
              progress?.attempts ? (
                <span className="text-[12px] text-subtle">
                  {progress.attempts} attempt{progress.attempts === 1 ? '' : 's'}
                </span>
              ) : undefined
            }
          >
            <ul className="goals">
              {results.map(({ goal, status, value }) => {
                const shown: GoalStatus = sim.gridState && fresh ? status : 'pending';
                return (
                  <li key={goal.id} className="goal" data-status={shown}>
                    <span className="goal-icon">{GOAL_ICON[shown]}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{goal.label}</span>
                      <span className="tabular block text-[12px] text-muted">
                        {sim.gridState ? value : 'waiting for the simulation'}
                      </span>
                    </span>
                    <span className="visually-hidden">{GOAL_LABEL[shown]}</span>
                  </li>
                );
              })}
            </ul>
            <div className="hints">
              {challenge.hints.slice(0, hints).map((hint, i) => (
                <p key={hint} className="hint-item">
                  <Lightbulb size={14} aria-hidden /> <span><strong>Hint {i + 1}:</strong> <Inline text={hint} /></span>
                </p>
              ))}
              {hints < challenge.hints.length && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setHints((h) => h + 1)}>
                  <Lightbulb size={14} aria-hidden /> Show a hint ({hints + 1} of {challenge.hints.length})
                </button>
              )}
            </div>
          </Card>

          <Card title="Grid" subtitle={sim.gridState ? `Step ${currentStep.toLocaleString()}` : 'Waiting for the first state'}>
            <div className="legend mb-3">
              {base.legend.map((entry) => (
                <span key={entry.label} className="legend-item">
                  <span className="swatch" style={{ background: colors[entry.token] }} aria-hidden />
                  {entry.label}
                </span>
              ))}
            </div>
            {sim.gridState ? (
              <SimulationCanvas gridState={sim.gridState} config={base} maxSize={520} />
            ) : (
              <div className={cn('sim-canvas-frame items-center')}>
                <div className="spinner" aria-label="Creating simulation" />
              </div>
            )}
          </Card>

          <Card title="Time series">
            <PopulationChart data={history} metrics={base.metrics} />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ChallengePage;
