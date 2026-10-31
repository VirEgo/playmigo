import { expect, test } from '@playwright/test';
import { LOGIC_ACTIVITIES } from '../../src/app/logic-challenges/logic-content';

test('static hosting includes every logic deep link and restores a completed puzzle', async ({
  page,
  request,
  baseURL,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('requestfailed', (request) => errors.push(request.url()));
  for (const activity of LOGIC_ACTIVITIES)
    expect((await request.get(`logic/${activity.id}`)).status(), activity.id).toBe(200);
  expect((await page.goto('logic'))?.status()).toBe(200);
  await expect(page).toHaveTitle('Retos de lógica · Piensa, descubre y resuelve');
  await page.getByRole('link', { name: /¿Qué figura sigue/ }).click();
  await expect(page).toHaveURL(`${baseURL}logic/logic-01`);
  await page.locator('[data-choice="a"]').click();
  await page.getByRole('button', { name: 'Comprobar', exact: true }).click();
  await expect(page.getByTestId('logic-feedback')).toContainText('¡Lo has conseguido!');
  expect((await page.reload())?.status()).toBe(200);
  await expect(page.getByTestId('logic-feedback')).toContainText('¡Lo has conseguido!');
  await page.getByRole('link', { name: '← Volver a los retos' }).click();
  await expect(page.getByText('1 de 24', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
