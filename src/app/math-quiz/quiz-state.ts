import { MathQuestion, MathQuestionCategory } from './math-question';

export interface QuestionResult {
  readonly questionId: string;
  readonly selectedAnswer: string;
  readonly isCorrect: boolean;
}

export interface QuizState {
  readonly currentQuestionIndex: number;
  readonly selectedAnswer: string | null;
  readonly phase: 'answering' | 'checked' | 'completed';
  readonly results: readonly QuestionResult[];
}

export interface QuizSession {
  readonly questions: readonly MathQuestion[];
  readonly enabledCategories: readonly MathQuestionCategory[];
  readonly state: QuizState;
}

export function createInitialQuizState(): QuizState {
  return {
    currentQuestionIndex: 0,
    selectedAnswer: null,
    phase: 'answering',
    results: [],
  };
}
