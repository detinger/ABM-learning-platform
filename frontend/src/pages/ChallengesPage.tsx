import React, { useEffect } from 'react';
import { ArrowRight, CheckCircle2, Target } from 'lucide-react';
import { Link } from '../app/router';
import { Badge } from '../components/ui';
import { MODEL_CONFIGS, MODEL_ORDER } from '../models/configs';
import { challengesForModel, CHALLENGES } from '../learn/challenges';
import { useProgress } from '../learn/progress';
import { LEVEL_TONE, ProgressBar } from './LearnPage';

const ChallengesPage: React.FC = () => {
  const progress = useProgress();
  useEffect(() => {
    document.title = 'Challenges · ABM Learning Platform';
  }, []);
  const passed = CHALLENGES.filter((c) => progress.challenges[c.id]?.passed).length;

  return (
    <div className="page page-narrow">
      <header className="page-header">
        <div className="min-w-0 flex-1">
          <div className="eyebrow">Practice</div>
          <h1 className="hero-title">Challenges</h1>
          <p className="page-description hero-description">
            Each challenge gives you a goal and a few parameters to tune. Run the model; the app checks the goals live and
            tells you when you’ve cracked it.
          </p>
        </div>
        <div className="learn-summary-item w-full max-w-[280px]">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-semibold">Passed</span>
              <span className="tabular text-muted">
                {passed} / {CHALLENGES.length}
              </span>
            </div>
            <ProgressBar value={passed} max={CHALLENGES.length} label="Challenges passed" />
          </div>
        </div>
      </header>

      <div className="stack gap-6">
        {MODEL_ORDER.map((modelId) => {
          const config = MODEL_CONFIGS[modelId];
          const list = challengesForModel(modelId);
          if (list.length === 0) return null;
          return (
            <section key={modelId} aria-labelledby={`ch-${modelId}`}>
              <h2 id={`ch-${modelId}`} className="mb-3 flex items-center gap-2 text-[16px]">
                <config.icon size={18} className="text-primary" aria-hidden /> {config.name}
              </h2>
              <div className="grid-2">
                {list.map((c) => {
                  const cp = progress.challenges[c.id];
                  return (
                    <Link key={c.id} to={`/challenges/${c.id}`} className="card card-link challenge-card">
                      <div className="card-body gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <Badge tone={LEVEL_TONE[c.level]}>{c.level}</Badge>
                          {cp?.passed ? (
                            <Badge tone="success">
                              <CheckCircle2 size={12} aria-hidden /> Passed
                            </Badge>
                          ) : cp?.attempts ? (
                            <span className="text-[12px] text-subtle">
                              {cp.attempts} attempt{cp.attempts === 1 ? '' : 's'}
                            </span>
                          ) : null}
                        </div>
                        <h3 className="m-0 flex items-center gap-2">
                          <Target size={16} className="text-accent" aria-hidden /> {c.title}
                        </h3>
                        <p className="m-0 line-clamp-3 text-[13px] text-muted">{c.brief}</p>
                        <div className="mt-auto flex items-center justify-between pt-1 text-[13px]">
                          <span className="text-subtle">
                            {c.goals.length} goal{c.goals.length === 1 ? '' : 's'} · {c.horizon >= 1000 ? 'until it ends' : `${c.horizon} steps`}
                          </span>
                          <span className="flex items-center gap-1 font-semibold text-primary">
                            {cp?.passed ? 'Play again' : 'Take it on'} <ArrowRight size={14} aria-hidden />
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default ChallengesPage;
