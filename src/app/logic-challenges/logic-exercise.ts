export type Difficulty = 1 | 2 | 3;
export type Shape = 'circle' | 'triangle' | 'square' | 'star';
export type Colour = 'red' | 'blue' | 'green' | 'yellow';
export type LogicIconName =
  | 'search'
  | 'compass'
  | 'castle'
  | 'circle'
  | 'box'
  | 'footprints'
  | 'scale'
  | 'mirror'
  | 'house'
  | 'settings'
  | 'target'
  | 'venn'
  | 'bridge'
  | 'bot'
  | 'binary'
  | 'palette'
  | 'blocks'
  | 'sparkles'
  | 'paw'
  | 'wrench'
  | 'map'
  | 'key'
  | 'sequence'
  | 'crown'
  | 'shirt'
  | 'fox'
  | 'cat'
  | 'rabbit'
  | 'dog'
  | 'hat'
  | 'hard-hat'
  | 'chef-hat'
  | 'apple'
  | 'banana'
  | 'lightbulb'
  | 'flag'
  | 'star'
  | 'wall';
export interface Tile {
  readonly id: string;
  readonly label: string;
  readonly shape?: Shape;
  readonly colour?: Colour;
  readonly small?: boolean;
  readonly icon?: LogicIconName;
  readonly height?: number;
}
export type Hints = readonly [string, string, string];
interface PuzzleBase {
  readonly instructions: string;
  readonly hints: Hints;
  readonly explanation: string;
}
export interface ChoicePuzzle extends PuzzleBase {
  readonly kind: 'choice';
  readonly display: readonly Tile[];
  readonly options: readonly Tile[];
  readonly solution: string;
  readonly reasons?: readonly Tile[];
  readonly reason?: string;
  readonly balance?: boolean;
  readonly equations?: readonly { readonly left: readonly Tile[]; readonly total: number }[];
}
export interface PlacementPuzzle extends PuzzleBase {
  readonly kind: 'placement';
  readonly layout: 'boxes' | 'venn' | 'logic';
  readonly items: readonly Tile[];
  readonly targets: readonly Tile[];
  readonly solution: Readonly<Record<string, string>>;
  readonly clues: readonly string[];
  readonly constraints?: readonly Constraint[];
  readonly exclusive: boolean;
}
export type Constraint =
  | { readonly type: 'at' | 'not-at'; readonly item: string; readonly target: string }
  | { readonly type: 'before'; readonly item: string; readonly other: string };
export interface SelectionPuzzle extends PuzzleBase {
  readonly kind: 'selection';
  readonly items: readonly Tile[];
  readonly solution: readonly string[];
}
export interface OrderPuzzle extends PuzzleBase {
  readonly kind: 'order';
  readonly items: readonly Tile[];
  readonly solution: readonly string[];
  readonly clues: readonly string[];
  readonly constraints?: readonly Constraint[];
}
export interface SymmetryPuzzle extends PuzzleBase {
  readonly kind: 'symmetry';
  readonly size: number;
  readonly given: readonly number[];
}
export type Direction = 'up' | 'down' | 'left' | 'right';
export interface GridPuzzle extends PuzzleBase {
  readonly kind: 'grid';
  readonly mode: 'robot' | 'path';
  readonly size: number;
  readonly start: number;
  readonly goal: number;
  readonly blocked: readonly number[];
}
export interface MachinePuzzle extends PuzzleBase {
  readonly kind: 'machine';
  readonly steps: readonly { readonly operation: 'add' | 'multiply'; readonly value: number }[];
  readonly examples: readonly number[];
  readonly input: number;
  readonly rules: readonly Tile[];
  readonly rule: string;
  readonly options: readonly number[];
  readonly showSteps: boolean;
}
export interface CodePuzzle extends PuzzleBase {
  readonly kind: 'code';
  readonly key: readonly { readonly tile: Tile; readonly value: number }[];
  readonly terms: readonly string[];
}
export interface CombinationPuzzle extends PuzzleBase {
  readonly kind: 'combinations';
  readonly hats: readonly Tile[];
  readonly shirts: readonly Tile[];
}
export interface StagesPuzzle extends PuzzleBase {
  readonly kind: 'stages';
  readonly stages: readonly ChoicePuzzle[];
}
export type Puzzle =
  | ChoicePuzzle
  | PlacementPuzzle
  | SelectionPuzzle
  | OrderPuzzle
  | SymmetryPuzzle
  | GridPuzzle
  | MachinePuzzle
  | CodePuzzle
  | CombinationPuzzle
  | StagesPuzzle;
export type Answer =
  | { kind: 'choice'; value: string | null; reason: string | null }
  | { kind: 'placement'; values: Record<string, string> }
  | { kind: 'selection'; values: string[] }
  | { kind: 'order'; values: string[] }
  | { kind: 'symmetry'; values: number[] }
  | { kind: 'grid'; commands: Direction[]; path: number[] }
  | { kind: 'machine'; value: number | null; rule: string | null }
  | { kind: 'code'; value: string }
  | { kind: 'combinations'; values: string[]; total: string }
  | { kind: 'stages'; stage: number; values: (string | null)[] };
export interface Variant {
  readonly id: string;
  readonly puzzle: Puzzle;
}
export interface Activity {
  readonly id: string;
  readonly title: string;
  readonly objective: string;
  readonly difficulty: Difficulty;
  readonly icon: LogicIconName;
  readonly variants: readonly Variant[];
}
export const LEVELS = [
  {
    id: 1 as const,
    name: 'Explorador',
    icon: 'search' as const,
    description: 'Descubre reglas y encuentra pistas.',
  },
  {
    id: 2 as const,
    name: 'Detective',
    icon: 'compass' as const,
    description: 'Une las pistas y prueba tus ideas.',
  },
  {
    id: 3 as const,
    name: 'Maestro de lógica',
    icon: 'castle' as const,
    description: 'Resuelve misterios paso a paso.',
  },
];
