import { expect, test } from '@playwright/test';
import { readQuizBank, seedLegacyQuiz } from './quiz-fixture';

test.beforeEach(async ({ page }) => seedLegacyQuiz(page));

test('settings cancel keeps progress; applying sums filters and completes a ten-question test', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('requestfailed', (request) => errors.push(request.url()));
  await page.goto('/');
  await page.getByRole('button', { name: '17', exact: true }).click();
  await page.getByRole('button', { name: 'Comprobar respuesta' }).click();
  await page.getByRole('button', { name: 'Configurar el test' }).click();
  const dialog = page.getByRole('dialog', { name: 'Configurar el test' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('checkbox')).toHaveCount(7);
  await dialog.getByRole('button', { name: 'Quitar todo' }).click();
  await expect(dialog.getByText('Selecciona al menos un tipo de ejercicio.')).toBeVisible();
  await expect(dialog.getByText('Selecciona al menos un tipo de ejercicio.')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Aplicar y empezar' })).toBeDisabled();
  await dialog.getByRole('checkbox', { name: 'Sumas', exact: true }).check();
  await expect(dialog.getByTestId('settings-question-count')).toHaveText('10 preguntas');
  await expect(
    dialog.getByText('Al cambiar los ejercicios, el test empieza de nuevo.'),
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId('score')).toHaveText('Aciertos: 1');
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 1 de 50');
  await expect(page.getByRole('button', { name: 'Siguiente pregunta' })).toBeVisible();

  await page.getByRole('button', { name: 'Configurar el test' }).click();
  await dialog.getByRole('button', { name: 'Quitar todo' }).click();
  await expect(dialog.getByText('Selecciona al menos un tipo de ejercicio.')).toBeVisible();
  await dialog.getByRole('checkbox', { name: 'Sumas', exact: true }).check();
  await dialog.getByRole('button', { name: 'Aplicar y empezar' }).click();
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 1 de 10');
  await expect(page.getByTestId('score')).toHaveText('Aciertos: 0');
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('math-quiz-session-v1')!),
  );
  expect(saved.version).toBe(3);
  expect(saved.enabledCategories).toEqual(['addition']);
  await page.reload();
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 1 de 10');
  const sums = (await readQuizBank(page)).filter((question) => question.category === 'addition');
  for (const [index, question] of sums.entries()) {
    await expect(page.getByTestId('question-number')).toHaveText(`Pregunta ${index + 1} de 10`);
    await expect(page.getByTestId('column-operation')).toHaveAttribute(
      'aria-label',
      new RegExp(`${question.operation!.top} más ${question.operation!.bottom}`),
    );
    await page
      .getByRole('group', { name: 'Elige una respuesta' })
      .getByRole('button', { name: question.correctAnswer, exact: true })
      .click();
    await page.getByRole('button', { name: 'Comprobar respuesta' }).click();
    await expect(page.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      String((index + 1) * 10),
    );
    await page
      .getByRole('button', { name: index === 9 ? 'Ver mis resultados' : 'Siguiente pregunta' })
      .click();
  }
  await expect(page.getByRole('heading', { name: '¡Has completado el reto!' })).toBeVisible();
  await expect(page.locator('.results-score')).toContainText('10Aciertos');
  await expect(page.locator('.results-score')).toContainText('100%');
  await page.reload();
  await expect(page.getByRole('heading', { name: '¡Has completado el reto!' })).toBeVisible();
  await page.locator('app-quiz-results').getByRole('button', { name: 'Volver a empezar' }).click();
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 1 de 10');
  await page.reload();
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 1 de 10');
  expect(errors).toEqual([]);
});

test('mixed selection restores progress; Escape and unchanged settings preserve the session', async ({
  page,
}) => {
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Configurar el test' });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Quitar todo' }).click();
  await expect(dialog.getByText('Selecciona al menos un tipo de ejercicio.')).toBeVisible();
  await dialog.getByRole('checkbox', { name: 'Restas', exact: true }).check();
  await dialog.getByRole('checkbox', { name: 'Divisiones', exact: true }).check();
  await expect(dialog.getByTestId('settings-question-count')).toHaveText('15 preguntas');
  await dialog.getByRole('button', { name: 'Aplicar y empezar' }).click();
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 1 de 15');
  const activeQuestions = (await readQuizBank(page)).filter((question) =>
    ['subtraction', 'division'].includes(question.category),
  );
  await expect(page.getByTestId('column-operation')).toHaveAttribute('aria-label', /menos/);
  await page.getByRole('button', { name: activeQuestions[0].correctAnswer, exact: true }).click();
  await page.getByRole('button', { name: 'Comprobar respuesta' }).click();
  await page.getByRole('button', { name: 'Siguiente pregunta' }).click();
  await page.reload();
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 2 de 15');
  await expect(page.getByTestId('column-operation')).toHaveAttribute(
    'aria-label',
    /dividido entre/,
  );
  await trigger.click();
  await dialog.getByRole('button', { name: 'Seleccionar todo' }).click();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 2 de 15');
  await trigger.click();
  await expect(dialog.getByRole('checkbox', { name: 'Sumas', exact: true })).not.toBeChecked();
  await expect(dialog.getByRole('checkbox', { name: 'Restas', exact: true })).toBeChecked();
  await dialog.getByRole('button', { name: 'Continuar el test' }).click();
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 2 de 15');
  await expect(page.getByTestId('score')).toHaveText('Aciertos: 1');
});

for (const width of [1440, 390, 320]) {
  test(`settings are usable and keyboard focus stays in the dialog at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Configurar el test' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const bounds = await dialog.boundingBox();
    expect(bounds!.width).toBeLessThan(width);
    expect(bounds!.height).toBeLessThanOrEqual(860);
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `docs/qa/settings-${width}.png`, animations: 'disabled' });
    await dialog.getByRole('button', { name: 'Quitar todo' }).click();
    await expect(dialog.getByText('Selecciona al menos un tipo de ejercicio.')).toBeVisible();
    await dialog.getByRole('checkbox', { name: 'Multiplicaciones', exact: true }).check();
    await expect(dialog.getByTestId('settings-question-count')).toHaveText('10 preguntas');
    await expect(dialog.getByRole('button', { name: 'Aplicar y empezar' })).toBeEnabled();
    await dialog.getByRole('button', { name: 'Aplicar y empezar' }).focus();
    await page.keyboard.press('Tab');
    expect(
      await page.evaluate(() => document.querySelector('dialog')!.contains(document.activeElement)),
    ).toBe(true);
    await dialog.getByRole('button', { name: 'Aplicar y empezar' }).click();
    await expect(page.getByTestId('question-number')).toHaveText('Pregunta 1 de 10');
    await expect(page.getByTestId('column-operation')).toHaveAttribute('aria-label', /por/);
    await page.screenshot({
      path: `docs/qa/settings-applied-${width}.png`,
      fullPage: true,
      animations: 'disabled',
    });
  });
}
