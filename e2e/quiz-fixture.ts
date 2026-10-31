import { Page } from '@playwright/test';
import { ALL_CATEGORIES } from '../src/app/math-quiz/quiz-categories';
import { MathQuestion } from '../src/app/math-quiz/math-question';

// Existing flow tests also verify migration of a previously saved static session.
export async function seedLegacyQuiz(page: Page): Promise<void> {
  await page.addInitScript((categories) => {
    if (!localStorage.getItem('math-quiz-session-v1')) {
      localStorage.setItem(
        'math-quiz-session-v1',
        JSON.stringify({
          version: 2,
          enabledCategories: categories,
          state: {
            currentQuestionIndex: 0,
            selectedAnswer: null,
            phase: 'answering',
            results: [],
          },
        }),
      );
    }
  }, ALL_CATEGORIES);
}

export async function readQuizBank(page: Page): Promise<readonly MathQuestion[]> {
  await page.waitForFunction(() => {
    const saved = localStorage.getItem('math-quiz-session-v1');
    return saved !== null && Array.isArray(JSON.parse(saved).questions);
  });
  return page.evaluate(
    () => JSON.parse(localStorage.getItem('math-quiz-session-v1')!).questions as MathQuestion[],
  );
}
