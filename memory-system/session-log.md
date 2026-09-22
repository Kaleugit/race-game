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


# 2026-09-21 — TASK-kaleugit-EP-004-01

- EP-004 Task 01 (Standard): src/bot/ (prng mulberry32, bot-driver with createBotDriver/runBotToFinish, bot-preset with BOT_DEFAULT_PARTS/resolveBotParams) and tests/sim/reference-driver.js. Mata Atlântica: reference 17.30 s; bot d=0.5 seeds 1..10 median 18.81 s (-4.2%/+9.5%), all finish and all slower than the reference; stall recovery on the steep climb proven. `npm run test:sim` 53/53. src/main.js untouched (EP-004-02).


# 2026-09-21 — TASK-kaleugit-EP-004-02

- EP-004 Task 02 (Standard): fixed-time ghost removed from src/main.js; the opponent is now a second createCarPhysics instance driven by createBotDriver (seed = session race counter), rebuilt per race in resetGame, no mesh; its x feeds #race-bar-bot/#bot-dist; runBotToFinish gives the bot time when the player wins. New tests/e2e/bot.spec.js (idle player on teste-plano -> DERROTA). `npm test` 3/3, `npm run test:sim` 53/53. UX gate pending human.


# 2026-09-21 — TASK-kaleugit-EP-005-01

- EP-005 Task 01 (Standard): Mata Atlântica extended to 2600 m (data only; 0–830 m prototype opening verbatim) with mud zones and two new big jumps; reference driver 73.7 s (CA-009), bot median 79.4 s (CA-004). Old-track goldens repointed to tests/sim/fixtures/mata-atlantica-legacy.stage.js. New generic tests/sim/stage-duration.test.js; CA-004 over listStages(); smoke e2e waits 150 s. test:sim 56/56, npm test 3/3. UX gate pending human.


# 2026-09-21 — TASK-kaleugit-EP-005-02

- EP-005 Task 02 (Standard): new Cerrado stage (data only, order 2): 2800 m savanna with two chapadas, red-earth ground, sand zones; reference 80.5 s (CA-009), bot d=0.6 median 86.2 s (ratio 1.071 < Mata 1.078, CA-004). New tests/sim/cerrado.test.js (CA-008 on real sand, relative difficulty) and tests/e2e/cerrado.spec.js. test:sim 63/63, npm test 4/4 (--workers=2). UX gate pending human.


# 2026-09-21 — TASK-kaleugit-EP-006-01

- EP-006 Task 01 (Standard): local profile `race_profile_v1` (src/profile/profile.js) and 10 garage colors (src/parts/colors.js); tests/sim/profile.test.js 10/10, test:sim 73/73. Legacy `race_best_time` read-only (copied into progress.best['mata-atlantica']). Not wired into main.js yet (EP-006-04).


# 2026-09-21 — TASK-kaleugit-EP-006-02

- EP-006 Task 02 (Quick): `applyCarLook(carBuilt, { color, tire })` in src/car.js (body color + trims; per-tire lug scale, tread shade, sidewall texture). makeCar() unchanged; makeCar(look) optional. tests/sim/car-look.test.js 6/6, test:sim 79/79, e2e 4/4. UX gate pending human.


# 2026-09-21 — TASK-kaleugit-EP-006-03

- EP-006 Task 03 (Standard): garage / stage map / result screens (src/ui/*, index.html overlays hidden by default); formatDelta unit-tested (CA-006, 7/7), test:sim 80/80, npm test 4/4. #end-lobby-btn kept hidden (main.js still binds it). Not wired yet (EP-006-04). UX gate pending human.


# 2026-09-21 — TASK-kaleugit-EP-006-04

- EP-006 Task 04 (Standard): full flow wired (lobby -> garage -> map -> countdown -> race -> result -> rematch/map/garage) without reload. The player car comes from the saved garage; recordWin/getBest replace race_best_time; bot-first = HUD notice, result when the player crosses; stage name on the race bar. test:sim green, npm test 4/4 (smoke/bot specs follow the new flow). UX gate pending human.


# 2026-09-21 — TASK-kaleugit-EP-007-01

- EP-007 Task 01 (Standard): pure engine model src/audio/engine-model.js (RPM from speed via 5-speed automatic, ratios scaled by the EP-003 gearbox preset, ratio-based drop on upshift, zero-load shift interval, idle 800 / redline 4000, airborne free-rev, firingHz). tests/sim/engine-model.test.js over runRace on Mata Atlântica. `npm run test:sim` 43/43.


# 2026-09-21 — TASK-kaleugit-EP-007-02

- EP-007 Task 02 (Standard): src/sound.js rewritten as an engine-order synth (orders 0.5/1/2/4 of crank Hz, load-driven gains and lowpass, combustion noise AM at firingHz, turbo hiss/whine + blow-off) on createEngineModel; GEARS/virtualSf/shiftDip/overdrive removed; main.js passes { speed, throttle, airborne, turboActive, gearboxPreset }. `npm test` 2/2, `npm run test:sim` 43/43. UX gate pending human.


# 2026-09-22 — TASK-kaleugit-20260922000335

- Root-caused local e2e failures: headless Chromium on SwiftShader ran the game at ~7 FPS. Enabled ANGLE/D3D11 on win32 in playwright.config.js; npm test green again (2 passed).


# 2026-09-22 — TASK-kaleugit-20260922003156

- Moved 9 unused .glb (~160 MB) out of public/ to cut each Vercel deploy from ~192 MB to ~40 MB.


# 2026-09-22 — TASK-kaleugit-20260922003738

- Free-plan 100 deployments/day limit hit by canceled branch deployments; vercel.json now disables all automatic git deployments (main included); production deploy is manual, once, at the end of the cycle (manager decision).


# 2026-09-22 — TASK-kaleugit-20260922014127

- Local e2e flake (4 parallel WebGL games on one GPU) fixed by capping Playwright workers at 2; 3/3 consecutive runs green.


# 2026-09-22 — TASK-kaleugit-EP-006-05

- EP-006 Task 05 (Standard): e2e for CA-001 (flow, all result exits), CA-002 (real Mata win -> Cerrado unlocked after reload), CA-006 (delta == formatDelta of the shown times), CA-007 (garage survives reload; bot half = unit test). Test-only. npm test 9/9 x2, test:sim 86/86. Finding: the reference driver's turbo feathering (Space released for one frame on an empty tank) is what beats the bot; human-rate tapping does not.


# 2026-09-22 — TASK-kaleugit-EP-008-01

- EP-008 Task 01 (Standard): races ~50% shorter. Mata Atlântica 1400 m (ref 39.7 s, bot median 42.8 s), Cerrado 1360 m (ref 40.1 s, bot median 42.8 s, ratio 1.069 < Mata 1.078). CA-009 now 30–45 s. test:sim 86/86. UX gate pending human.


# 2026-09-22 — TASK-kaleugit-EP-008-02

- EP-008 Task 02 (Quick): longer engine-sound gears — ENGINE_DEFAULTS.finalDrive 4.5 -> 3.3 (every gear 1.36x more speed, first upshift ~17-20 m/s, upshifts per race 141 -> 111 across the 6 harness runs). Sound only. `npm run test:sim` 88/88.


# 2026-09-22 — TASK-kaleugit-EP-008-05

- EP-008 Task 05 (Standard): turbo bug fixed at the root (recharge whenever not burning, re-ignite hysteresis turboReigniteFuel 0.25); reference holds Space (Mata 43.0 s, Cerrado 42.9 s); bot recalibrated (TUNING lifts; Cerrado difficulty 0.9): medians 46.3 / 45.5 s, ratios 1.075 / 1.059; 0.1 s tapping beats the bot median by 6.3% / 4.4%. Goldens unchanged. UX gate pending human.
<!-- SESSION_LOG:END -->

---

*Last Updated: YYYY-MM-DD*
