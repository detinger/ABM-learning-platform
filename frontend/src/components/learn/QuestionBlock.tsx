import React, { useId, useState } from 'react';
import { CheckCircle2, HelpCircle, Lightbulb, RotateCcw, XCircle } from 'lucide-react';
import type { Question } from '../../learn/types';
import { cn } from '../ui';
import { Inline, Rich } from './Rich';

/** Is a saved answer correct? `null` for predictions, which have no right answer. */
export function isCorrect(question: Question, answer: string | undefined): boolean | null {
  if (answer === undefined || question.type === 'predict') return null;
  if (question.type === 'choice') return Boolean(question.options[Number(answer)]?.correct);
  const value = Number(answer.replace(',', '.'));
  return Number.isFinite(value) && Math.abs(value - question.answer) <= question.tolerance + 1e-9;
}

const Result: React.FC<{ correct: boolean; children: React.ReactNode }> = ({ correct, children }) => (
  <div className={cn('answer-result', correct ? 'answer-correct' : 'answer-wrong')} role="status">
    {correct ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
    <div className="min-w-0">
      <p className="answer-title">{correct ? 'Correct' : 'Not quite'}</p>
      {children}
    </div>
  </div>
);

export const QuestionBlock: React.FC<{
  question: Question;
  saved?: string;
  onAnswer: (answer: string) => void;
}> = ({ question, saved, onAnswer }) => {
  const [draft, setDraft] = useState<string>(saved ?? '');
  const [editing, setEditing] = useState(saved === undefined);
  const name = useId();
  const answered = !editing && saved !== undefined;
  const correct = isCorrect(question, answered ? saved : undefined);

  const submit = (value: string) => {
    if (value === '') return;
    onAnswer(value);
    setEditing(false);
  };
  const retry = () => {
    setDraft('');
    setEditing(true);
  };

  const icon = question.type === 'predict' ? <Lightbulb size={16} /> : <HelpCircle size={16} />;
  const label = question.type === 'predict' ? 'Make a prediction' : 'Question';

  return (
    <section className="question" aria-label={label}>
      <div className="question-kicker">
        {icon} {label}
      </div>
      {question.type === 'number' ? (
        <>
          <label className="question-prompt block" htmlFor={name}>
            <Inline text={question.prompt} />
          </label>
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit(draft.trim());
            }}
          >
            <input
              id={name}
              className="input w-36 tabular"
              inputMode="decimal"
              value={draft}
              disabled={answered}
              onChange={(e) => setDraft(e.target.value.replace(/[^0-9.,-]/g, '').slice(0, 12))}
              placeholder="Your answer"
            />
            {question.unit && <span className="text-subtle text-[13px]">{question.unit}</span>}
            {!answered && (
              <button type="submit" className="btn btn-primary" disabled={draft.trim() === ''}>
                Check answer
              </button>
            )}
          </form>
          {answered && (
            <Result correct={Boolean(correct)}>
              {!correct && (
                <p>
                  The answer is <strong>{question.answer.toLocaleString()}</strong>
                  {question.unit ? ` ${question.unit}` : ''}.
                </p>
              )}
              <Rich text={question.explanation} />
            </Result>
          )}
        </>
      ) : (
        <fieldset className="m-0 border-0 p-0">
          <legend className="question-prompt">
            <Inline text={question.prompt} />
          </legend>
          <div className="options">
            {(question.type === 'choice' ? question.options.map((o) => o.text) : question.options).map((text, index) => {
              const value = String(index);
              const chosen = (answered ? saved : draft) === value;
              const state =
                !answered || question.type === 'predict'
                  ? chosen ? 'chosen' : undefined
                  : question.options[index].correct ? (chosen ? 'correct' : 'answer')
                  : chosen ? 'wrong'
                  : undefined;
              return (
                <label key={value} className="option" data-state={state} data-locked={answered || undefined}>
                  <input
                    type="radio"
                    name={name}
                    value={value}
                    checked={chosen}
                    disabled={answered}
                    onChange={() => (question.type === 'predict' ? submit(value) : setDraft(value))}
                  />
                  <span className="option-mark" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <Inline text={text} />
                  </span>
                  {(state === 'correct' || state === 'answer') && (
                    <CheckCircle2 size={16} className="option-icon" aria-label="Correct answer" />
                  )}
                  {state === 'wrong' && <XCircle size={16} className="option-icon" aria-label="Your answer" />}
                </label>
              );
            })}
          </div>
          {question.type === 'choice' && !answered && (
            <button type="button" className="btn btn-primary mt-3" disabled={draft === ''} onClick={() => submit(draft)}>
              Check answer
            </button>
          )}
          {answered && question.type === 'choice' && (
            <Result correct={Boolean(correct)}>
              {question.options[Number(saved)]?.feedback && <p>{question.options[Number(saved)].feedback}</p>}
              <Rich text={question.explanation} />
            </Result>
          )}
          {answered && question.type === 'predict' && (
            <div className="answer-result answer-reveal" role="status">
              <Lightbulb size={18} />
              <div className="min-w-0">
                <p className="answer-title">What happens</p>
                <Rich text={question.reveal} />
              </div>
            </div>
          )}
        </fieldset>
      )}
      {answered && (question.type !== 'predict' ? !correct : true) && (
        <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={retry}>
          <RotateCcw size={14} /> {question.type === 'predict' ? 'Change prediction' : 'Try again'}
        </button>
      )}
    </section>
  );
};
