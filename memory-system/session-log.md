# Session Log - All Role/Skill Activities

Consolidated record of relevant sessions.
Data source: `memory-system/session-log.d/*.md` (append-only per task/worktree).

---

## Sessions (Consolidated)
Do not manually edit the consolidated block.

<!-- SESSION_LOG:START -->
# 2026-09-21 — TASK-kaleugit-20260921172138

- Fixed three failing harnesses found by validate-all.sh after bootstrap: removed foreign test-report-error.sh, canonicalized repo root in telemetry install-hooks.sh (Git Bash C:/ vs /c/), replaced ln -s fixture copies with exec shims, and made the mkdir-lock break only dead holders (PID check).
- Residual: concurrency case in test-telemetry-orphan.sh still fails under load on this host; recorded as TD-001. Human chose to disable telemetry for this project instead of reworking hooks.


# 2026-09-21 — TASK-kaleugit-20260921174640

- Manager chose to disable telemetry for race-game. Removed telemetry hooks and statusLine from .claude/settings.json, added ADR-019, and an opt-out guard in update-upstream. Skill code kept for reversibility.


# 2026-09-21 — TASK-kaleugit-20260921180706

- With explicit manager authorization (ADR-016), governance.yml now runs scripts/setup-links.sh before validation and the 13 CI-scope scripts regain +x.


# 2026-09-21 — TASK-kaleugit-EP-001-01

- EP-001: Playwright e2e added; `npm test` runs a smoke of the current flow against the production build (1 passed).


# 2026-09-21 — TASK-kaleugit-EP-002-01

- EP-002 Task 01: pure `createTrack` (src/track/track.js) + stage registry (src/stages/registry.js, index.js) + Mata Atlantica stage data; `npm run test:sim` (node:test, 10 pass) proves heights match the d399713 fixture within 1e-9. src/main.js untouched; `npm test` green.


# 2026-09-21 — TASK-kaleugit-EP-002-02

- EP-002 Task 02: new `src/track/track-scene.js` (`createTrackScene` -> `update(scroll)`, `dispose()`) builds road/mud/ground/sky/finish portal/zone overlays from stage data; `src/main.js` uses `track.heightAt`/`track.finishX` and `?stage=<id>` via `setStage(id)`. `npm test` and `npm run test:sim` green; UX parity gate pending human.


# 2026-09-21 — TASK-kaleugit-EP-002-03

- EP-002 Task 03 (CA-003 proof): hidden data-only stage `src/stages/teste-plano.stage.js` (finishX 200, sand + mud zones) plus `tests/e2e/stage-data.spec.js` (`/?stage=teste-plano` -> end overlay). No engine file changed. `npm test` 2 passed, `npm run test:sim` 10/10.


# 2026-09-21 — TASK-kaleugit-EP-003-01

- EP-003 Task 01 (Critical): car physics extracted to `src/physics/car-physics.js` (`createCarPhysics`) + `src/physics/params.js` (`BASE_PARAMS`); `src/main.js` steps `playerCar` in `tick` and renders from its state; `tests/sim/harness.js` `runRace()`. Bit-exact vs pre-extraction physics (12/12 scratch runs, 3 golden tests). `npm run test:sim` 20/20, `npm test` 2 passed. Stacked on PR #7. UX gate pending human.


# 2026-09-21 — TASK-kaleugit-EP-003-02

- EP-003 Task 02 (Standard): crash restart replaced by RF-005 auto-righting (human-approved behavior change). Chassis contact rests the car on CHASSIS_HITBOX; after 1.5 s upside down on the ground it is set back on its wheels keeping x (`righted: true`). Crash flow and overlay removed from src/main.js/index.html. `npm run test:sim` 26/26 (goldens unchanged), `npm test` 2 passed. UX gate pending human.


# 2026-09-21 — TASK-kaleugit-EP-003-03

- EP-003 Task 03 (Standard): tire (Estrada/Misto/Off-road) and gearbox (Curta/Padrão/Longa) presets in src/parts/presets.js with resolveCarParams; physics applies grip[surfaceAt(x)] to acceleration and speed-proportional surfaceDrag on the ground. Misto/Padrão = identity over BASE_PARAMS (goldens unchanged). CA-008 and CDC-102 proven in tests/sim/parts.test.js. `npm run test:sim` 37/37. UX gate pending human.
<!-- SESSION_LOG:END -->

---

*Last Updated: YYYY-MM-DD*
