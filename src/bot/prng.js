/**
 * @module bot/prng
 * @summary Seeded pseudo-random generator (mulberry32) for the bot's errors (CDC-106: no
 * unseeded randomness in gameplay; the same seed replays the same race).
 */

/**
 * Creates a mulberry32 generator. The seed is coerced to an unsigned 32-bit integer.
 * @summary Seeded PRNG: `createPrng(seed)` -> `() => number` in [0, 1).
 * @param {number} seed
 * @returns {() => number}
 */
export function createPrng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
