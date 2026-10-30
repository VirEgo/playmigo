import { expect, test } from '@playwright/test';
import { ANIMALS } from '../src/app/animal-quiz/data/animals';
import { captureErrors, readSession, expectAnimalImage } from './animal-fixture';

// Chromium tracing interrupts CSS animation completion; verify real timelines without snapshots.
test.use({ trace: 'off' });

test('shows transparent illustrations with a silhouette shadow and animates each new animal', async ({
  page,
}) => {
  const errors = captureErrors(page);
  await page.goto('/animals');
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 1 de 30');
  const session = await readSession(page);
  const first = ANIMALS.find((entry) => entry.id === session.questions[0].id)!;
  const next = ANIMALS.find((entry) => entry.id === session.questions[1].id)!;
  await expectAnimalImage(page, first.id);
  const image = page.locator('.animal-picture img');
  await expect(image).not.toHaveClass(/animal-enter/);
  expect(
    await page
      .locator('.animal-picture')
      .evaluate((element) => getComputedStyle(element).backgroundColor),
  ).toBe('rgba(0, 0, 0, 0)');
  expect(await image.evaluate((element) => getComputedStyle(element).filter)).toContain(
    'drop-shadow',
  );
  const originalElement = await image.elementHandle();
  const originalArea = await page.locator('.animal-picture').boundingBox();
  await page.getByRole('button', { name: first.name, exact: true }).click();
  await page.getByRole('button', { name: 'Comprovar resposta' }).click();
  expect(
    await originalElement!.evaluate(
      (element) => element === document.querySelector('.animal-picture img'),
    ),
  ).toBe(true);
  await page.evaluate((nextSrc) => {
    const capture = (event: AnimationEvent) => {
      if (
        event.target instanceof HTMLImageElement &&
        event.target.getAttribute('src') === nextSrc
      ) {
        document.documentElement.setAttribute('data-animal-animation', event.animationName);
        document.removeEventListener('animationstart', capture);
      }
    };
    document.addEventListener('animationstart', capture);
  }, next.image);
  await page.getByRole('button', { name: 'Següent animal' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-animal-animation', /animal-arrive/);
  await expectAnimalImage(page, next.id);
  await expect(image).not.toHaveClass(/animal-enter/);
  expect(await originalElement!.evaluate((element) => element.isConnected)).toBe(false);
  expect((await page.locator('.animal-picture').boundingBox())!.height).toBe(originalArea!.height);
  expect(await image.evaluate((element) => getComputedStyle(element).opacity)).toBe('1');
  expect(errors).toEqual([]);
});

test('changes animals without motion when reduced motion is enabled', async ({ page }) => {
  const errors = captureErrors(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/animals');
  await expect(page.getByTestId('question-number')).toHaveText('Pregunta 1 de 30');
  const session = await readSession(page);
  const first = ANIMALS.find((entry) => entry.id === session.questions[0].id)!;
  await expectAnimalImage(page, first.id);
  await page.getByRole('button', { name: first.name, exact: true }).click();
  await page.getByRole('button', { name: 'Comprovar resposta' }).click();
  await page.getByRole('button', { name: 'Següent animal' }).click();
  await expectAnimalImage(page, session.questions[1].id);
  const image = page.locator('.animal-picture img');
  expect(await image.evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
  expect(await image.evaluate((element) => getComputedStyle(element).transform)).toBe('none');
  expect(await image.evaluate((element) => getComputedStyle(element).opacity)).toBe('1');
  expect(errors).toEqual([]);
});
