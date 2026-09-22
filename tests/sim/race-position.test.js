// EP-008-10: race order shown as 1º / 2º on the race bar (playerLeads in src/ui/race-hud.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { playerLeads } from '../../src/ui/race-hud.js';

const FINISH = 1400;

test('further along the track is 1º', () => {
  assert.equal(playerLeads(false, 120, 100, FINISH), true);
  assert.equal(playerLeads(true, 100, 120, FINISH), false);
});

test('tie keeps the previous order (start grid = player 1º)', () => {
  assert.equal(playerLeads(true, 0, 0, FINISH), true);
  assert.equal(playerLeads(false, 50, 50, FINISH), false);
});

test('order flips when the bot passes and when it falls behind again', () => {
  const frames = [[0, 0], [5, 8], [20, 18], [30, 30], [40, 45], [60, 59]];
  let first = true;
  const seen = frames.map(([p, b]) => (first = playerLeads(first, p, b, FINISH)));
  assert.deepEqual(seen, [true, false, true, true, false, true]);
});

test('bot crossing first locks BOT 1º even if the player later has a larger x', () => {
  let first = playerLeads(true, 1390, FINISH, FINISH); // bot on the line (botScroll is clamped to finishX)
  assert.equal(first, false);
  first = playerLeads(first, 1405, FINISH, FINISH); // player crosses afterwards
  assert.equal(first, false);
});

test('player crossing first locks VOCÊ 1º', () => {
  let first = playerLeads(false, 1401, 1399, FINISH);
  assert.equal(first, true);
  first = playerLeads(first, 1420, FINISH, FINISH);
  assert.equal(first, true);
});
