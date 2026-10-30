import { MathQuestionCategory } from './math-question';

export const QUIZ_CATEGORIES = [
  { id: 'addition', label: 'Sumas' },
  { id: 'subtraction', label: 'Restas' },
  { id: 'multiplication', label: 'Multiplicaciones' },
  { id: 'division', label: 'Divisiones' },
  { id: 'comparison', label: 'Comparar números' },
  { id: 'word-problem', label: 'Problemas de sumas y restas' },
  { id: 'geometry', label: 'Figuras y medidas' },
] as const satisfies readonly {
  readonly id: MathQuestionCategory;
  readonly label: string;
}[];

export const ALL_CATEGORIES: readonly MathQuestionCategory[] = QUIZ_CATEGORIES.map(
  (category) => category.id,
);
