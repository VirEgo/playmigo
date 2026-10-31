import { Injectable, computed, signal } from '@angular/core';
import { LOGIC_ACTIVITIES, getActivity } from './logic-content';
import { Activity, Answer, Difficulty, Puzzle } from './logic-exercise';
import { checkAnswer, initialAnswer, isAnswer } from './logic-validation';

export const LOGIC_STORAGE_KEY = 'logic-challenges-v1';
export interface Run {
  variantId: string;
  status: 'in-progress' | 'completed';
  answer: Answer;
  attempts: number;
  hintsUsed: number;
  hintIndex: number;
  completedAt: string | null;
  stars: number;
  wrong: boolean;
}
export interface Outcome {
  activityId: string;
  variantId: string;
  attempts: number;
  hintsUsed: number;
  stars: number;
  completedAt: string;
}
export interface ActivityProgress {
  variant: number;
  runs: Record<string, Run>;
  bestStars: number;
}
export interface LogicProgress {
  version: 1;
  activities: Record<string, ActivityProgress>;
  recent: Outcome[];
  adultAccess: boolean;
}
export function emptyProgress(): LogicProgress {
  return { version: 1, activities: {}, recent: [], adultAccess: false };
}
export function starsFor(attempts: number, hints: number): number {
  return attempts === 1 && hints === 0 ? 3 : attempts <= 2 && hints <= 1 ? 2 : 1;
}
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function count(value: unknown, max = 100000): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= max;
}
function timestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}
export function restoreProgress(value: unknown): LogicProgress {
  const fresh = emptyProgress();
  if (!record(value) || value['version'] !== 1 || !record(value['activities'])) return fresh;
  fresh.adultAccess = value['adultAccess'] === true;
  for (const activity of LOGIC_ACTIVITIES) {
    const stored = value['activities'][activity.id];
    if (
      !record(stored) ||
      !count(stored['variant'], activity.variants.length - 1) ||
      !record(stored['runs'])
    )
      continue;
    const progress: ActivityProgress = {
      variant: stored['variant'],
      runs: {},
      bestStars: count(stored['bestStars'], 3) ? stored['bestStars'] : 0,
    };
    for (const variant of activity.variants) {
      const run = stored['runs'][variant.id];
      if (
        !record(run) ||
        run['variantId'] !== variant.id ||
        !isAnswer(variant.puzzle, run['answer']) ||
        !count(run['attempts']) ||
        !count(run['hintsUsed']) ||
        !count(run['hintIndex'], 3) ||
        !count(run['stars'], 3) ||
        typeof run['wrong'] !== 'boolean'
      )
        continue;
      if (run['status'] !== 'in-progress' && run['status'] !== 'completed') continue;
      if (
        run['status'] === 'completed' &&
        (!timestamp(run['completedAt']) ||
          !checkAnswer(variant.puzzle, run['answer']) ||
          run['stars'] !== starsFor(run['attempts'], run['hintsUsed']) ||
          run['attempts'] < 1)
      )
        continue;
      if (run['status'] === 'in-progress' && (run['completedAt'] !== null || run['stars'] !== 0))
        continue;
      progress.runs[variant.id] = run as unknown as Run;
      progress.bestStars = Math.max(progress.bestStars, run['stars']);
    }
    fresh.activities[activity.id] = progress;
  }
  if (Array.isArray(value['recent'])) {
    fresh.recent = value['recent']
      .filter(
        (entry): entry is Outcome =>
          record(entry) &&
          typeof entry['activityId'] === 'string' &&
          !!getActivity(entry['activityId'])?.variants.some(
            (variant) => variant.id === entry['variantId'],
          ) &&
          count(entry['attempts']) &&
          (entry['attempts'] as number) >= 1 &&
          count(entry['hintsUsed']) &&
          entry['stars'] === starsFor(entry['attempts'], entry['hintsUsed']) &&
          timestamp(entry['completedAt']),
      )
      .slice(-20);
  }
  return fresh;
}
export function hintFor(puzzle: Puzzle, run: Run): string | null {
  if (run.hintIndex === 0) return null;
  const current =
    puzzle.kind === 'stages' && run.answer.kind === 'stages'
      ? puzzle.stages[run.answer.stage]
      : puzzle;
  return current.hints[run.hintIndex - 1];
}
@Injectable({ providedIn: 'root' })
export class LogicProgressStore {
  readonly state = signal<LogicProgress>(this.load());
  readonly completed = computed(
    () =>
      LOGIC_ACTIVITIES.filter((activity) => this.state().activities[activity.id]?.bestStars > 0)
        .length,
  );
  readonly stars = computed(() =>
    Object.values(this.state().activities).reduce((sum, progress) => sum + progress.bestStars, 0),
  );
  readonly savingUnavailable = signal(false);

  progress(activity: Activity): ActivityProgress | undefined {
    return this.state().activities[activity.id];
  }
  run(activity: Activity): Run | undefined {
    const progress = this.progress(activity);
    return progress?.runs[activity.variants[progress.variant].id];
  }
  unlocked(level: Difficulty): boolean {
    if (level === 1 || this.state().adultAccess) return true;
    const previous = LOGIC_ACTIVITIES.filter((activity) => activity.difficulty === level - 1);
    return (
      previous.filter((activity) => this.progress(activity)?.bestStars).length >= 5 ||
      previous.filter((activity) => this.progress(activity)?.bestStars === 3).length >= 3
    );
  }
  recommendation(): { level: Difficulty; message: string } {
    const recent = this.state().recent.slice(-3);
    const lastLevel = getActivity(recent.at(-1)?.activityId ?? '')?.difficulty ?? 1;
    const struggling =
      recent.length >= 2 &&
      recent.slice(-2).every((outcome) => outcome.attempts >= 3 || outcome.hintsUsed >= 2);
    const active = Object.entries(this.state().activities).find(([id]) => {
      const activity = getActivity(id);
      const run = activity && this.run(activity);
      return run?.status === 'in-progress' && run.attempts >= 3;
    });
    if (struggling || active)
      return {
        level: Math.max(
          1,
          (active ? getActivity(active[0])!.difficulty : lastLevel) - 1,
        ) as Difficulty,
        message: 'Vamos paso a paso. Puedes practicar una regla más sencilla.',
      };
    const independent = recent.length === 3 && recent.every((outcome) => outcome.stars === 3);
    const next = Math.min(3, lastLevel + (independent ? 1 : 0)) as Difficulty;
    return {
      level: this.unlocked(next) ? next : lastLevel,
      message: independent
        ? '¡Has resuelto tres retos sin ayuda! Puedes explorar un nivel más.'
        : 'Elige un reto y descubre su regla. Tienes todo el tiempo que necesites.',
    };
  }
  open(activity: Activity, variant?: number): void {
    const previous = this.progress(activity) ?? { variant: 0, runs: {}, bestStars: 0 };
    const index = variant ?? previous.variant;
    if (!count(index, activity.variants.length - 1)) return;
    const selected = activity.variants[index];
    this.saveActivity(activity.id, {
      ...previous,
      variant: index,
      runs: {
        ...previous.runs,
        [selected.id]: previous.runs[selected.id] ?? this.freshRun(selected.id, selected.puzzle),
      },
    });
  }
  change(activity: Activity, answer: Answer): void {
    const run = this.run(activity);
    const puzzle = activity.variants[this.progress(activity)?.variant ?? 0].puzzle;
    if (!run || run.status === 'completed' || !isAnswer(puzzle, answer)) return;
    this.updateRun(activity, { ...run, answer, wrong: false });
  }
  hint(activity: Activity): void {
    const run = this.run(activity);
    if (!run || run.status === 'completed' || run.hintIndex === 3) return;
    this.updateRun(activity, {
      ...run,
      hintIndex: run.hintIndex + 1,
      hintsUsed: run.hintsUsed + 1,
    });
  }
  check(activity: Activity): void {
    const run = this.run(activity);
    if (!run || run.status === 'completed') return;
    const puzzle = activity.variants[this.progress(activity)!.variant].puzzle;
    if (puzzle.kind === 'stages' && run.answer.kind === 'stages') {
      const stage = run.answer.stage;
      if (run.answer.values[stage] !== puzzle.stages[stage].solution) {
        this.updateRun(activity, { ...run, attempts: run.attempts + 1, wrong: true });
        return;
      }
      if (stage < puzzle.stages.length - 1) {
        this.updateRun(activity, {
          ...run,
          answer: { ...run.answer, stage: stage + 1 },
          hintIndex: 0,
          wrong: false,
        });
        return;
      }
    }
    const success = checkAnswer(puzzle, run.answer);
    const attempts = run.attempts + 1;
    if (!success) {
      this.updateRun(activity, { ...run, attempts, wrong: true });
      return;
    }
    const completedAt = new Date().toISOString();
    const stars = starsFor(attempts, run.hintsUsed);
    const outcome: Outcome = {
      activityId: activity.id,
      variantId: run.variantId,
      attempts,
      hintsUsed: run.hintsUsed,
      completedAt,
      stars,
    };
    const progress = this.progress(activity)!;
    const completed: Run = {
      ...run,
      attempts,
      status: 'completed',
      completedAt,
      stars,
      wrong: false,
    };
    this.persist({
      ...this.state(),
      activities: {
        ...this.state().activities,
        [activity.id]: {
          ...progress,
          bestStars: Math.max(progress.bestStars, stars),
          runs: { ...progress.runs, [run.variantId]: completed },
        },
      },
      recent: [...this.state().recent, outcome].slice(-20),
    });
  }
  retry(activity: Activity): void {
    const run = this.run(activity);
    if (run && run.status !== 'completed') this.updateRun(activity, { ...run, wrong: false });
  }
  restart(activity: Activity): void {
    const progress = this.progress(activity);
    if (!progress) return;
    const variant = activity.variants[progress.variant];
    const run = this.run(activity);
    this.updateRun(activity, {
      ...this.freshRun(variant.id, variant.puzzle),
      attempts: run?.status === 'in-progress' ? run.attempts : 0,
      hintsUsed: run?.status === 'in-progress' ? run.hintsUsed : 0,
    });
  }
  setAdultAccess(enabled: boolean): void {
    this.persist({ ...this.state(), adultAccess: enabled });
  }
  private freshRun(variantId: string, puzzle: Puzzle): Run {
    return {
      variantId,
      status: 'in-progress',
      answer: initialAnswer(puzzle),
      attempts: 0,
      hintsUsed: 0,
      hintIndex: 0,
      completedAt: null,
      stars: 0,
      wrong: false,
    };
  }
  private updateRun(activity: Activity, run: Run): void {
    const progress = this.progress(activity)!;
    this.saveActivity(activity.id, {
      ...progress,
      runs: { ...progress.runs, [run.variantId]: run },
    });
  }
  private saveActivity(id: string, progress: ActivityProgress): void {
    this.persist({ ...this.state(), activities: { ...this.state().activities, [id]: progress } });
  }
  private persist(state: LogicProgress): void {
    this.state.set(state);
    try {
      globalThis.localStorage?.setItem(LOGIC_STORAGE_KEY, JSON.stringify(state));
      this.savingUnavailable.set(false);
    } catch {
      this.savingUnavailable.set(true);
    }
  }
  private load(): LogicProgress {
    try {
      return restoreProgress(
        JSON.parse(globalThis.localStorage?.getItem(LOGIC_STORAGE_KEY) ?? 'null'),
      );
    } catch {
      return emptyProgress();
    }
  }
}
