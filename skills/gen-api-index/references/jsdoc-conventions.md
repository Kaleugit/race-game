# JSDoc Conventions for `gen-api-index`

This is the canonical reference for the JSDoc tags consumed by `gen-api-index.sh` and enforced on-touch by `.github/workflows/governance.yml`.

The CI step fails any PR that modifies a JS/TS file under `src/` or a JS file under `public/` if the file does not carry the head tags described below. Existing untouched files are exempt — this is the boy-scout rule, not a one-shot migration.

## Backend modules (`src/**`)

Every modified backend JS/TS file must open with a JSDoc head block whose first non-blank tag is `@module`:

```js
/**
 * @module venue-crud — CRUD de venues no disco, fonte da verdade.
 *
 * Mais detalhes opcionais aqui (parágrafo livre).
 */

/**
 * @summary Verdadeiro se venue está locked via lockfile.
 */
export function isVenueLocked(id) { /* ... */ }

/**
 * @summary Carrega venue do disco com merge de defaults.
 */
export async function loadVenue(id) { /* ... */ }
```

Tag reference:

| Tag | Where | Cardinality | Purpose |
|-----|-------|-------------|---------|
| `@module <name> — <one-line purpose>` | Top of file, inside the very first JSDoc block. | Exactly one per file. | Title used as the section heading in `docs/INDEX-API.md`. |
| `@summary <one-line>` | Inside a JSDoc block immediately above each public `export`. | One per exported surface. | Bullet line under the module's section. |

Notes:
- The em-dash separator (` — `) is part of the rendered output; keep it.
- The generator scans the first 60 lines for `@module` and the first 200 lines for `@summary` bullets. Place tags near the surface they describe.
- `@summary` is optional but strongly recommended — without it the module appears in the index but has no surface bullets.

## Frontend custom elements (`public/**` that call `customElements.define`)

Custom elements must carry an `@element` tag inside the class's JSDoc block:

```js
/**
 * @element scene-list
 * @summary List of scenes with active highlight + delete.
 *
 * @attr scenes
 * @attr active-id
 * @fires scene-select
 * @fires scene-delete
 * @slot header
 * @method focusActive
 */
class SceneList extends HTMLElement { /* ... */ }
customElements.define('scene-list', SceneList);
```

Tag reference:

| Tag | Cardinality | Purpose |
|-----|-------------|---------|
| `@element <tag-name>` | Exactly one. | Renders the `<tag-name>` heading. |
| `@summary <one-line>` | One. | Sub-heading line. |
| `@attr <name>` | Zero or more. | "Attrs" bullet (comma-separated). |
| `@fires <event-name>` | Zero or more. | "Events" bullet. |
| `@slot <name>` | Zero or more. | "Slots" bullet. |
| `@method <name>` | Zero or more. | "Methods" bullet (public methods only). |

Notes:
- The generator detects custom elements either via the presence of `customElements.define(` anywhere in the file, or via the presence of `@element` in the head block.
- Files detected as custom elements are counted in the "frontend custom elements" coverage bucket; everything else lands in the "backend" bucket.

## Coverage semantics

The generator emits a header like:

```
> **Coverage**: 47/249 backend files (19%), 5/27 frontend custom elements (19%).
```

Numerator = files where the required head tag was found. Denominator = candidate files (everything matched by the configured globs). Files without tags are counted in the denominator only, on purpose — the header tells the truth instead of pretending the project is fully documented.

## Configuration

Default globs:
- `src/**/*.{js,ts,jsx,tsx}`
- `public/**/*.js`

Override / extend via `.governance/api-index.conf` (optional). One token per line, `#` for comments:

```
# Extra extensions to include
mjs
cjs

# Extra scan roots (prefix with "dir:")
dir:apps/api/src
dir:packages/core/src
```

## Why this design

- **No `jsdoc-api` dependency** — bash + regex is enough for the head-block parsing we need. CDT-003 (zero unnecessary dependencies).
- **Boy-scout enforcement** — automatic backfill via LLM degrades quality permanently. On-touch enforcement spreads the cost across the team while preserving accuracy.
- **Honest coverage** — the header is intentionally pessimistic. A 12% coverage number motivates contribution; a fake 100% hides the gap.
- **Idempotent** — re-running with no source changes produces a byte-identical output (modulo the timestamp). Safe to run from pre-commit, CI, or by hand.
