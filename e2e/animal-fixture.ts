import { expect, type Page } from '@playwright/test';
import { ANIMALS } from '../src/app/animal-quiz/data/animals';
import type { AnimalSession } from '../src/app/animal-quiz/animal-quiz';

const storageKey = 'animal-quiz-session-v1';

export function captureErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('requestfailed', (request) =>
    errors.push(`${request.url()}: ${request.failure()?.errorText}`),
  );
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${response.url()}: HTTP ${response.status()}`);
  });
  return errors;
}

export async function readSession(page: Page): Promise<AnimalSession> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), storageKey);
}

export async function expectAnimalImage(page: Page, animalId: string): Promise<void> {
  const animal = ANIMALS.find((entry) => entry.id === animalId)!;
  const image = page.locator('.animal-picture img');
  await expect(image).toHaveAttribute('src', animal.image);
  await expect(image).toBeVisible();
  await expect
    .poll(() =>
      image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0),
    )
    .toBe(true);
}
