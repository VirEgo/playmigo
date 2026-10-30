import { expect, test } from '@playwright/test';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ANIMALS } from '../../src/app/animal-quiz/data/animals';
import { captureErrors, expectAnimalImage, readSession } from '../animal-fixture';

for (const width of [1440, 390]) {
  test(`static Pages site loads routes, assets and saved progress at ${width}px`, async ({
    page,
    baseURL,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = captureErrors(page);
    const response = await page.goto('./');
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle('Un viaje por el mundo de las matemáticas');
    await expect(page.getByTestId('question-number')).toHaveText('Pregunta 1 de 50');
    await page.locator('.answer').first().click();
    await page.getByRole('button', { name: 'Comprobar respuesta' }).click();
    await expect(page.getByTestId('feedback')).toBeVisible();
    const savedMath = await page.evaluate(() => localStorage.getItem('math-quiz-session-v1'));

    await page.getByRole('link', { name: 'Animals · Valencià' }).click();
    await expect(page).toHaveURL(`${baseURL}animals`);
    await expect(page).toHaveTitle('Un viatge pel món dels animals · Valencià');
    await expect(page.getByTestId('question-number')).toHaveText('Pregunta 1 de 30');
    await expectAnimalImage(page, (await readSession(page)).questions[0].id);
    const image = page.locator('.animal-picture img');
    expect(await image.evaluate((img: HTMLImageElement) => img.src)).toContain(
      `${baseURL}animales/`,
    );
    await page.locator('.answer').first().click();
    await page.getByRole('button', { name: 'Comprovar resposta' }).click();
    await expect(page.getByTestId('feedback')).toBeVisible();
    const savedAnimals = await readSession(page);

    // A strict file server must handle a direct visit and a refresh without rewrites.
    const direct = await page.goto('animals');
    expect(direct?.status()).toBe(200);
    expect(direct?.url()).toBe(`${baseURL}animals/`);
    // Angular normalizes the directory URL back to its configured route.
    await expect(page).toHaveURL(`${baseURL}animals`);
    await expect(page.getByTestId('feedback')).toBeVisible();
    const reload = await page.reload();
    expect(reload?.status()).toBe(200);
    await expectAnimalImage(page, savedAnimals.questions[0].id);
    expect(await readSession(page)).toEqual(savedAnimals);
    expect(await page.evaluate(() => localStorage.getItem('math-quiz-session-v1'))).toBe(savedMath);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: path.join(tmpdir(), `child-trainer-pages-${width}.png`) });

    await page.getByRole('link', { name: 'Matemáticas' }).click();
    await expect(page.getByTestId('feedback')).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('Pages settings offer categories without the unavailable local model controls', async ({
  page,
}) => {
  const errors = captureErrors(page);
  await page.goto('./');
  await page.getByRole('button', { name: 'Configurar el test' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveCount(7);
  await expect(page.locator('details.local-model')).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('all animal illustrations and the math alias are available on static hosting', async ({
  request,
}) => {
  for (const animal of ANIMALS) {
    const response = await request.get(animal.image);
    expect(response.status(), animal.image).toBe(200);
    expect(response.headers()['content-type']).toBe('image/png');
  }
  expect((await request.get('math')).status()).toBe(200);
  expect((await request.get('missing-file.js')).status()).toBe(404);
});

test('the direct math alias redirects to the trainer', async ({ page, baseURL }) => {
  const errors = captureErrors(page);
  expect((await page.goto('math'))?.status()).toBe(200);
  await expect(page).toHaveURL(baseURL!);
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 1 de 50');
  expect(errors).toEqual([]);
});
