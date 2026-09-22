/**
 * @module parts/colors
 * @summary The 10 fixed garage body colors (RF-007, visual only) and the default color id.
 */

/**
 * Fixed body colors `{ id, label, hex }` (PT-BR labels). Purely visual: no color changes physics
 * (CDC-102). `vermelho` is the Bandeirante's original body color (car.js bodyMat).
 * @summary Frozen list of the 10 garage colors.
 */
export const CAR_COLORS = Object.freeze([
  Object.freeze({ id: 'vermelho', label: 'Vermelho', hex: 0xb71f1f }),
  Object.freeze({ id: 'laranja', label: 'Laranja', hex: 0xe0701a }),
  Object.freeze({ id: 'amarelo', label: 'Amarelo', hex: 0xe8c21e }),
  Object.freeze({ id: 'verde', label: 'Verde', hex: 0x2f8f3a }),
  Object.freeze({ id: 'azul', label: 'Azul', hex: 0x1f4fb7 }),
  Object.freeze({ id: 'ciano', label: 'Ciano', hex: 0x1a9fb0 }),
  Object.freeze({ id: 'roxo', label: 'Roxo', hex: 0x6a2fb0 }),
  Object.freeze({ id: 'branco', label: 'Branco', hex: 0xe6e6e6 }),
  Object.freeze({ id: 'preto', label: 'Preto', hex: 0x1c1c20 }),
  Object.freeze({ id: 'prata', label: 'Prata', hex: 0x9aa0a8 }),
]);

/** @summary Default color id: the Bandeirante's current red. */
export const DEFAULT_COLOR = 'vermelho';

/**
 * @summary Color entry by id, or undefined for an unknown id.
 * @param {string} id
 */
export function getCarColor(id) {
  return CAR_COLORS.find((c) => c.id === id);
}
