import { useSyncExternalStore } from 'react';

/**
 * Learning progress, kept in this browser only (no accounts). Every storage access is
 * guarded: in a private window or with storage blocked the app still works, it just
 * forgets progress on reload.
 */

export interface LessonProgress {
  /** Highest section index reached. */
  reached: number;
  completed: boolean;
  answers: Record<string, string>;
}

export interface ChallengeProgress {
  attempts: number;
  passed: boolean;
  passedAt?: string;
}

export interface Progress {
  lessons: Record<string, LessonProgress>;
  challenges: Record<string, ChallengeProgress>;
}

const KEY = 'abm-progress-v1';
const EMPTY: Progress = { lessons: {}, challenges: {} };

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    return { lessons: parsed.lessons ?? {}, challenges: parsed.challenges ?? {} };
  } catch {
    return EMPTY;
  }
}

let current: Progress = load();
const listeners = new Set<() => void>();

function commit(next: Progress) {
  current = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: keep in memory */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) {
      current = load();
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, () => current);
}

const lessonOf = (p: Progress, id: string): LessonProgress => p.lessons[id] ?? { reached: 0, completed: false, answers: {} };

export function reachSection(lessonId: string, index: number) {
  const lesson = lessonOf(current, lessonId);
  if (index <= lesson.reached) return;
  commit({ ...current, lessons: { ...current.lessons, [lessonId]: { ...lesson, reached: index } } });
}

export function completeLesson(lessonId: string) {
  const lesson = lessonOf(current, lessonId);
  if (lesson.completed) return;
  commit({ ...current, lessons: { ...current.lessons, [lessonId]: { ...lesson, completed: true } } });
}

export function saveAnswer(lessonId: string, questionId: string, answer: string) {
  const lesson = lessonOf(current, lessonId);
  commit({
    ...current,
    lessons: { ...current.lessons, [lessonId]: { ...lesson, answers: { ...lesson.answers, [questionId]: answer } } },
  });
}

export function recordAttempt(challengeId: string, passed: boolean) {
  const prev = current.challenges[challengeId] ?? { attempts: 0, passed: false };
  commit({
    ...current,
    challenges: {
      ...current.challenges,
      [challengeId]: {
        attempts: prev.attempts + 1,
        passed: prev.passed || passed,
        passedAt: prev.passedAt ?? (passed ? new Date().toISOString() : undefined),
      },
    },
  });
}

export function resetProgress() {
  commit(EMPTY);
}
