import { TestBed } from '@angular/core/testing';
import { LOGIC_ACTIVITIES } from './logic-content';
import {
  LOGIC_STORAGE_KEY,
  LogicProgressStore,
  emptyProgress,
  hintFor,
  restoreProgress,
  starsFor,
} from './logic-progress';
import { initialAnswer } from './logic-validation';

describe('logic progress, hints, retry and adaptation', () => {
  const activity = LOGIC_ACTIVITIES[0];
  let store: LogicProgressStore;
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    store = TestBed.inject(LogicProgressStore);
    store.open(activity);
  });
  afterEach(() => vi.restoreAllMocks());
  function solve(index = 0): void {
    const activity = LOGIC_ACTIVITIES[index];
    store.open(activity);
    const puzzle = activity.variants[store.progress(activity)!.variant].puzzle;
    if (puzzle.kind !== 'choice') throw new Error('Expected choice');
    store.change(activity, {
      kind: 'choice',
      value: puzzle.solution,
      reason: puzzle.reason ?? null,
    });
    store.check(activity);
  }
  it('saves draft, variant and completion across service recreation', () => {
    store.open(activity, 1);
    store.change(activity, { kind: 'choice', value: 'a', reason: null });
    store.hint(activity);
    TestBed.resetTestingModule();
    store = TestBed.inject(LogicProgressStore);
    expect(store.progress(activity)!.variant).toBe(1);
    expect(store.run(activity)!.answer).toEqual({ kind: 'choice', value: 'a', reason: null });
    solve();
    expect(store.run(activity)!.stars).toBe(2);
    expect(store.run(activity)!.completedAt).toBeTruthy();
    expect(restoreProgress(JSON.parse(localStorage.getItem(LOGIC_STORAGE_KEY)!))).toEqual(
      store.state(),
    );
    TestBed.resetTestingModule();
    expect(TestBed.inject(LogicProgressStore).completed()).toBe(1);
  });
  it('reveals exactly three hints, in order, including after reload', () => {
    const p = activity.variants[0].puzzle;
    expect(hintFor(p, store.run(activity)!)).toBeNull();
    for (let i = 0; i < 3; i++) {
      store.hint(activity);
      expect(hintFor(p, store.run(activity)!)).toBe(p.hints[i]);
    }
    store.hint(activity);
    expect(store.run(activity)!.hintsUsed).toBe(3);
    expect(
      hintFor(
        p,
        restoreProgress(JSON.parse(localStorage.getItem(LOGIC_STORAGE_KEY)!)).activities[
          activity.id
        ].runs['v1'],
      ),
    ).toBe(p.hints[2]);
  });
  it('preserves the answer and attempts on retry and does not penalise experiments', () => {
    store.change(activity, { kind: 'choice', value: 'b', reason: null });
    store.check(activity);
    expect(store.run(activity)!.wrong).toBe(true);
    expect(store.run(activity)!.attempts).toBe(1);
    store.retry(activity);
    expect(store.run(activity)!.wrong).toBe(false);
    expect(store.run(activity)!.answer).toEqual({ kind: 'choice', value: 'b', reason: null });
    solve();
    expect(store.run(activity)!.attempts).toBe(2);
    expect(store.run(activity)!.stars).toBe(2);
    store.check(activity);
    store.hint(activity);
    expect(store.state().recent).toHaveLength(1);
    expect(store.run(activity)!.hintsUsed).toBe(0);
  });
  it('restarts a draft without erasing attempts, keeps the best result and stores outcomes', () => {
    store.hint(activity);
    store.check(activity);
    store.restart(activity);
    expect(store.run(activity)!.attempts).toBe(1);
    expect(store.run(activity)!.hintsUsed).toBe(1);
    expect(store.run(activity)!.answer).toEqual(initialAnswer(activity.variants[0].puzzle));
    solve();
    store.restart(activity);
    solve();
    expect(store.progress(activity)!.bestStars).toBe(3);
    store.open(activity, 2);
    store.hint(activity);
    store.hint(activity);
    solve();
    expect(store.progress(activity)!.bestStars).toBe(3);
    expect(store.state().recent).toHaveLength(3);
  });
  it('unlocks by distinct successes and allows an adult override', () => {
    expect(store.unlocked(2)).toBe(false);
    solve();
    store.restart(activity);
    solve();
    store.restart(activity);
    solve();
    expect(store.unlocked(2)).toBe(false);
    solve(1);
    solve(3);
    expect(store.unlocked(2)).toBe(true);
    expect(store.recommendation().level).toBe(2);
    expect(store.unlocked(3)).toBe(false);
    store.setAdultAccess(true);
    expect(store.unlocked(3)).toBe(true);
    store.setAdultAccess(false);
    expect(store.unlocked(3)).toBe(false);
  });
  it('counts a three-stage mystery as one attempt and accumulates stage hints', () => {
    const activity = LOGIC_ACTIVITIES[23];
    const p = activity.variants[0].puzzle;
    if (p.kind !== 'stages') throw new Error('Expected stages');
    store.open(activity);
    store.hint(activity);
    for (let stage = 0; stage < 3; stage++) {
      const a = store.run(activity)!.answer;
      if (a.kind !== 'stages') throw new Error('Expected stages');
      const values = [...a.values];
      values[stage] = p.stages[stage].solution;
      store.change(activity, { ...a, values });
      store.check(activity);
      if (stage < 2) {
        expect(store.run(activity)!.attempts).toBe(0);
        expect(store.run(activity)!.hintIndex).toBe(0);
      }
    }
    expect(store.run(activity)!.status).toBe('completed');
    expect(store.run(activity)!.stars).toBe(2);
    expect(store.run(activity)!.attempts).toBe(1);
    expect(store.run(activity)!.hintsUsed).toBe(1);
  });
  it('recovers from broken storage, invalid answers and fake completions', () => {
    expect(restoreProgress({ version: 99 })).toEqual(emptyProgress());
    const saved = JSON.parse(localStorage.getItem(LOGIC_STORAGE_KEY)!);
    saved.activities[activity.id].runs.v1.answer = { kind: 'symmetry', values: [999] };
    expect(restoreProgress(saved).activities[activity.id].runs).toEqual({});
    const completed = JSON.parse(localStorage.getItem(LOGIC_STORAGE_KEY)!);
    completed.activities[activity.id].runs.v1.status = 'completed';
    expect(restoreProgress(completed).activities[activity.id].runs).toEqual({});
    localStorage.setItem(LOGIC_STORAGE_KEY, '{');
    TestBed.resetTestingModule();
    expect(TestBed.inject(LogicProgressStore).state()).toEqual(emptyProgress());
  });
  it('remains playable when localStorage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Blocked');
    });
    solve();
    expect(store.run(activity)!.status).toBe('completed');
    expect(store.savingUnavailable()).toBe(true);
  });
  it('awards motivational stars without any timing component', () => {
    expect(starsFor(1, 0)).toBe(3);
    expect(starsFor(1, 1)).toBe(2);
    expect(starsFor(2, 0)).toBe(2);
    expect(starsFor(2, 2)).toBe(1);
    expect(starsFor(10, 3)).toBe(1);
  });
});
