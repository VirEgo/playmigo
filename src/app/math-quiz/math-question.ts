export type MathQuestionCategory =
  | 'addition'
  | 'subtraction'
  | 'multiplication'
  | 'division'
  | 'comparison'
  | 'word-problem'
  | 'geometry';

export interface WrittenOperation {
  readonly top: number;
  readonly bottom: number;
  readonly operator: '+' | '−' | '×' | '÷';
}

export interface MathQuestion {
  readonly id: string;
  readonly category: MathQuestionCategory;
  readonly instruction: string;
  readonly question: string;
  readonly options: readonly [string, string, string];
  readonly correctAnswer: string;
  readonly explanation: string;
  readonly difficulty: 1 | 2 | 3;
  readonly operation?: WrittenOperation;
}
