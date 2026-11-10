import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock, Flag, Target, Trophy } from 'lucide-react';
import { Link } from '../app/router';
import { Badge, Callout, cn } from '../components/ui';
import { Figure } from '../learn/figures';
import { LESSONS, gradedQuestions } from '../learn/lessons';
import { challengesForModel } from '../learn/challenges';
import { completeLesson, reachSection, saveAnswer, useProgress } from '../learn/progress';
import type { Block, Lesson } from '../learn/types';
import { MODEL_CONFIGS } from '../models/configs';
import { Inline, Rich } from '../components/learn/Rich';
import { QuestionBlock, isCorrect } from '../components/learn/QuestionBlock';
import LessonSim from '../components/learn/LessonSim';
import { LEVEL_TONE, ProgressBar } from './LearnPage';

const BlockView: React.FC<{ block: Block; lesson: Lesson; answers: Record<string, string> }> = ({ block, lesson, answers }) => {
  switch (block.kind) {
    case 'text':
      return <Rich text={block.text} />;
    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul';
      return (
        <Tag className="lesson-list">
          {block.items.map((item) => (
            <li key={item}>
              <Inline text={item} />
            </li>
          ))}
        </Tag>
      );
    }
    case 'concepts':
      return (
        <dl className="concepts">
          {block.items.map((c) => (
            <div key={c.term} className="concept">
              <dt>{c.term}</dt>
              <dd>
                <Inline text={c.text} />
              </dd>
            </div>
          ))}
        </dl>
      );
    case 'callout':
      return (
        <Callout tone={block.tone} title={block.title}>
          <Rich text={block.text} />
        </Callout>
      );
    case 'figure':
      return <Figure id={block.figure} caption={block.caption} />;
    case 'sim':
      return <LessonSim model={block.model} params={block.params} controls={block.controls} seed={block.seed} prompt={block.prompt} />;
    case 'question':
      return (
        <QuestionBlock
          question={block.question}
          saved={answers[block.question.id]}
          onAnswer={(answer) => saveAnswer(lesson.id, block.question.id, answer)}
        />
      );
  }
};

const Completion: React.FC<{ lesson: Lesson; answers: Record<string, string> }> = ({ lesson, answers }) => {
  const graded = gradedQuestions(lesson);
  const right = graded.filter((q) => isCorrect(q, answers[q.id])).length;
  const index = LESSONS.findIndex((l) => l.id === lesson.id);
  const next = LESSONS[index + 1];
  const challenges = challengesForModel(lesson.model);
  return (
    <section className="lesson-complete" aria-labelledby="complete-title">
      <div className="lesson-complete-badge" aria-hidden>
        <Trophy size={26} />
      </div>
      <h2 id="complete-title">Lesson complete</h2>
      <p className="text-muted">
        You answered <strong>{right}</strong> of <strong>{graded.length}</strong> questions correctly.
        {right < graded.length && ' Go back to any question and try again.'}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {next ? (
          <Link to={`/learn/${next.id}`} className="btn btn-primary">
            Next: {next.title} <ArrowRight size={16} aria-hidden />
          </Link>
        ) : (
          <Link to="/challenges" className="btn btn-primary">
            Go to the challenges <ArrowRight size={16} aria-hidden />
          </Link>
        )}
        <Link to="/learn" className="btn">
          All lessons
        </Link>
      </div>
      {challenges.length > 0 && (
        <div className="mt-5 w-full text-left">
          <h3 className="mb-2 text-[13px]">Put it into practice</h3>
          <div className="grid-2">
            {challenges.map((c) => (
              <Link key={c.id} to={`/challenges/${c.id}`} className="card card-link card-compact flex-row items-center gap-3 p-3">
                <Target size={18} className="shrink-0 text-accent" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{c.title}</span>
                  <span className="block text-[12px] text-subtle">{c.level} challenge</span>
                </span>
                <ArrowRight size={14} aria-hidden />
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

const LessonPage: React.FC<{ lesson: Lesson }> = ({ lesson }) => {
  const progress = useProgress();
  const lp = progress.lessons[lesson.id];
  const answers = lp?.answers ?? {};
  const [index, setIndex] = useState(() => (lp && !lp.completed ? Math.min(lp.reached, lesson.sections.length - 1) : 0));
  const [finished, setFinished] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  const config = MODEL_CONFIGS[lesson.model];
  const number = LESSONS.findIndex((l) => l.id === lesson.id) + 1;
  const section = lesson.sections[index];
  const last = index === lesson.sections.length - 1;

  useEffect(() => {
    document.title = `${lesson.title} · Lessons · ABM Learning Platform`;
  }, [lesson.title]);

  // Each section is a new "page": move focus to its heading and scroll to the top.
  useEffect(() => {
    reachSection(lesson.id, index);
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
    document.getElementById('main')?.scrollTo?.({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [lesson.id, index]);

  const go = (next: number) => {
    setFinished(false);
    setIndex(next);
  };
  const finish = () => {
    completeLesson(lesson.id);
    setFinished(true);
    window.scrollTo({ top: 0 });
  };

  const reached = lp?.reached ?? 0;

  return (
    <div className="page">
      <div className="lesson-layout">
        <aside className="lesson-outline" aria-label="Lesson outline">
          <Link to="/learn" className="btn btn-ghost btn-sm mb-3 -ml-2">
            <ArrowLeft size={14} aria-hidden /> All lessons
          </Link>
          <div className="eyebrow">Lesson {number}</div>
          <h2 className="mb-1 text-[15px]">{lesson.title}</h2>
          <ProgressBar value={finished || lp?.completed ? lesson.sections.length : index} max={lesson.sections.length} label="Lesson progress" />
          <ol className="outline-steps">
            {lesson.sections.map((s, i) => {
              const state =
                i === index && !finished ? 'current' : lp?.completed || i < Math.max(reached, index) ? 'done' : 'todo';
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    className="outline-step"
                    data-state={state}
                    aria-current={i === index && !finished ? 'step' : undefined}
                    onClick={() => go(i)}
                  >
                    <span className="outline-dot" aria-hidden>
                      {state === 'done' ? <Check size={12} /> : i + 1}
                    </span>
                    <span className="min-w-0">{s.title}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        <article className="lesson-content">
          {finished ? (
            <Completion lesson={lesson} answers={answers} />
          ) : (
            <>
              {index === 0 && (
                <header className="lesson-hero">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={LEVEL_TONE[lesson.level]}>{lesson.level}</Badge>
                    <span className="flex items-center gap-1 text-[12px] text-subtle">
                      <Clock size={12} aria-hidden /> {lesson.minutes} min
                    </span>
                    <span className="flex items-center gap-1 text-[12px] text-subtle">
                      <config.icon size={12} aria-hidden /> {config.name}
                    </span>
                  </div>
                  <h1 className="hero-title mb-1 mt-2">{lesson.title}</h1>
                  <p className="page-description hero-description">{lesson.summary}</p>
                  <div className="objectives">
                    <div className="objectives-title">
                      <Flag size={14} aria-hidden /> In this lesson you will
                    </div>
                    <ul>
                      {lesson.objectives.map((o) => (
                        <li key={o}>
                          <CheckCircle2 size={14} aria-hidden /> {o}
                        </li>
                      ))}
                    </ul>
                  </div>
                </header>
              )}

              <div className="section-kicker">
                Section {index + 1} of {lesson.sections.length}
              </div>
              <h2 ref={headingRef} tabIndex={-1} className="section-title">
                {section.title}
              </h2>
              <div className="lesson-blocks" key={section.id}>
                {section.blocks.map((block, i) => (
                  <BlockView key={`${section.id}-${i}`} block={block} lesson={lesson} answers={answers} />
                ))}
              </div>

              <nav className="lesson-nav" aria-label="Section navigation">
                <button type="button" className={cn('btn', index === 0 && 'invisible')} onClick={() => go(index - 1)}>
                  <ArrowLeft size={16} aria-hidden /> {index > 0 ? lesson.sections[index - 1].title : 'Previous'}
                </button>
                {last ? (
                  <button type="button" className="btn btn-primary" onClick={finish}>
                    <CheckCircle2 size={16} aria-hidden /> Finish lesson
                  </button>
                ) : (
                  <button type="button" className="btn btn-primary" onClick={() => go(index + 1)}>
                    Next: {lesson.sections[index + 1].title} <ArrowRight size={16} aria-hidden />
                  </button>
                )}
              </nav>
            </>
          )}
        </article>
      </div>
    </div>
  );
};

export default LessonPage;
