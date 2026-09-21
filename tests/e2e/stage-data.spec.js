import { test, expect } from '@playwright/test';

// CA-003 proof: a stage added purely as data (src/stages/teste-plano.stage.js)
// loads via ?stage=<id> and runs lobby -> countdown -> race -> end overlay with no errors.
test('estágio só com dados: ?stage=teste-plano -> corrida -> resultado', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  const warnings = [];
  page.on('console', (m) => { if (m.type() === 'warning') warnings.push(m.text()); });

  await page.goto('/?stage=teste-plano');
  await page.locator('#lobby-play').click();

  const countdown = page.locator('#countdown-overlay');
  await expect(countdown).toHaveClass(/\bshow\b/);
  await expect(countdown).not.toHaveClass(/\bshow\b/, { timeout: 15_000 });

  await page.keyboard.down('ArrowUp');
  const end = page.locator('#end-overlay');
  await expect(end).toHaveClass(/\bshow\b/, { timeout: 60_000 });
  await page.keyboard.up('ArrowUp');

  await expect(page.locator('#end-result')).toHaveText(/^(VITÓRIA|DERROTA)$/);
  expect(errors).toEqual([]);
  // The test stage must actually be selected (no fallback to the default stage).
  expect(warnings.filter((w) => w.includes('not found'))).toEqual([]);
});
