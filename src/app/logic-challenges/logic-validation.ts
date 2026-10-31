import {
  Answer,
  Constraint,
  Direction,
  GridPuzzle,
  MachinePuzzle,
  PlacementPuzzle,
  Puzzle,
  SymmetryPuzzle,
} from './logic-exercise';

export function initialAnswer(puzzle: Puzzle): Answer {
  switch (puzzle.kind) {
    case 'choice':
      return { kind: 'choice', value: null, reason: null };
    case 'placement':
      return { kind: 'placement', values: {} };
    case 'selection':
      return { kind: 'selection', values: [] };
    case 'order':
      return { kind: 'order', values: puzzle.items.map((item) => item.id) };
    case 'symmetry':
      return { kind: 'symmetry', values: [] };
    case 'grid':
      return { kind: 'grid', commands: [], path: [puzzle.start] };
    case 'machine':
      return { kind: 'machine', value: null, rule: null };
    case 'code':
      return { kind: 'code', value: '' };
    case 'combinations':
      return { kind: 'combinations', values: [], total: '' };
    case 'stages':
      return { kind: 'stages', stage: 0, values: puzzle.stages.map(() => null) };
  }
}
export function sameSet<T>(actual: readonly T[], expected: readonly T[]): boolean {
  return (
    actual.length === expected.length &&
    new Set(actual).size === actual.length &&
    expected.every((value) => actual.includes(value))
  );
}
export function reflection(puzzle: SymmetryPuzzle): number[] {
  return puzzle.given.map(
    (cell) => Math.floor(cell / puzzle.size) * puzzle.size + puzzle.size - 1 - (cell % puzzle.size),
  );
}
export function machineSteps(puzzle: MachinePuzzle, input: number): number[] {
  return puzzle.steps.reduce<number[]>(
    (values, step) => [
      ...values,
      step.operation === 'add' ? values.at(-1)! + step.value : values.at(-1)! * step.value,
    ],
    [input],
  );
}
export function nextCell(cell: number, direction: Direction, size: number): number | null {
  const row = Math.floor(cell / size) + (direction === 'down' ? 1 : direction === 'up' ? -1 : 0);
  const col = (cell % size) + (direction === 'right' ? 1 : direction === 'left' ? -1 : 0);
  return row >= 0 && row < size && col >= 0 && col < size ? row * size + col : null;
}
export function adjacent(a: number, b: number, size: number): boolean {
  return (
    Math.abs(Math.floor(a / size) - Math.floor(b / size)) + Math.abs((a % size) - (b % size)) === 1
  );
}
export function robotPath(
  puzzle: GridPuzzle,
  commands: readonly Direction[],
): { path: number[]; valid: boolean } {
  const path = [puzzle.start];
  for (const command of commands) {
    const next = nextCell(path.at(-1)!, command, puzzle.size);
    if (next === null || puzzle.blocked.includes(next)) return { path, valid: false };
    path.push(next);
  }
  return { path, valid: true };
}
export function findPath(puzzle: GridPuzzle): number[] | null {
  const queue = [[puzzle.start]];
  const seen = new Set([puzzle.start]);
  for (let i = 0; i < queue.length; i++) {
    const path = queue[i];
    if (path.at(-1) === puzzle.goal) return path;
    for (const direction of ['up', 'down', 'left', 'right'] as const) {
      const next = nextCell(path.at(-1)!, direction, puzzle.size);
      if (next !== null && !puzzle.blocked.includes(next) && !seen.has(next)) {
        seen.add(next);
        queue.push([...path, next]);
      }
    }
  }
  return null;
}
export function combinationIds(puzzle: Extract<Puzzle, { kind: 'combinations' }>): string[] {
  return puzzle.hats.flatMap((hat) => puzzle.shirts.map((shirt) => `${hat.id}:${shirt.id}`));
}
export function checkAnswer(puzzle: Puzzle, answer: Answer): boolean {
  if (puzzle.kind !== answer.kind) return false;
  switch (puzzle.kind) {
    case 'choice':
      return (
        answer.kind === 'choice' &&
        answer.value === puzzle.solution &&
        (!puzzle.reason || answer.reason === puzzle.reason)
      );
    case 'placement':
      return (
        answer.kind === 'placement' &&
        Object.keys(answer.values).length === puzzle.items.length &&
        puzzle.items.every((item) => answer.values[item.id] === puzzle.solution[item.id])
      );
    case 'selection':
      return answer.kind === 'selection' && sameSet(answer.values, puzzle.solution);
    case 'order':
      return (
        answer.kind === 'order' &&
        answer.values.length === puzzle.solution.length &&
        puzzle.solution.every((id, i) => answer.values[i] === id)
      );
    case 'symmetry':
      return answer.kind === 'symmetry' && sameSet(answer.values, reflection(puzzle));
    case 'grid': {
      if (answer.kind !== 'grid') return false;
      const result =
        puzzle.mode === 'robot'
          ? robotPath(puzzle, answer.commands)
          : { path: answer.path, valid: true };
      return (
        result.valid &&
        result.path[0] === puzzle.start &&
        result.path.at(-1) === puzzle.goal &&
        result.path.every(
          (cell, i) =>
            Number.isInteger(cell) &&
            cell >= 0 &&
            cell < puzzle.size ** 2 &&
            !puzzle.blocked.includes(cell) &&
            (i === 0 || adjacent(result.path[i - 1], cell, puzzle.size)),
        )
      );
    }
    case 'machine':
      return (
        answer.kind === 'machine' &&
        answer.value === machineSteps(puzzle, puzzle.input).at(-1) &&
        answer.rule === puzzle.rule
      );
    case 'code':
      return (
        answer.kind === 'code' &&
        answer.value !== '' &&
        Number(answer.value) ===
          puzzle.terms.reduce(
            (sum, id) => sum + puzzle.key.find((entry) => entry.tile.id === id)!.value,
            0,
          )
      );
    case 'combinations':
      return (
        answer.kind === 'combinations' &&
        sameSet(answer.values, combinationIds(puzzle)) &&
        answer.total !== '' &&
        Number(answer.total) === combinationIds(puzzle).length
      );
    case 'stages':
      return (
        answer.kind === 'stages' &&
        answer.stage === puzzle.stages.length - 1 &&
        answer.values.length === puzzle.stages.length &&
        puzzle.stages.every((stage, i) => stage.solution === answer.values[i])
      );
  }
}
export function permutations<T>(items: readonly T[]): T[][] {
  if (!items.length) return [[]];
  return items.flatMap((item, i) =>
    permutations(items.filter((_, j) => i !== j)).map((rest) => [item, ...rest]),
  );
}
export function satisfies(
  values: Readonly<Record<string, string>>,
  targets: readonly string[],
  constraints: readonly Constraint[],
): boolean {
  return constraints.every((clue) =>
    clue.type === 'before'
      ? targets.indexOf(values[clue.item]) < targets.indexOf(values[clue.other])
      : clue.type === 'at'
        ? values[clue.item] === clue.target
        : values[clue.item] !== clue.target,
  );
}
export function assignmentSolutions(puzzle: PlacementPuzzle): Record<string, string>[] {
  return permutations(puzzle.targets.map((target) => target.id))
    .map((targets) => Object.fromEntries(puzzle.items.map((item, i) => [item.id, targets[i]])))
    .filter((values) =>
      satisfies(
        values,
        puzzle.targets.map((target) => target.id),
        puzzle.constraints ?? [],
      ),
    );
}

/** Validate untrusted localStorage answers without consulting the DOM. */
export function isAnswer(puzzle: Puzzle, value: unknown): value is Answer {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const a = value as Record<string, unknown>;
  if (a['kind'] !== puzzle.kind) return false;
  const strings = (v: unknown): v is string[] =>
    Array.isArray(v) && v.length <= 40 && v.every((item) => typeof item === 'string');
  const numbers = (v: unknown): v is number[] =>
    Array.isArray(v) && v.length <= 100 && v.every((item) => Number.isInteger(item));
  const text = (v: unknown): boolean => typeof v === 'string' && v.length <= 3 && /^\d*$/.test(v);
  switch (puzzle.kind) {
    case 'choice':
      return (
        (a['value'] === null || puzzle.options.some((item) => item.id === a['value'])) &&
        (a['reason'] === null || !!puzzle.reasons?.some((item) => item.id === a['reason']))
      );
    case 'placement':
      return (
        !!a['values'] &&
        typeof a['values'] === 'object' &&
        !Array.isArray(a['values']) &&
        Object.entries(a['values']).every(
          ([key, target]) =>
            puzzle.items.some((item) => item.id === key) &&
            puzzle.targets.some((item) => item.id === target),
        )
      );
    case 'selection':
      return (
        strings(a['values']) &&
        sameSet(a['values'], [...new Set(a['values'])]) &&
        a['values'].every((id) => puzzle.items.some((item) => item.id === id))
      );
    case 'order':
      return (
        strings(a['values']) &&
        sameSet(
          a['values'],
          puzzle.items.map((item) => item.id),
        )
      );
    case 'symmetry':
      return (
        numbers(a['values']) &&
        new Set(a['values']).size === a['values'].length &&
        a['values'].every(
          (cell) => cell >= 0 && cell < puzzle.size ** 2 && cell % puzzle.size >= puzzle.size / 2,
        )
      );
    case 'grid':
      return (
        strings(a['commands']) &&
        a['commands'].every((command) => ['up', 'down', 'left', 'right'].includes(command)) &&
        numbers(a['path']) &&
        a['path'].length > 0 &&
        a['path'][0] === puzzle.start &&
        a['path'].every(
          (cell, i, cells) =>
            cell >= 0 &&
            cell < puzzle.size ** 2 &&
            !puzzle.blocked.includes(cell) &&
            (!i || adjacent(cells[i - 1], cell, puzzle.size)),
        )
      );
    case 'machine':
      return (
        (a['value'] === null || puzzle.options.includes(a['value'] as number)) &&
        (a['rule'] === null || puzzle.rules.some((rule) => rule.id === a['rule']))
      );
    case 'code':
      return text(a['value']);
    case 'combinations':
      return (
        strings(a['values']) &&
        new Set(a['values']).size === a['values'].length &&
        a['values'].every((id) => combinationIds(puzzle).includes(id)) &&
        text(a['total'])
      );
    case 'stages':
      return (
        Number.isInteger(a['stage']) &&
        (a['stage'] as number) >= 0 &&
        (a['stage'] as number) < puzzle.stages.length &&
        Array.isArray(a['values']) &&
        a['values'].length === puzzle.stages.length &&
        a['values'].every(
          (id, i) =>
            (id === null || puzzle.stages[i].options.some((option) => option.id === id)) &&
            (i >= (a['stage'] as number) || id === puzzle.stages[i].solution) &&
            (i <= (a['stage'] as number) || id === null),
        )
      );
  }
}
