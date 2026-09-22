/**
 * @module ui/format
 * @summary Race time formatting for the result screen: `formatTime` and the signed `formatDelta`.
 */

/**
 * @summary Seconds with 2 decimals and an `s` suffix (`63.42s`); non-finite -> `—`.
 * @param {number} s seconds
 */
export function formatTime(s) {
  if (typeof s !== 'number' || !Number.isFinite(s)) return '—';
  return `${s.toFixed(2)}s`;
}

/**
 * Difference `player − bot`, always signed, 2 decimals (`+1.34s`, `-0.80s`, `+0.00s`; CA-006).
 * Rounded to hundredths before the sign is chosen so `-0.001` reads `+0.00s`, never `-0.00s`.
 * @summary Signed time difference between the player and the bot.
 * @param {number} player player time in seconds
 * @param {number} bot bot time in seconds
 */
export function formatDelta(player, bot) {
  if (!Number.isFinite(player) || !Number.isFinite(bot)) return '—';
  const cents = Math.round((player - bot) * 100);
  const sign = cents < 0 ? '-' : '+';
  return `${sign}${(Math.abs(cents) / 100).toFixed(2)}s`;
}
