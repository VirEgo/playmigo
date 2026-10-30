import { expect, test } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readQuizBank } from './quiz-fixture';

test('fresh tests vary numbers, preserve the exact bank on reload, and retain filters', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('column-operation')).toBeVisible();
  const firstBank = await readQuizBank(page);
  expect(firstBank).toHaveLength(50);
  expect(firstBank[0].id).toMatch(/^gen-/);
  await page.getByRole('button', { name: firstBank[0].correctAnswer, exact: true }).click();
  await page.getByRole('button', { name: 'Comprobar respuesta' }).click();
  await page.reload();
  await expect(page.getByTestId('feedback')).toContainText('¡Muy bien!');
  expect(await readQuizBank(page)).toEqual(firstBank);
  await page.getByRole('button', { name: 'Volver a empezar' }).click();
  const secondBank = await readQuizBank(page);
  expect(secondBank).not.toEqual(firstBank);
  expect(
    secondBank.filter(
      (question, index) =>
        JSON.stringify(question.operation) !== JSON.stringify(firstBank[index].operation),
    ).length,
  ).toBeGreaterThan(20);
  await page.reload();
  expect(await readQuizBank(page)).toEqual(secondBank);
  await page.getByRole('button', { name: 'Configurar el test' }).click();
  await page.getByRole('button', { name: 'Quitar todo' }).click();
  await expect(page.getByText('Selecciona al menos un tipo de ejercicio.')).toBeVisible();
  await page.getByRole('checkbox', { name: 'Sumas', exact: true }).check();
  await page.getByRole('button', { name: 'Aplicar y empezar' }).click();
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 1 de 10');
  await page.getByRole('button', { name: 'Volver a empezar' }).click();
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 1 de 10');
  await page.screenshot({
    path: join(tmpdir(), 'child-trainer-varied-question.png'),
    fullPage: true,
    animations: 'disabled',
  });
});

test('LM Studio being stopped does not prevent the ordinary quiz', async ({ page }) => {
  await page.route('**/api/lm-studio/v1/models', (route) =>
    route.fulfill({
      status: 502,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'offline' }),
    }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Configurar el test' }).click();
  await page.getByText('Problemas con LM Studio · opcional', { exact: true }).click();
  await page.getByRole('button', { name: 'Comprobar conexión', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('No se pudo conectar.');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  const first = (await readQuizBank(page))[0];
  await page.getByRole('button', { name: first.correctAnswer, exact: true }).click();
  await page.getByRole('button', { name: 'Comprobar respuesta' }).click();
  await expect(page.getByTestId('feedback')).toContainText('¡Muy bien!');
});

test('local story controls fit a small screen and apply validated contexts', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') errors.push(message.text());
  });
  page.on('requestfailed', (request) => errors.push(request.url()));
  await page.setViewportSize({ width: 320, height: 740 });
  await page.route('**/api/lm-studio/v1/models', (route) =>
    route.fulfill({ json: { data: [{ id: 'modelo-de-prueba' }] } }),
  );
  await page.route('**/api/lm-studio/v1/chat/completions', (route) => {
    expect(route.request().postDataJSON().reasoning_effort).toBe('none');
    return route.fulfill({
      json: {
        choices: [
          {
            message: {
              content: JSON.stringify({
                contexts: [
                  { name: 'Lucía', objects: 'pelotas', gender: 'f' },
                  { name: 'Hugo', objects: 'coches', gender: 'm' },
                  { name: 'Sofía', objects: 'muñecas', gender: 'f' },
                  { name: 'Diego', objects: 'cromos', gender: 'm' },
                  { name: 'Elena', objects: 'canicas', gender: 'f' },
                ],
              }),
            },
          },
        ],
      },
    });
  });
  await page.goto('/');
  await expect(page).toHaveTitle(/matemáticas/);
  const before = await readQuizBank(page);
  await page.getByRole('button', { name: 'Configurar el test' }).click();
  await page.getByText('Problemas con LM Studio · opcional', { exact: true }).click();
  await page.getByRole('button', { name: 'Comprobar conexión', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('LM Studio conectado.');
  await page.getByRole('button', { name: 'Crear problemas nuevos', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText(
    'Los nuevos problemas ya están preparados y guardados.',
  );
  const bank = await readQuizBank(page);
  expect(bank.filter((question) => question.category === 'word-problem')[0].question).toContain(
    'Lucía',
  );
  for (const [index, question] of bank.entries()) {
    expect(question.correctAnswer).toBe(before[index].correctAnswer);
    expect(question.options).toEqual(before[index].options);
    expect(question.operation).toEqual(before[index].operation);
  }
  const dialog = page.getByRole('dialog');
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({
    path: join(tmpdir(), 'child-trainer-lm-studio-mobile.png'),
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Continuar el test', exact: true }).click();
  await page.reload();
  expect(await readQuizBank(page)).toEqual(bank);
  expect(errors).toEqual([]);
});
