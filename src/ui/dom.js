/**
 * @module ui/dom
 * @summary Tiny DOM helpers shared by the screen modules (element lookup, element creation, overlay toggle).
 */

/**
 * @summary Element by id; throws a clear error when index.html is missing it.
 * @param {string} id
 */
export function byId(id) {
  const node = document.getElementById(id);
  if (!node) throw new Error(`ui: #${id} not found in index.html`);
  return node;
}

/**
 * @summary Create an element with a class name, text and data-* attributes (camelCase keys).
 * @param {string} tag
 * @param {{ className?: string, text?: string, data?: Record<string, string> }} [opts]
 */
export function el(tag, { className, text, data } = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  if (data) for (const [k, v] of Object.entries(data)) node.dataset[k] = v;
  return node;
}

/**
 * @summary Show or hide an overlay through its `.show` class (overlays are hidden by default).
 * @param {HTMLElement} overlay
 * @param {boolean} visible
 */
export function setOverlay(overlay, visible) {
  overlay.classList.toggle('show', visible);
  overlay.setAttribute('aria-hidden', visible ? 'false' : 'true');
}

/**
 * @summary Turn a `{ id: {...} }` map (e.g. TIRES) or an `[{ id, ... }]` list into a list of `{ id, ... }`.
 * @param {object[] | Record<string, object>} items
 */
export function toList(items) {
  if (Array.isArray(items)) return items;
  return Object.entries(items ?? {}).map(([id, v]) => ({ id, ...v }));
}
