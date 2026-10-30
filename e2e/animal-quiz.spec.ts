import { expect, test } from '@playwright/test';
import { ANIMALS } from '../src/app/animal-quiz/data/animals';
import { captureErrors, readSession, expectAnimalImage } from './animal-fixture';

test('switches modes and preserves both independent sessions', async ({ page }) => {
  const errors = captureErrors(page);
  await page.goto('/');
  await page.locator('.answer').first().click();
  await page.getByRole('button', { name: 'Comprobar respuesta' }).click();
  const savedMath = await page.evaluate(() => localStorage.getItem('math-quiz-session-v1'));
  await page.getByRole('link', { name: 'Animals · Valencià' }).click();
  await expect(page).toHaveURL(/\/animals$/);
  await expect(page).toHaveTitle('Un viatge pel món dels animals · Valencià');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ca-valencia');
  await expect(page.getByRole('link', { name: 'Animals · Valencià' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 1 de 30');
  await expectAnimalImage(page, (await readSession(page)).questions[0].id);
  await page.locator('.answer').first().click();
  await page.getByRole('button', { name: 'Comprovar resposta' }).click();
  const savedAnimals = await readSession(page);
  await page.getByRole('link', { name: 'Matemáticas' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.getByTestId('feedback')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('math-quiz-session-v1'))).toBe(savedMath);
  await page.getByRole('link', { name: 'Animals · Valencià' }).click();
  await expect(page.getByTestId('feedback')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('feedback')).toBeVisible();
  expect(await readSession(page)).toEqual(savedAnimals);
  expect(errors).toEqual([]);
});

test('selects, changes, restores, checks once, advances and restarts', async ({ page }) => {
  const errors = captureErrors(page);
  await page.goto('/animals');
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 1 de 30');
  const original = await readSession(page);
  const animal = ANIMALS.find((entry) => entry.id === original.questions[0].id)!;
  await expectAnimalImage(page, animal.id);
  await expect(page.locator('.animal-picture img')).toHaveAttribute(
    'alt',
    'Animal per identificar',
  );
  const answers = page.getByRole('group', { name: 'Tria una resposta' }).getByRole('button');
  await expect(answers).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Comprovar resposta' })).toBeDisabled();
  const wrong = original.questions[0].options.find((option) => option !== animal.name)!;
  await page.getByRole('button', { name: wrong, exact: true }).click();
  await page.getByRole('button', { name: animal.name, exact: true }).click();
  await expect(page.getByTestId('score')).toHaveText('Encerts: 0');
  await page.reload();
  expect((await readSession(page)).questions).toEqual(original.questions);
  await expect(page.getByRole('button', { name: animal.name, exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Comprovar resposta' }).click();
  await expect(page.getByTestId('feedback')).toContainText('Molt bé!');
  await expect(page.getByTestId('score')).toHaveText('Encerts: 1');
  await expect(page.locator('.animal-picture img')).toHaveAttribute('alt', animal.name);
  for (const answer of await answers.all()) await expect(answer).toBeDisabled();
  await page.reload();
  await expect(page.getByTestId('score')).toHaveText('Encerts: 1');
  expect((await readSession(page)).answers).toHaveLength(1);
  await page.getByRole('button', { name: 'Següent animal' }).click();
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 2 de 30');
  await expectAnimalImage(page, original.questions[1].id);
  await expect(page.getByRole('button', { name: 'Comprovar resposta' })).toBeDisabled();
  await page.getByRole('button', { name: 'Tornar a començar' }).click();
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 1 de 30');
  await expect(page.getByTestId('score')).toHaveText('Encerts: 0');
  expect((await readSession(page)).answers).toEqual([]);
  expect(errors).toEqual([]);
});

test('completes exactly 30 questions, checks mixed answers and restores final results', async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors = captureErrors(page);
  await page.goto('/animals');
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 1 de 30');
  const session = await readSession(page);
  expect(new Set(session.questions.map((question) => question.id)).size).toBe(30);
  for (const [index, question] of session.questions.entries()) {
    const animal = ANIMALS.find((entry) => entry.id === question.id)!;
    await expect(page.getByTestId('question-number')).toHaveText(`Pregunta ${index + 1} de 30`);
    await expectAnimalImage(page, animal.id);
    await expect(
      page.getByRole('group', { name: 'Tria una resposta' }).getByRole('button'),
    ).toHaveCount(3);
    const answer =
      index % 5 === 0 ? question.options.find((option) => option !== animal.name)! : animal.name;
    await page.getByRole('button', { name: answer, exact: true }).click();
    await page.getByRole('button', { name: 'Comprovar resposta' }).click();
    await expect(page.getByTestId('feedback')).toContainText(animal.name);
    if (index % 5 === 0)
      await expect(page.getByTestId('feedback')).toContainText('La resposta correcta és');
    if (index === session.questions.length - 1) {
      await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
      await expect(page.getByRole('heading', { name: 'Has completat el repte!' })).toHaveCount(0);
      await page.getByRole('button', { name: 'Veure els resultats' }).click();
    } else await page.getByRole('button', { name: 'Següent animal' }).click();
  }
  await expect(page.getByRole('heading', { name: 'Has completat el repte!' })).toBeVisible();
  const results = page.locator('.results-score');
  await expect(results).toContainText('24Encerts');
  await expect(results).toContainText('6Per practicar');
  await expect(results).toContainText('80%');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Has completat el repte!' })).toBeVisible();
  await page.locator('.results-card').getByRole('button', { name: 'Tornar a començar' }).click();
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 1 de 30');
  expect(errors).toEqual([]);
});

test('loads all 37 added animals with their Valencian names and three answer options', async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors = captureErrors(page);
  const addedAnimals = ANIMALS.slice(55);
  expect(ANIMALS).toHaveLength(92);
  expect(addedAnimals).toHaveLength(37);
  expect(new Set(ANIMALS.map((animal) => animal.id)).size).toBe(92);
  expect(new Set(ANIMALS.map((animal) => animal.image)).size).toBe(92);
  await page.goto('/animals');
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 1 de 30');

  for (let offset = 0; offset < addedAnimals.length; offset += 30) {
    const targets = addedAnimals.slice(offset, offset + 30);
    const bank = [...targets, ...ANIMALS.slice(0, 30 - targets.length)];
    const questions = bank.map((animal) => ({
      id: animal.id,
      options: [
        animal.name,
        ...ANIMALS.filter((other) => other.group === animal.group && other.id !== animal.id)
          .slice(0, 2)
          .map((other) => other.name),
      ],
    }));
    await page.evaluate((questions) => {
      localStorage.setItem(
        'animal-quiz-session-v1',
        JSON.stringify({
          version: 1,
          questions,
          index: 0,
          selected: null,
          answers: [],
          phase: 'answering',
        }),
      );
    }, questions);
    await page.reload();
    for (const [index, animal] of targets.entries()) {
      await expect(page.getByTestId('question-number')).toHaveText(`Pregunta ${index + 1} de 30`);
      await expectAnimalImage(page, animal.id);
      await expect(
        page.getByRole('group', { name: 'Tria una resposta' }).getByRole('button'),
      ).toHaveCount(3);
      await page.getByRole('button', { name: animal.name, exact: true }).click();
      await page.getByRole('button', { name: 'Comprovar resposta' }).click();
      await expect(page.getByTestId('feedback')).toContainText(animal.name);
      await expect(page.locator('.answer.correct')).toContainText(animal.name);
      if (index + 1 < targets.length)
        await page.getByRole('button', { name: 'Següent animal' }).click();
    }
  }
  expect(errors).toEqual([]);
});

test('reveals the correct option after a mistake, preserves it on reload and clears it on next', async ({
  page,
}) => {
  const errors = captureErrors(page);
  await page.goto('/animals');
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 1 de 30');
  const session = await readSession(page);
  const animal = ANIMALS.find((entry) => entry.id === session.questions[0].id)!;
  const wrong = session.questions[0].options.find((option) => option !== animal.name)!;
  await expect(page.locator('.answer.correct')).toHaveCount(0);
  await page.getByRole('button', { name: wrong, exact: true }).click();
  await expect(page.locator('.answer.correct')).toHaveCount(0);
  await page.getByRole('button', { name: 'Comprovar resposta' }).click();
  await expect(page.locator('.answer.correct')).toHaveCount(1);
  await expect(page.locator('.answer.correct')).toContainText(animal.name);
  await expect(page.locator('.answer.correct')).toContainText('Resposta correcta');
  await expect(page.locator('.answer.incorrect')).toContainText(wrong);
  await expect(page.locator('.answer.incorrect')).toContainText('La teua resposta');
  await expect(page.getByTestId('feedback')).toContainText(
    `La resposta correcta és ${animal.name}`,
  );
  await expect(page.getByTestId('score')).toHaveText('Encerts: 0');
  await page.reload();
  await expect(page.locator('.answer.correct')).toContainText(animal.name);
  await expect(page.locator('.answer.incorrect')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.answer.correct')).toBeDisabled();
  await page.getByRole('button', { name: 'Següent animal' }).click();
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 2 de 30');
  await expect(page.locator('.answer.correct, .answer.incorrect')).toHaveCount(0);
  await expect(page.getByTestId('feedback')).toHaveCount(0);
  expect((await readSession(page)).answers).toEqual([wrong]);
  expect(errors).toEqual([]);
});

test('caps an existing long session at 30 and retains its completed answers', async ({ page }) => {
  const questions = ANIMALS.slice(0, 55).map((animal) => ({
    id: animal.id,
    options: [
      animal.name,
      ...ANIMALS.filter((entry) => entry.group === animal.group && entry.id !== animal.id)
        .slice(0, 2)
        .map((entry) => entry.name),
    ],
  }));
  const legacy = {
    version: 1,
    questions,
    index: 31,
    selected: null,
    answers: ANIMALS.slice(0, 31).map((animal) => animal.name),
    phase: 'answering',
  };
  await page.addInitScript(
    (session) => localStorage.setItem('animal-quiz-session-v1', JSON.stringify(session)),
    legacy,
  );
  await page.goto('/animals');
  await expect(page.getByRole('heading', { name: 'Has completat el repte!' })).toBeVisible();
  await expect(page.locator('.results-score')).toContainText('30Encerts');
  await expect(page.locator('.results-score')).toContainText('100%');
  const saved = await readSession(page);
  expect(saved.questions).toHaveLength(30);
  expect(saved.answers).toEqual(legacy.answers.slice(0, 30));
  expect(saved.phase).toBe('completed');
  await page.locator('.results-card').getByRole('button', { name: 'Tornar a començar' }).click();
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 1 de 30');
});

test('prevents answering when a picture fails and recovers on reload', async ({ page }) => {
  await page.route('**/animales/*.png', (route) => route.abort());
  await page.goto('/animals');
  await expect(page.getByRole('alert')).toContainText('No s’ha pogut carregar la imatge');
  await expect(page.getByRole('button', { name: 'Comprovar resposta' })).toBeDisabled();
  for (const answer of await page.locator('.answer').all()) await expect(answer).toBeDisabled();
  await page.unroute('**/animales/*.png');
  await page.reload();
  await expectAnimalImage(page, (await readSession(page)).questions[0].id);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('.answer').first()).toBeEnabled();
});

for (const width of [320, 390, 768, 1440]) {
  test(`animal picture and three answers at ${width}px`, async ({ page }) => {
    const errors = captureErrors(page);
    await page.setViewportSize({ width, height: 950 });
    await page.goto('/animals');
    await expect(page.getByRole('heading', { name: 'Quin animal és?' })).toBeVisible();
    await expectAnimalImage(page, (await readSession(page)).questions[0].id);
    await expect(page.locator('.answer')).toHaveCount(3);
    const first = await page.locator('.answer').first().boundingBox();
    const second = await page.locator('.answer').nth(1).boundingBox();
    expect(first!.height).toBeGreaterThanOrEqual(44);
    if (width < 600) expect(second!.y).toBeGreaterThan(first!.y);
    else expect(second!.y).toBe(first!.y);
    await page.locator('.answer').first().click();
    await page.getByRole('button', { name: 'Comprovar resposta' }).click();
    await expect(page.getByTestId('feedback')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
}
