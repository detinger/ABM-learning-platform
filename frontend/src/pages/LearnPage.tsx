import React, { useEffect } from 'react';
import { ArrowRight, CheckCircle2, Clock, GraduationCap, Trophy } from 'lucide-react';
import { Link } from '../app/router';
import ModelPreview from '../components/ModelPreview';
import { Badge } from '../components/ui';
import { MODEL_CONFIGS } from '../models/configs';
import { LESSONS, gradedQuestions } from '../learn/lessons';
import { CHALLENGES } from '../learn/challenges';
import { useProgress } from '../learn/progress';
import { isCorrect } from '../components/learn/QuestionBlock';

export const LEVEL_TONE = { Beginner: 'success', Intermediate: 'primary', Advanced: 'accent' } as const;

export const ProgressBar: React.FC<{ value: number; max: number; label: string }> = ({ value, max, label }) => (
  <div
    className="progress"
    role="progressbar"
    aria-label={label}
    aria-valuemin={0}
    aria-valuemax={max}
    aria-valuenow={value}
  >
    <span style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
  </div>
);

const LearnPage: React.FC = () => {
  const progress = useProgress();
  useEffect(() => {
    document.title = 'Lessons · ABM Learning Platform';
  }, []);

  const doneLessons = LESSONS.filter((l) => progress.lessons[l.id]?.completed).length;
  const passed = CHALLENGES.filter((c) => progress.challenges[c.id]?.passed).length;
  const next = LESSONS.find((l) => !progress.lessons[l.id]?.completed) ?? LESSONS[0];

  return (
    <div className="page page-narrow">
      <header className="page-header">
        <div>
          <div className="eyebrow">Learning path</div>
          <h1 className="hero-title">Lessons</h1>
          <p className="page-description hero-description">
            Eight short lessons take you from “what is an agent?” to running proper simulation experiments. Each one has
            live simulations to play with and questions to check your understanding.
          </p>
        </div>
      </header>

      <div className="learn-summary">
        <div className="learn-summary-item">
          <GraduationCap size={20} className="text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-semibold">Lessons completed</span>
              <span className="tabular text-muted">
                {doneLessons} / {LESSONS.length}
              </span>
            </div>
            <ProgressBar value={doneLessons} max={LESSONS.length} label="Lessons completed" />
          </div>
        </div>
        <div className="learn-summary-item">
          <Trophy size={20} className="text-accent" aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-semibold">Challenges passed</span>
              <span className="tabular text-muted">
                {passed} / {CHALLENGES.length}
              </span>
            </div>
            <ProgressBar value={passed} max={CHALLENGES.length} label="Challenges passed" />
          </div>
        </div>
        <Link to={`/learn/${next.id}`} className="btn btn-primary">
          {doneLessons === 0 ? 'Start lesson 1' : doneLessons === LESSONS.length ? 'Review lesson 1' : 'Continue learning'}
          <ArrowRight size={16} aria-hidden />
        </Link>
      </div>

      <ol className="lesson-path" aria-label="Lessons">
        {LESSONS.map((lesson, index) => {
          const config = MODEL_CONFIGS[lesson.model];
          const lp = progress.lessons[lesson.id];
          const graded = gradedQuestions(lesson);
          const right = graded.filter((q) => isCorrect(q, lp?.answers[q.id])).length;
          const started = lp && (lp.reached > 0 || Object.keys(lp.answers).length > 0);
          return (
            <li key={lesson.id}>
              <Link to={`/learn/${lesson.id}`} className="card card-link lesson-card">
                <div className="lesson-card-preview" aria-hidden>
                  <ModelPreview config={config} variant={lesson.id} />
                  <span className="lesson-number" data-done={lp?.completed || undefined}>
                    {lp?.completed ? <CheckCircle2 size={18} /> : index + 1}
                  </span>
                </div>
                <div className="card-body">
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge tone={LEVEL_TONE[lesson.level]}>{lesson.level}</Badge>
                    <span className="flex items-center gap-1 text-[12px] text-subtle">
                      <Clock size={12} aria-hidden /> {lesson.minutes} min
                    </span>
                  </div>
                  <h3 className="mb-1">{lesson.title}</h3>
                  <p className="mb-3 text-[13px] text-muted">{lesson.summary}</p>
                  <div className="mt-auto flex items-center justify-between gap-2 text-[13px]">
                    <span className="flex items-center gap-1.5 text-subtle">
                      <config.icon size={14} aria-hidden /> {config.name}
                    </span>
                    {lp?.completed ? (
                      <span className="font-semibold text-[var(--success)]">
                        Done · {right}/{graded.length} correct
                      </span>
                    ) : started ? (
                      <span className="font-semibold text-primary">Continue</span>
                    ) : (
                      <span className="flex items-center gap-1 font-semibold text-primary">
                        Start <ArrowRight size={14} aria-hidden />
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>

      <div className="card mt-8 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h3 className="mb-1 flex items-center gap-2">
            <Trophy size={18} className="text-accent" aria-hidden /> Ready to test yourself?
          </h3>
          <p className="m-0 text-[13px] text-muted">
            Twelve challenges, two for every model. Tune the parameters to hit a goal; the app checks your run.
          </p>
        </div>
        <Link to="/challenges" className="btn">
          Browse challenges <ArrowRight size={16} aria-hidden />
        </Link>
      </div>
    </div>
  );
};

export default LearnPage;
