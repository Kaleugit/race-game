import { test, expect } from '@playwright/test';

// EP-005-02: the Cerrado stage (data only) loads via ?stage=cerrado and runs lobby -> countdown ->
// race -> end overlay with no errors. Race takes 60–90 s (reference ~81 s, bot ~86 s); 150 s for the
// end overlay as in the smoke test (epic DA-004). EP-006-04: the result opens when the player crosses
// the line, so the player holds ArrowUp+Space (~102 s of game time in the headless harness).
test('estágio Cerrado: ?stage=cerrado -> corrida -> resultado', async ({ page }) => {
  test.setTimeout(210_000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  const warnings = [];
  page.on('console', (m) => { if (m.type() === 'warning') warnings.push(m.text()); });

  await page.goto('/?stage=cerrado');
  await page.locator('#lobby-play').click();

  const countdown = page.locator('#countdown-overlay');
  await expect(countdown).toHaveClass(/\bshow\b/);
  await expect(countdown).not.toHaveClass(/\bshow\b/, { timeout: 15_000 });

  await page.keyboard.down('ArrowUp');
  await page.keyboard.down('Space');
  const end = page.locator('#end-overlay');
  await expect(end).toHaveClass(/\bshow\b/, { timeout: 150_000 });
  await page.keyboard.up('Space');
  await page.keyboard.up('ArrowUp');

  await expect(page.locator('#end-result')).toHaveText(/^(VITÓRIA|DERROTA)$/);
  expect(errors).toEqual([]);
  // The Cerrado stage must actually be selected (no fallback to the default stage).
  expect(warnings.filter((w) => w.includes('not found'))).toEqual([]);
});
