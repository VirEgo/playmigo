import { expect, test } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('LM Studio creates and persists five local story variants without changing answers', async ({
  page,
}) => {
  test.skip(process.env['RUN_LM_STUDIO'] !== '1', 'Opt-in: needs a running local model.');
  test.setTimeout(150000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Configurar el test' }).click();
  await page.getByText('Problemas con LM Studio · opcional', { exact: true }).click();
  await page.getByRole('button', { name: 'Comprobar conexión', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('LM Studio conectado.');
  const before = await page.evaluate(
    () => JSON.parse(localStorage.getItem('math-quiz-session-v1')!).questions,
  );
  await page.getByRole('button', { name: 'Crear problemas nuevos', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText(
    'Los nuevos problemas ya están preparados y guardados.',
    { timeout: 125000 },
  );
  const after = await page.evaluate(
    () => JSON.parse(localStorage.getItem('math-quiz-session-v1')!).questions,
  );
  expect(after).toHaveLength(50);
  let changed = 0;
  for (let index = 0; index < before.length; index++) {
    expect(after[index].correctAnswer).toBe(before[index].correctAnswer);
    expect(after[index].options).toEqual(before[index].options);
    expect(after[index].operation).toEqual(before[index].operation);
    if (after[index].question !== before[index].question) changed++;
  }
  expect(changed).toBe(5);
  await page.screenshot({
    path: join(tmpdir(), 'child-trainer-lm-studio.png'),
    animations: 'disabled',
  });
  await page.reload();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('math-quiz-session-v1')!).questions),
  ).toEqual(after);
});
