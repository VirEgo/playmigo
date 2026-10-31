import { LOGIC_ACTIVITIES } from './logic-content';
import { Answer, Puzzle } from './logic-exercise';
import {
  adjacent,
  assignmentSolutions,
  checkAnswer,
  combinationIds,
  findPath,
  initialAnswer,
  isAnswer,
  machineSteps,
  permutations,
  reflection,
  robotPath,
  satisfies,
} from './logic-validation';

function solution(p: Puzzle): Answer {
  switch (p.kind) {
    case 'choice':
      return { kind: 'choice', value: p.solution, reason: p.reason ?? null };
    case 'placement':
      return { kind: 'placement', values: { ...p.solution } };
    case 'selection':
      return { kind: 'selection', values: [...p.solution] };
    case 'order':
      return { kind: 'order', values: [...p.solution] };
    case 'symmetry':
      return { kind: 'symmetry', values: reflection(p) };
    case 'grid':
      return p.mode === 'robot'
        ? { kind: 'grid', commands: directions(findPath(p)!, p.size), path: [p.start] }
        : { kind: 'grid', commands: [], path: findPath(p)! };
    case 'machine':
      return { kind: 'machine', value: machineSteps(p, p.input).at(-1)!, rule: p.rule };
    case 'code':
      return {
        kind: 'code',
        value: String(
          p.terms.reduce((sum, id) => sum + p.key.find((entry) => entry.tile.id === id)!.value, 0),
        ),
      };
    case 'combinations':
      return {
        kind: 'combinations',
        values: combinationIds(p),
        total: String(p.hats.length * p.shirts.length),
      };
    case 'stages':
      return { kind: 'stages', stage: 2, values: p.stages.map((stage) => stage.solution) };
  }
}
function directions(path: readonly number[], size: number): ('up' | 'down' | 'left' | 'right')[] {
  return path
    .slice(1)
    .map((cell, i) =>
      cell - path[i] === size
        ? 'down'
        : cell - path[i] === -size
          ? 'up'
          : cell > path[i]
            ? 'right'
            : 'left',
    );
}
describe('logic activity catalogue and pure validators', () => {
  it('has 24 stable IDs, eight activities per level and at least three distinct variants each', () => {
    expect(LOGIC_ACTIVITIES).toHaveLength(24);
    expect(new Set(LOGIC_ACTIVITIES.map((activity) => activity.id)).size).toBe(24);
    for (const level of [1, 2, 3])
      expect(LOGIC_ACTIVITIES.filter((activity) => activity.difficulty === level)).toHaveLength(8);
    for (const activity of LOGIC_ACTIVITIES) {
      expect(activity.variants.length).toBeGreaterThanOrEqual(3);
      expect(new Set(activity.variants.map((variant) => variant.id)).size).toBe(
        activity.variants.length,
      );
      expect(new Set(activity.variants.map((variant) => JSON.stringify(variant.puzzle))).size).toBe(
        activity.variants.length,
      );
    }
  });
  for (const activity of LOGIC_ACTIVITIES) {
    describe(activity.title, () => {
      for (const variant of activity.variants) {
        const p = variant.puzzle;
        it(`${variant.id}: accepts a complete solution and rejects an initial or foreign answer`, () => {
          expect(checkAnswer(p, solution(p))).toBe(true);
          expect(isAnswer(p, solution(p))).toBe(true);
          expect(checkAnswer(p, initialAnswer(p))).toBe(false);
          expect(isAnswer(p, initialAnswer(p))).toBe(true);
          expect(checkAnswer(p, { kind: 'code', value: '999' })).toBe(false);
          expect(isAnswer(p, null)).toBe(false);
          expect(isAnswer(p, { kind: p.kind })).toBe(false);
          expect(p.hints).toHaveLength(3);
          expect(new Set(p.hints).size).toBe(3);
          expect(p.explanation.length).toBeGreaterThan(20);
        });
        it(`${variant.id}: rejects incorrect, partial and extraneous selections`, () => {
          const a = solution(p);
          switch (a.kind) {
            case 'choice':
              expect(checkAnswer(p, { ...a, value: 'missing' })).toBe(false);
              if (p.kind === 'choice' && p.reason)
                expect(checkAnswer(p, { ...a, reason: null })).toBe(false);
              break;
            case 'placement': {
              const partial = { ...a.values };
              delete partial[Object.keys(partial)[0]];
              expect(checkAnswer(p, { ...a, values: partial })).toBe(false);
              expect(checkAnswer(p, { ...a, values: { ...a.values, extra: 'red' } })).toBe(false);
              break;
            }
            case 'selection':
            case 'symmetry':
              expect(checkAnswer(p, { ...a, values: a.values.slice(1) } as Answer)).toBe(false);
              expect(checkAnswer(p, { ...a, values: [...a.values, a.values[0]] } as Answer)).toBe(
                false,
              );
              break;
            case 'order':
              expect(checkAnswer(p, { ...a, values: [...a.values].reverse() })).toBe(false);
              break;
            case 'machine':
              expect(checkAnswer(p, { ...a, rule: 'missing' })).toBe(false);
              expect(checkAnswer(p, { ...a, value: a.value! + 1 })).toBe(false);
              break;
            case 'code':
              expect(checkAnswer(p, { ...a, value: String(Number(a.value) + 1) })).toBe(false);
              break;
            case 'combinations':
              expect(checkAnswer(p, { ...a, values: a.values.slice(1) })).toBe(false);
              expect(checkAnswer(p, { ...a, total: '0' })).toBe(false);
              break;
            case 'grid':
              expect(checkAnswer(p, { ...a, commands: [], path: [] })).toBe(false);
              if (p.kind === 'grid')
                expect(
                  checkAnswer(p, {
                    ...a,
                    commands: ['up', 'up', 'up', 'up', 'up', 'up'],
                    path: [p.start, p.goal],
                  }),
                ).toBe(false);
              break;
            case 'stages':
              expect(checkAnswer(p, { ...a, values: a.values.slice(1) })).toBe(false);
              break;
          }
        });
        if (p.kind === 'placement' && p.constraints)
          it(`${variant.id}: clues have exactly one solution`, () => {
            expect(assignmentSolutions(p)).toEqual([p.solution]);
            for (const clue of p.constraints!) {
              expect(
                assignmentSolutions({
                  ...p,
                  constraints: p.constraints!.filter((other) => other !== clue),
                }).length,
              ).toBeGreaterThan(1);
            }
          });
        if (p.kind === 'order' && p.constraints)
          it(`${variant.id}: ordering clues have exactly one solution`, () => {
            const targets = ['0', '1', '2'];
            const valid = permutations(p.items.map((item) => item.id)).filter((ids) =>
              satisfies(
                Object.fromEntries(ids.map((id, i) => [id, targets[i]])),
                targets,
                p.constraints!,
              ),
            );
            expect(valid).toEqual([p.solution]);
          });
        if (p.kind === 'grid')
          it(`${variant.id}: target is reachable and every step respects bounds and walls`, () => {
            const path = findPath(p)!;
            expect(path[0]).toBe(p.start);
            expect(path.at(-1)).toBe(p.goal);
            expect(
              path.every(
                (cell, i) =>
                  cell >= 0 &&
                  cell < p.size ** 2 &&
                  !p.blocked.includes(cell) &&
                  (!i || adjacent(path[i - 1], cell, p.size)),
              ),
            ).toBe(true);
            expect(robotPath(p, directions(path, p.size))).toEqual({ valid: true, path });
          });
        if (p.kind === 'symmetry')
          it(`${variant.id}: reflection has a valid vertical axis and is involutive`, () => {
            expect(p.size % 2).toBe(0);
            expect(p.given.every((cell) => cell % p.size < p.size / 2)).toBe(true);
            expect(reflection({ ...p, given: reflection(p) })).toEqual(p.given);
          });
        if (p.kind === 'machine')
          it(`${variant.id}: examples uniquely identify a displayed rule and stay in range`, () => {
            for (const input of [1, 2, 3, 4, 5, 6, p.input])
              expect(
                machineSteps(p, input).every((n) => Number.isInteger(n) && n >= 0 && n <= 24),
              ).toBe(true);
            expect(new Set(p.options).size).toBe(p.options.length);
            expect(p.options).toContain(machineSteps(p, p.input).at(-1));
          });
        if (p.kind === 'placement' && p.layout === 'venn')
          it(`${variant.id}: all four Venn regions are represented`, () => {
            expect(new Set(Object.values(p.solution)).size).toBe(4);
            const targetColour = p.items[0].colour;
            for (const item of p.items)
              expect(p.solution[item.id]).toBe(
                item.colour === targetColour
                  ? item.shape === 'circle'
                    ? 'both'
                    : 'left'
                  : item.shape === 'circle'
                    ? 'right'
                    : 'outside',
              );
          });
      }
    });
  }
  it('does not wrap horizontally and rejects an unreachable board', () => {
    expect(adjacent(3, 4, 4)).toBe(false);
    expect(
      findPath({
        kind: 'grid',
        mode: 'path',
        size: 3,
        start: 0,
        goal: 8,
        blocked: [1, 3],
        instructions: '',
        hints: ['', '', ''],
        explanation: '',
      }),
    ).toBeNull();
  });
  it('tests all three filter conditions, with a distractor for each condition', () => {
    for (const variant of LOGIC_ACTIVITIES[21].variants) {
      const p = variant.puzzle;
      if (p.kind !== 'selection') throw new Error('Expected selection');
      const requiredShape = p.items[0].shape;
      expect(
        p.items
          .filter((item) => item.shape === requiredShape && item.small && item.colour !== 'red')
          .map((item) => item.id),
      ).toEqual(p.solution);
      expect(
        p.items.some((item) => item.shape === requiredShape && item.small && item.colour === 'red'),
      ).toBe(true);
      expect(
        p.items.some(
          (item) => item.shape === requiredShape && !item.small && item.colour !== 'red',
        ),
      ).toBe(true);
      expect(
        p.items.some((item) => item.shape !== requiredShape && item.small && item.colour !== 'red'),
      ).toBe(true);
    }
  });
});
