import type { GridState, HistoryPoint } from '../types';
import type { FigureId } from './figures';

// ─────────────────────────── Questions ───────────────────────────

export interface ChoiceOption {
  text: string;
  correct?: boolean;
  /** Shown when this option is picked. */
  feedback?: string;
}

export type Question =
  | {
      id: string;
      type: 'choice';
      prompt: string;
      options: ChoiceOption[];
      explanation: string;
    }
  | {
      /** A prediction: no wrong answer; the explanation is revealed after choosing. */
      id: string;
      type: 'predict';
      prompt: string;
      options: string[];
      reveal: string;
    }
  | {
      id: string;
      type: 'number';
      prompt: string;
      answer: number;
      tolerance: number;
      unit?: string;
      explanation: string;
    };

// ─────────────────────────── Lesson content ───────────────────────────

export type Block =
  | { kind: 'text'; text: string }
  | { kind: 'list'; items: string[]; ordered?: boolean }
  | { kind: 'concepts'; items: { term: string; text: string }[] }
  | { kind: 'callout'; tone: 'info' | 'warning' | 'success'; title?: string; text: string }
  | { kind: 'figure'; figure: FigureId; caption: string }
  | {
      kind: 'sim';
      model: string;
      /** Slider-unit overrides of the model defaults. */
      params?: Record<string, number>;
      /** Parameter keys the reader may adjust inside the lesson. */
      controls?: string[];
      seed?: number;
      prompt?: string;
    }
  | { kind: 'question'; question: Question };

export interface LessonSection {
  id: string;
  title: string;
  blocks: Block[];
}

export interface Lesson {
  id: string;
  title: string;
  summary: string;
  model: string;
  minutes: number;
  level: Level;
  objectives: string[];
  sections: LessonSection[];
}

// ─────────────────────────── Challenges ───────────────────────────

export type Level = 'Beginner' | 'Intermediate' | 'Advanced';

export interface ChallengeContext {
  /** History rows up to and including the step limit. */
  history: HistoryPoint[];
  state: GridState | null;
  /** Applied parameters in slider units. */
  params: Record<string, number>;
  step: number;
  /** True once the step limit or a terminal state is reached. */
  final: boolean;
}

export type GoalStatus = 'met' | 'pending' | 'failed';

export interface Goal {
  id: string;
  label: string;
  evaluate: (ctx: ChallengeContext) => { status: GoalStatus; value: string };
}

export interface Challenge {
  id: string;
  model: string;
  title: string;
  level: Level;
  brief: string;
  /** Step limit; the run is judged here or at a terminal state, whichever comes first. */
  horizon: number;
  /** Starting values in slider units (merged over the model defaults). */
  start: Record<string, number>;
  /** Parameters the player may change, optionally with tighter bounds. Everything else is locked. */
  editable: Record<string, { min?: number; max?: number }>;
  goals: Goal[];
  hints: string[];
  insight: string;
  lesson?: string;
}
