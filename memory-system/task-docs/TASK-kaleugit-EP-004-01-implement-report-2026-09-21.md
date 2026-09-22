# Task Report

## Task Info
- Task ID: TASK-kaleugit-EP-004-01
- Date Started: 2026-09-21 21:05
- Date Completed: 2026-09-21 21:40
- Role/Skill: implement
- Execution Mode: Standard
- Branch: TASK-kaleugit-EP-004-01-implement
- Planning Doc: TASK-kaleugit-EP-004-01-implement-planning-2026-09-21.md

## Summary
- `src/bot/prng.js`: `createPrng(seed)` mulberry32 -> [0,1).
- `src/bot/bot-driver.js`: `createBotDriver({ track, difficulty = 0.5, seed = 1, params = BASE_PARAMS })` -> `{ decide(carState, dt) }`. Always throttles; turbo while there is fuel except on steep descents (slope here and 12 m ahead < -0.3); in the air, after a seeded reaction delay, a PD-like controller matches `rot` to `atan(slopeAt(predicted landing x))` (ballistic prediction with GRAVITY). Seeded error episodes (rate 0.8/s easy -> 0.2/s hard): throttle lift 0.25-0.6 s (turbo button keeps its policy -> turbo-only, slow), turbo hesitation 0.8-2.2 s, turbo dump (burns the tank regardless of terrain). Stall recovery on climbs (slope > 0.25, speed < 1 m/s for 0.5 s): turbo run if fuel >= 0.35, else reverse (no turbo, tank recharges) until fuel >= 0.9 on flat ground or 4 s, then drive. Upside down: no input (waits for auto-right). All knobs in `TUNING` at the top of the file.
- `runBotToFinish({ car, driver, track, dt = 1/60, maxTime = 180, startTime = 0 })` -> finish time on the race clock, or null past maxTime.
- `src/bot/bot-preset.js`: `BOT_DEFAULT_PARTS = { tire: 'misto', gearbox: 'padrao' }`, `resolveBotParams(stage)`.
- `tests/sim/reference-driver.js`: `createReferenceDriver(track)` — up always, space while fuel > 0, air correction only beyond 0.6 rad from the slope under the car.

## Calibration (Mata Atlântica, difficulty 0.5, dt 1/60)
- Reference driver: 17.30 s.
- Bot seeds 1..10: 19.12, 18.03, 18.42, 20.60, 19.45, 19.27, 18.98, 18.65, 18.55, 18.33 s; median 18.81 s (+8.7% vs reference); spread -4.2% / +9.5%.
- Difficulty 0 median 19.37 s; difficulty 1 median 18.00 s (min 17.42 s, still slower than the reference).
- Stall scenario (inverted at x 213 on the climb, empty tank): constant `up` stalls at x 212.8; the bot backs up to x ~185, runs up with turbo and finishes.

## Acceptance Criteria Status
| Criterion | Result | Evidence |
|---|---|---|
| AC-001 CA-004 | PASS | tests/sim/bot.test.js "CA-004 (Mata Atlântica)..." |
| AC-002 CA-005 bot | PASS | "CA-005 (bot)..." |
| AC-003 reproducibility | PASS | "CDC-106: same seed..." (samples deepEqual) |
| AC-004 bot preset | PASS | "resolveBotParams: stage data only..." |
| AC-005 no Math.random / test:sim | PASS | grep empty; test "no Math.random in src/bot"; 53/53 |
| UX gate | PENDING HUMAN | batched at epic end (EP-004-02: bot plausible and beatable) |

## Test Evidence
- `npm run test:sim` -> PASS (53/53; bot.test.js 10/10)
- `npm test` -> PASS (see validation note)
- `./scripts/validate-changed.sh` -> PASS
- `./scripts/validate-all.sh` -> N/A locally (TD-001/TD-002); CI runs it

## Files Changed
- src/bot/prng.js, src/bot/bot-driver.js, src/bot/bot-preset.js (new)
- tests/sim/reference-driver.js, tests/sim/bot.test.js (new)
- docs/INDEX-API.md (regenerated), docs/EPICO-EP-004-bot-ia-TASKS.md (status), task file, planning/report/validation notes, session-log and development notes fragments
