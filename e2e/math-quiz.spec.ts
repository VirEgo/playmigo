import { expect, test } from '@playwright/test';
import { MATH_QUESTIONS } from '../src/app/math-quiz/data/math-questions';
import { readQuizBank, seedLegacyQuiz } from './quiz-fixture';

test.beforeEach(async ({ page }) => seedLegacyQuiz(page));

const key = 'math-quiz-session-v1';

test('choose, change, check once, restore, advance and restart', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('requestfailed', (request) =>
    errors.push(`${request.url()}: ${request.failure()?.errorText}`),
  );
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Comprobar respuesta' })).toBeDisabled();
  await page.getByRole('button', { name: '16', exact: true }).click();
  await expect(page.getByTestId('score')).toHaveText('Aciertos: 0');
  await page.getByRole('button', { name: '17', exact: true }).click();
  await expect(page.getByRole('button', { name: '17', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.reload();
  await expect(page.getByRole('button', { name: '17', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Comprobar respuesta' }).click();
  await expect(page.getByTestId('feedback')).toContainText('¡Muy bien!');
  await expect(page.getByTestId('score')).toHaveText('Aciertos: 1');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 1 de 50');
  await expect(page.getByRole('button', { name: '17', exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.getByTestId('score')).toHaveText('Aciertos: 1');
  await expect(page.getByTestId('feedback')).toContainText('¡Muy bien!');
  expect(
    await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).state.results.length, key),
  ).toBe(1);
  await page.getByRole('button', { name: 'Siguiente pregunta' }).click();
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 2 de 50');
  await expect(page.getByRole('button', { name: 'Comprobar respuesta' })).toBeDisabled();
  await page.reload();
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 2 de 50');
  await page.getByRole('button', { name: 'Volver a empezar' }).click();
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 1 de 50');
  await expect(page.getByTestId('score')).toHaveText('Aciertos: 0');
  expect(
    await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).state.results.length, key),
  ).toBe(0);
  expect(errors).toEqual([]);
});

test('all 50 questions, mixed answers, final result and completed-session restore', async ({
  page,
}) => {
  await page.goto('/');
  for (const [index, question] of MATH_QUESTIONS.entries()) {
    await expect(page.getByTestId('question-number')).toHaveText(`Pregunta ${index + 1} de 50`);
    if (question.operation) {
      await expect(page.getByTestId('column-operation')).toBeVisible();
      await expect(page.getByTestId('operation-result')).toHaveText('?');
    }
    const answer =
      index % 5 === 0
        ? question.options.find((option) => option !== question.correctAnswer)!
        : question.correctAnswer;
    await page
      .getByRole('group', { name: 'Elige una respuesta' })
      .getByRole('button', { name: answer, exact: true })
      .click();
    await page.getByRole('button', { name: 'Comprobar respuesta' }).click();
    if (question.operation)
      await expect(page.getByTestId('operation-result')).toHaveText(question.correctAnswer);
    await expect(page.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      String((index + 1) * 2),
    );
    if (index % 5 === 0)
      await expect(page.getByTestId('feedback')).toContainText(
        `La respuesta correcta es ${question.correctAnswer}`,
      );
    if (index === 49) {
      await expect(page.getByTestId('question-number')).toHaveText('Pregunta 50 de 50');
      await expect(page.getByRole('heading', { name: '¡Has completado el reto!' })).toHaveCount(0);
      await page.getByRole('button', { name: 'Ver mis resultados' }).click();
    } else {
      await page.getByRole('button', { name: 'Siguiente pregunta' }).click();
    }
  }
  await expect(page.getByRole('heading', { name: '¡Has completado el reto!' })).toBeVisible();
  const results = page.locator('.results-score');
  await expect(results).toContainText('40Aciertos');
  await expect(results).toContainText('10Por practicar');
  await expect(results).toContainText('80%');
  await page.screenshot({
    path: 'docs/qa/results-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: '¡Has completado el reto!' })).toBeVisible();
  await page.locator('app-quiz-results').getByRole('button', { name: 'Volver a empezar' }).click();
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 1 de 50');
});

test('corrupt and incompatible saved sessions start safely', async ({ page }) => {
  await page.goto('/');
  for (const value of [
    '{invalid json',
    '{"version":99,"state":{}}',
    '{"version":1,"state":{"currentQuestionIndex":-1,"selectedAnswer":null,"phase":"answering","results":[]}}',
  ]) {
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key, value });
    await page.reload();
    await expect(page.getByTestId('question-number')).toHaveText('Pregunta 1 de 50');
    await expect(page.getByTestId('score')).toHaveText('Aciertos: 0');
  }
});

test('narrow mobile handles long questions, measurement options and final results', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/');
  const geometryIndex = MATH_QUESTIONS.findIndex((question) =>
    question.options.some((option) => option.toLowerCase().includes('centímetros')),
  );
  const longQuestionIndex = MATH_QUESTIONS.findIndex(
    (question) => question.category === 'word-problem',
  );
  for (const index of [geometryIndex, longQuestionIndex, 49]) {
    expect(index).toBeGreaterThanOrEqual(0);
    const state = {
      currentQuestionIndex: index,
      selectedAnswer: null,
      phase: 'answering',
      results: MATH_QUESTIONS.slice(0, index).map((question) => ({
        questionId: question.id,
        selectedAnswer: question.correctAnswer,
        isCorrect: true,
      })),
    };
    await page.evaluate(
      ({ key, state }) => localStorage.setItem(key, JSON.stringify({ version: 1, state })),
      { key, state },
    );
    await page.reload();
    await expect(page.getByTestId('question-number')).toHaveText(`Pregunta ${index + 1} de 50`);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  await page
    .getByRole('group', { name: 'Elige una respuesta' })
    .getByRole('button', { name: MATH_QUESTIONS[49].correctAnswer, exact: true })
    .click();
  await page.getByRole('button', { name: 'Comprobar respuesta' }).click();
  await page.getByRole('button', { name: 'Ver mis resultados' }).click();
  await expect(page.getByRole('heading', { name: '¡Has completado el reto!' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({
    path: 'docs/qa/results-320.png',
    fullPage: true,
    animations: 'disabled',
  });
});

test('keyboard controls preserve selection and show a visible focus outline', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Volver a empezar' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Configurar el test' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Matemáticas' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Animals · Valencià' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Retos de lógica' })).toBeFocused();
  await page.keyboard.press('Tab');
  const first = page.getByRole('button', { name: '16', exact: true });
  await expect(first).toBeFocused();
  expect(await first.evaluate((button) => getComputedStyle(button).outlineStyle)).toBe('solid');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: '17', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('feedback')).toContainText('¡Muy bien!');
});

for (const width of [1440, 1024, 768, 390, 320]) {
  test(`layout and feedback at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const answers = page.locator('.answer');
    const topDigit = await page.getByTestId('top-operand').locator('.digit').last().boundingBox();
    const bottomDigit = await page
      .getByTestId('bottom-operand')
      .locator('.digit')
      .last()
      .boundingBox();
    expect(topDigit!.x).toBeCloseTo(bottomDigit!.x, 1);
    expect(topDigit!.y).toBeLessThan(bottomDigit!.y);
    await expect(page.getByTestId('operation-result')).toHaveText('?');
    const first = await answers.nth(0).boundingBox();
    const second = await answers.nth(1).boundingBox();
    expect(first!.height).toBeGreaterThanOrEqual(44);
    if (width < 600) expect(second!.y).toBeGreaterThan(first!.y);
    else expect(second!.y).toBe(first!.y);
    await page.screenshot({ path: `docs/qa/initial-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: '17', exact: true }).click();
    await page.screenshot({ path: `docs/qa/selected-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Comprobar respuesta' }).click();
    await expect(page.getByTestId('feedback')).toContainText('¡Muy bien!');
    await page.screenshot({ path: `docs/qa/correct-${width}.png`, fullPage: true });
    const resultDigit = await page
      .getByTestId('operation-result')
      .locator('.digit')
      .last()
      .boundingBox();
    expect(resultDigit!.x).toBeCloseTo(bottomDigit!.x, 1);
    await page.getByRole('button', { name: 'Volver a empezar' }).click();
    const newQuestion = (await readQuizBank(page))[0];
    const wrongAnswer = newQuestion.options.find((option) => option !== newQuestion.correctAnswer)!;
    await page.getByRole('button', { name: wrongAnswer, exact: true }).click();
    await page.getByRole('button', { name: 'Comprobar respuesta' }).click();
    await expect(page.getByTestId('feedback')).toContainText(
      `La respuesta correcta es ${newQuestion.correctAnswer}`,
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: `docs/qa/incorrect-${width}.png`, fullPage: true });
  });
}
