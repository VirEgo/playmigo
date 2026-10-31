import { expect, test, Page } from '@playwright/test';
import { LOGIC_ACTIVITIES } from '../src/app/logic-challenges/logic-content';
import { Puzzle } from '../src/app/logic-challenges/logic-exercise';
import { findPath, reflection, machineSteps } from '../src/app/logic-challenges/logic-validation';

const key = 'logic-challenges-v1';
async function enter(page: Page, id: string, adult = true): Promise<void> {
  await page.addInitScript(
    ({ key, adult }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(
          key,
          JSON.stringify({ version: 1, activities: {}, recent: [], adultAccess: adult }),
        );
    },
    { key, adult },
  );
  await page.goto(`/logic/${id}`);
  await expect(page.getByRole('heading', { name: 'Retos de lógica', exact: true })).toBeVisible();
}
async function solve(page: Page, p: Puzzle): Promise<void> {
  switch (p.kind) {
    case 'choice':
      await page.locator(`[data-choice="${p.solution}"]`).click();
      if (p.reason) await page.locator(`[data-reason="${p.reason}"]`).click();
      break;
    case 'placement':
      for (const item of p.items) {
        await page.locator(`[data-item="${item.id}"]`).click();
        await page.locator(`[data-target="${p.solution[item.id]}"]`).click();
      }
      break;
    case 'selection':
      for (const id of p.solution) await page.locator(`[data-select="${id}"]`).click();
      break;
    case 'order': {
      const current = p.items.map((item) => item.id);
      for (let i = 0; i < p.solution.length; i++) {
        const id = p.solution[i];
        let index = current.indexOf(id);
        while (index > i) {
          await page
            .locator(`[data-order="${id}"]`)
            .getByRole('button', { name: /a la izquierda/ })
            .click();
          [current[index], current[index - 1]] = [current[index - 1], current[index]];
          index--;
        }
      }
      break;
    }
    case 'symmetry':
      for (const cell of reflection(p)) await page.locator(`[data-cell="${cell}"]`).click();
      break;
    case 'grid': {
      const path = findPath(p)!;
      for (let i = 1; i < path.length; i++) {
        if (p.mode === 'path') await page.locator(`[data-cell="${path[i]}"]`).click();
        else {
          const delta = path[i] - path[i - 1];
          await page
            .locator(
              `[data-command="${delta === p.size ? 'down' : delta === -p.size ? 'up' : delta === 1 ? 'right' : 'left'}"]`,
            )
            .click();
        }
      }
      if (p.mode === 'robot') {
        await page.getByRole('button', { name: 'Ejecutar', exact: true }).click();
        await expect(page.getByText('¡El robot ha llegado! Pulsa Comprobar.')).toBeVisible();
      }
      break;
    }
    case 'machine':
      await page.getByRole('button', { name: '6', exact: true }).first().click();
      await page.locator(`[data-rule="${p.rule}"]`).click();
      await page.locator(`[data-number="${machineSteps(p, p.input).at(-1)}"]`).click();
      break;
    case 'code': {
      const value = String(
        p.terms.reduce((sum, id) => sum + p.key.find((entry) => entry.tile.id === id)!.value, 0),
      );
      for (const digit of value)
        await page.locator('.keypad').getByRole('button', { name: digit, exact: true }).click();
      break;
    }
    case 'combinations':
      for (const hat of p.hats)
        for (const shirt of p.shirts)
          await page.locator(`[data-combination="${hat.id}:${shirt.id}"]`).click();
      await page.getByRole('button', { name: 'Respuesta numérica.', exact: false }).focus();
      await page.keyboard.type(String(p.hats.length * p.shirts.length));
      break;
    case 'stages':
      for (let i = 0; i < p.stages.length; i++) {
        await expect(page.getByText(`Sala ${i + 1} de 3`, { exact: false })).toBeVisible();
        await page.locator(`[data-choice="${p.stages[i].solution}"]`).click();
        if (i < 2)
          await page.getByRole('button', { name: 'Comprobar y abrir la siguiente sala' }).click();
      }
      break;
  }
}
for (const activity of LOGIC_ACTIVITIES) {
  test(`${activity.id}: all variants can be completed through the UI`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('requestfailed', (request) =>
      errors.push(`${request.url()}: ${request.failure()?.errorText}`),
    );
    await enter(page, activity.id);
    for (let i = 0; i < activity.variants.length; i++) {
      const variant = activity.variants[i];
      await page.getByRole('button', { name: new RegExp(`^Variante ${i + 1}`) }).click();
      await solve(page, variant.puzzle);
      await page.getByRole('button', { name: 'Comprobar', exact: true }).click();
      await expect(page.getByTestId('logic-feedback')).toContainText('¡Lo has conseguido!');
      await expect(page.getByRole('button', { name: 'Comprobar', exact: true })).toHaveCount(0);
      expect(
        await page.evaluate(
          ({ key, id, variant }) =>
            JSON.parse(localStorage.getItem(key)!).activities[id].runs[variant].status,
          { key, id: activity.id, variant: variant.id },
        ),
      ).toBe('completed');
    }
    await page.reload();
    await expect(page.getByTestId('logic-feedback')).toContainText('¡Lo has conseguido!');
    expect(errors).toEqual([]);
  });
}
test('wrong answer, hints, retry, keyboard choice, refresh and best result', async ({ page }) => {
  await enter(page, 'logic-01', false);
  await page.locator('[data-choice="b"]').focus();
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Comprobar', exact: true }).click();
  await expect(page.getByTestId('logic-feedback')).toContainText('Vamos a probar otra vez.');
  await expect(page.locator('[data-choice="b"]')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
  await page.getByRole('button', { name: /Pista 0\/3/ }).click();
  await expect(page.getByRole('status')).toContainText('Pista 1 de 3');
  await page.reload();
  await expect(page.getByRole('status')).toContainText('Pista 1 de 3');
  await page.locator('[data-choice="a"]').click();
  await page.getByRole('button', { name: 'Comprobar', exact: true }).click();
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).activities['logic-01'].runs.v1.attempts,
      key,
    ),
  ).toBe(2);
  await page.getByRole('button', { name: 'Reiniciar variante' }).click();
  await solve(page, LOGIC_ACTIVITIES[0].variants[0].puzzle);
  await page.getByRole('button', { name: 'Comprobar', exact: true }).click();
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).activities['logic-01'].bestStars,
      key,
    ),
  ).toBe(3);
});
test('selection requires the whole set; assignment supports drag and keyboard placement', async ({
  page,
}) => {
  await enter(page, 'logic-09');
  await page.locator('[data-select="a"]').click();
  await page.getByRole('button', { name: 'Comprobar', exact: true }).click();
  await expect(page.getByTestId('logic-feedback')).toContainText('Vamos a probar otra vez.');
  await page.locator('[data-select="d"]').click();
  await page.getByRole('button', { name: 'Comprobar', exact: true }).click();
  await expect(page.getByTestId('logic-feedback')).toContainText('¡Lo has conseguido!');
  await page.goto('/logic/logic-03');
  // Put both ends in view before mouse-down: scrolling between mouse-down and
  // the first move cancels Chromium's native drag gesture.
  await page.locator('[data-target="red"]').scrollIntoViewIfNeeded();
  await page.locator('[data-item="a"]').dragTo(page.locator('[data-target="red"]'));
  await expect(page.locator('[data-target="red"]')).toContainText('círculo rojo');
  await page.locator('[data-item="d"]').focus();
  await page.keyboard.press('Space');
  await page.locator('[data-target="red"]').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('[data-target="red"]')).toContainText('cuadrado rojo');
  await page.goto('/logic/logic-11');
  await page.locator('[data-order="fox"]').dragTo(page.locator('[data-order="rabbit"]'));
  await expect(page.locator('[data-order]').first()).toHaveAttribute('data-order', 'fox');
});
test('mobile catalogue, locked deep link, adult override and stage restore', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await enter(page, 'logic-24', false);
  await expect(page.getByRole('heading', { name: 'Un nuevo nivel te espera' })).toBeVisible();
  await page.getByText('Para adultos', { exact: true }).click();
  await page.getByRole('button', { name: 'Permitir todos los niveles' }).click();
  await expect(page.getByText('Sala 1 de 3', { exact: false })).toBeVisible();
  await page.locator('[data-choice="key2"]').click();
  await page.getByRole('button', { name: 'Comprobar y abrir la siguiente sala' }).click();
  await page.reload();
  await expect(page.getByText('Sala 2 de 3', { exact: false })).toBeVisible();
  await page.getByRole('link', { name: '← Volver a los retos' }).click();
  await expect(page.getByRole('heading', { name: '¡Activa tu curiosidad!' })).toBeVisible();
  await page.getByRole('button', { name: /Nivel 3: Maestro de lógica/ }).click();
  await expect(page.locator('.activity-card')).toHaveCount(8);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('link', { name: /El reino de las formas/ }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
