/**
 * @module bot/bot-preset
 * @summary The bot's own part preset (RF-007: the bot never inherits the player's garage choice).
 */
import { BASE_PARAMS } from '../physics/params.js';
import { resolveCarParams } from '../parts/presets.js';

/** @summary Bot part selection used when a stage does not set `bot.parts` (identity over BASE_PARAMS). */
export const BOT_DEFAULT_PARTS = Object.freeze({ tire: 'misto', gearbox: 'padrao' });

/**
 * Resolves the bot's physics params from stage data only: `stage.bot.parts` when present,
 * otherwise BOT_DEFAULT_PARTS. Takes no player selection by design.
 * @summary Bot car params for a stage: `resolveCarParams(BASE_PARAMS, stage.bot.parts ?? BOT_DEFAULT_PARTS)`.
 * @param {{ bot?: { parts?: { tire: string, gearbox: string } } }} stage
 */
export function resolveBotParams(stage) {
  return resolveCarParams(BASE_PARAMS, stage.bot?.parts ?? BOT_DEFAULT_PARTS);
}
