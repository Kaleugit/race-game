import { test, expect } from '@playwright/test';
import { GARAGE_SLIDES } from '../../src/ui/garage.js';
import {
  trackErrors, openGarageFromLobby, openMapFromLobby, pickGarage, confirmGarage, startStageFromMap, driveToFinish,
} from './drive.js';

// EP-008-09: the lobby has two entries, CORRIDA (stage map -> race with the SAVED garage) and GARAGEM
// (one carousel card, one part at a time; PRONTO saves and returns to the lobby).
const SHOW = /\bshow\b/;
const NAMES = ['MOTOR', 'CÂMBIO', 'PNEU', 'CHASSI', 'TANQUE DE TURBO', 'COR'];

async function expectSlide(page, i) {
  await expect(page.locator('#garage-card')).toHaveAttribute('data-slide', GARAGE_SLIDES[i]);
  await expect(page.locator('#garage-cat')).toHaveText(NAMES[i]);
  await expect(page.locator('#garage-step')).toHaveText(`${i + 1}/${GARAGE_SLIDES.length}`);
  await expect(page.locator('#garage-pips [aria-current="step"]')).toHaveCount(1);
  await expect(page.locator('#garage-pips .garage-pip').nth(i)).toHaveAttribute('aria-current', 'step');
  // One part at a time: only this slide is visible.
  for (let j = 0; j < GARAGE_SLIDES.length; j++) {
    const slide = page.locator(`.garage-slide[data-slide="${GARAGE_SLIDES[j]}"]`);
    if (j === i) await expect(slide).toBeVisible();
    else await expect(slide).toBeHidden();
  }
}

test('lobby: CORRIDA -> mapa -> corrida; VOLTAR do mapa -> lobby', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await expect(page.locator('#lobby-play')).toHaveText('CORRIDA');
  await expect(page.locator('#lobby-garage')).toHaveText('GARAGEM');

  // Map back -> lobby home (not the garage).
  await openMapFromLobby(page);
  await expect(page.locator('#garage-overlay')).not.toHaveClass(SHOW);
  await page.locator('#map-back').click();
  await expect(page.locator('#map-overlay')).not.toHaveClass(SHOW);
  await expect(page.locator('#garage-overlay')).not.toHaveClass(SHOW);
  await expect(page.locator('#lobby-play')).toBeVisible();

  // CORRIDA -> map -> race running with the default garage.
  await openMapFromLobby(page);
  await startStageFromMap(page, 'mata-atlantica');
  await expect(page.locator('#hud')).toHaveAttribute('data-engine', 'e20');
  await page.keyboard.down('ArrowUp');
  await expect.poll(async () => Number(await page.locator('#dist').textContent()), { timeout: 15_000 }).toBeGreaterThan(20);
  await page.keyboard.up('ArrowUp');
  expect(errors).toEqual([]);
});

test('lobby: GARAGEM -> carrossel (setas, teclado, indicador) -> PRONTO -> lobby, escolhas salvas', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await openGarageFromLobby(page);
  await expect(page.locator('#lobby-play')).toBeHidden();
  await expectSlide(page, 0);

  // Arrows, wrapping both ways.
  await page.locator('#garage-next').click();
  await expectSlide(page, 1);
  await page.locator('#garage-prev').click();
  await page.locator('#garage-prev').click();
  await expectSlide(page, GARAGE_SLIDES.length - 1);
  await page.locator('#garage-next').click();
  await expectSlide(page, 0);
  // Keyboard left / right.
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expectSlide(page, 2);
  await page.keyboard.press('ArrowLeft');
  await expectSlide(page, 1);
  // Pip jump.
  await page.locator('#garage-pips .garage-pip').nth(3).click();
  await expectSlide(page, 3);
  // Hidden slides are not clickable: a tank option is not reachable from the chassis slide.
  await expect(page.locator('#garage-tanks [data-tank="grande"]')).toBeHidden();

  const choice = { engine: 'e16', gearbox: 'curta', tire: 'offroad', chassis: 'leve', tank: 'pequeno', color: 'verde' };
  await pickGarage(page, choice);
  await expect(page.locator('#garage-color-name')).toHaveText('VERDE');
  await confirmGarage(page);
  const saved = JSON.parse(await page.evaluate(() => localStorage.getItem('race_profile_v1')));
  expect(saved.garage).toMatchObject(choice);

  // Reopen: every slide shows the saved option pressed, starting again from MOTOR.
  await openGarageFromLobby(page);
  await expectSlide(page, 0);
  await expect(page.locator('#garage-engines [data-engine="e16"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#garage-gearboxes [data-gearbox="curta"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#garage-tires [data-tire="offroad"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#garage-chassis [data-chassis="leve"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#garage-tanks [data-tank="pequeno"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#garage-colors [data-color-id="verde"]')).toHaveAttribute('aria-pressed', 'true');
  await confirmGarage(page);

  // CORRIDA races with the saved garage.
  await openMapFromLobby(page);
  await startStageFromMap(page, 'mata-atlantica');
  await expect(page.locator('#hud')).toHaveAttribute('data-engine', 'e16');
  await expect(page.locator('#turbo-gauge')).toHaveAttribute('data-segments', '8');
  expect(errors).toEqual([]);
});

test('resultado -> GARAGEM -> PRONTO -> lobby; CORRIDA com ?stage= inicia a fase direto', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/?stage=teste-plano');
  await page.locator('#lobby-play').click();
  await expect(page.locator('#map-overlay')).not.toHaveClass(SHOW);
  await expect(page.locator('#countdown-overlay')).toHaveClass(SHOW);
  await expect(page.locator('#countdown-overlay')).not.toHaveClass(SHOW, { timeout: 15_000 });
  await driveToFinish(page, { timeout: 60_000 });

  await page.locator('#end-garage').click();
  await expect(page.locator('#end-overlay')).not.toHaveClass(SHOW);
  await expect(page.locator('#garage-overlay')).toHaveClass(SHOW);
  await pickGarage(page, { tank: 'grande' });
  await confirmGarage(page);
  const saved = JSON.parse(await page.evaluate(() => localStorage.getItem('race_profile_v1')));
  expect(saved.garage.tank).toBe('grande');
  expect(errors).toEqual([]);
});
