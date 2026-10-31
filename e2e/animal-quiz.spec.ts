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
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 1 de 55');
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
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 1 de 55');
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
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 2 de 55');
  await expectAnimalImage(page, original.questions[1].id);
  await expect(page.getByRole('button', { name: 'Comprovar resposta' })).toBeDisabled();
  await page.getByRole('button', { name: 'Tornar a començar' }).click();
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 1 de 55');
  await expect(page.getByTestId('score')).toHaveText('Encerts: 0');
  const restarted = await readSession(page);
  expect(restarted.answers).toEqual([]);
  expect(restarted.questions.map((question) => question.id).sort()).toEqual(
    ANIMALS.map((animal) => animal.id).sort(),
  );
  expect(restarted.questions.map((question) => question.id)).not.toEqual(
    original.questions.map((question) => question.id),
  );
  expect(errors).toEqual([]);
});

test('completes all 55 questions, checks mixed answers and restores final results', async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors = captureErrors(page);
  await page.goto('/animals');
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 1 de 55');
  const session = await readSession(page);
  expect(new Set(session.questions.map((question) => question.id)).size).toBe(55);
  for (const [index, question] of session.questions.entries()) {
    const animal = ANIMALS.find((entry) => entry.id === question.id)!;
    await expect(page.getByTestId('question-number')).toHaveText(`Pregunta ${index + 1} de 55`);
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
  await expect(results).toContainText('44Encerts');
  await expect(results).toContainText('11Per practicar');
  await expect(results).toContainText('80%');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Has completat el repte!' })).toBeVisible();
  await page.locator('.results-card').getByRole('button', { name: 'Tornar a començar' }).click();
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 1 de 55');
  expect(errors).toEqual([]);
});

test('loads only the original 55 animals with their Valencian names and three answer options', async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors = captureErrors(page);
  expect(ANIMALS).toHaveLength(55);
  expect(ANIMALS[0].id).toBe('gos');
  expect(ANIMALS[54].id).toBe('clotxina');
  expect(new Set(ANIMALS.map((animal) => animal.id)).size).toBe(55);
  expect(new Set(ANIMALS.map((animal) => animal.image)).size).toBe(55);
  await page.goto('/animals');
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 1 de 55');

  const questions = ANIMALS.map((animal) => ({
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
  for (const [index, animal] of ANIMALS.entries()) {
    await expect(page.getByTestId('question-number')).toHaveText(`Pregunta ${index + 1} de 55`);
    await expectAnimalImage(page, animal.id);
    await expect(
      page.getByRole('group', { name: 'Tria una resposta' }).getByRole('button'),
    ).toHaveCount(3);
    await page.getByRole('button', { name: animal.name, exact: true }).click();
    await page.getByRole('button', { name: 'Comprovar resposta' }).click();
    await expect(page.getByTestId('feedback')).toContainText(animal.name);
    await expect(page.locator('.answer.correct')).toContainText(animal.name);
    if (index + 1 < ANIMALS.length)
      await page.getByRole('button', { name: 'Següent animal' }).click();
  }
  expect(errors).toEqual([]);
});

for (const disabledEntry of ['question', 'option']) {
  test(`replaces a saved session containing a disabled animal ${disabledEntry}`, async ({
    page,
  }) => {
    const errors = captureErrors(page);
    const questions = ANIMALS.map((animal) => ({
      id: animal.id,
      options: [
        animal.name,
        ...ANIMALS.filter((other) => other.group === animal.group && other.id !== animal.id)
          .slice(0, 2)
          .map((other) => other.name),
      ],
    }));
    if (disabledEntry === 'question') {
      questions[0] = { id: 'ase', options: ['l’ase', 'el gos', 'el gat'] };
    } else {
      questions[0].options[1] = 'l’ase';
    }
    await page.addInitScript((questions) => {
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
    await page.goto('/animals');
    await expect(page.getByTestId('question-number')).toHaveText('Pregunta 1 de 55');
    const saved = await readSession(page);
    expect(saved.questions).toHaveLength(55);
    for (const question of saved.questions) {
      expect(ANIMALS.some((animal) => animal.id === question.id)).toBe(true);
      for (const option of question.options) {
        expect(ANIMALS.some((animal) => animal.name === option)).toBe(true);
      }
    }
    await expectAnimalImage(page, saved.questions[0].id);
    await expect(page.getByRole('button', { name: 'l’ase', exact: true })).toHaveCount(0);
    await page.locator('.answer').first().click();
    await page.getByRole('button', { name: 'Comprovar resposta' }).click();
    await expect(page.getByTestId('feedback')).toBeVisible();
    expect((await readSession(page)).answers).toHaveLength(1);
    expect(errors).toEqual([]);
  });
}

test('reveals the correct option after a mistake, preserves it on reload and clears it on next', async ({
  page,
}) => {
  const errors = captureErrors(page);
  await page.goto('/animals');
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 1 de 55');
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
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 2 de 55');
  await expect(page.locator('.answer.correct, .answer.incorrect')).toHaveCount(0);
  await expect(page.getByTestId('feedback')).toHaveCount(0);
  expect((await readSession(page)).answers).toEqual([wrong]);
  expect(errors).toEqual([]);
});

test('restarts an old 30-question session with all 55 animals', async ({ page }) => {
  const errors = captureErrors(page);
  const questions = ANIMALS.slice(0, 30).map((animal) => ({
    id: animal.id,
    options: [
      animal.name,
      ...ANIMALS.filter((entry) => entry.group === animal.group && entry.id !== animal.id)
        .slice(0, 2)
        .map((entry) => entry.name),
    ],
  }));
  await page.addInitScript((questions) => {
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
  await page.goto('/animals');
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 1 de 55');
  const saved = await readSession(page);
  expect(saved.questions).toHaveLength(55);
  expect(new Set(saved.questions.map((question) => question.id)).size).toBe(55);
  await expectAnimalImage(page, saved.questions[0].id);
  expect(errors).toEqual([]);
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
