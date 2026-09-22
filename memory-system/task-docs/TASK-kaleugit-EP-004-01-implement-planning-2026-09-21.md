# Task Planning

## Task Info
- Task ID: TASK-kaleugit-EP-004-01
- Date: 2026-09-21 21:05
- Role/Skill: implement (no persona consults — DA-007)
- Execution Mode: Standard
- Branch: TASK-kaleugit-EP-004-01-implement
- Depends On: TASK-kaleugit-EP-003-03

## Summary
- Objective: a bot controller that drives a normal createCarPhysics instance with player inputs only (no special physics, no rubber-banding — PROJECT_SPECS §7), its own part preset, a deterministic reference driver, and harness calibration for CA-004/CA-005.

## Scope
### In Scope
- `src/bot/prng.js` (mulberry32), `src/bot/bot-driver.js` (createBotDriver, runBotToFinish), `src/bot/bot-preset.js` (BOT_DEFAULT_PARTS, resolveBotParams).
- `tests/sim/reference-driver.js`, `tests/sim/bot.test.js`, `docs/INDEX-API.md` (regenerated).

### Out of Scope
- `src/main.js` wiring and ghost removal (EP-004-02), bot rendering, per-stage tuning (EP-005), physics changes.

## Requirements
- REQ-001: bot input = `{ up, down, left, right, space, locked: false }`; accelerates; turbo by fuel and terrain; air control to the slope at the predicted landing point.
- REQ-002: errors (reaction delay, throttle lift, turbo misuse) drawn from a seeded PRNG, frequency decreasing with difficulty.
- REQ-003: recovers from a stall on a steep climb (e.g. after auto-right, speed 0) with normal inputs.
- REQ-004: bot params come from stage data only.
- NFR: no Math.random in src/bot; same seed -> same race.

## Acceptance Criteria
- AC-001 (CA-004): Mata Atlântica seeds 1..10 all finish <= 180 s, all within ±15% of the median, median (and every run) slower than the reference driver.
- AC-002 (CA-005 bot): inverted at rest -> righted in [1.3 s, 1.7 s].
- AC-003 (CDC-106): same seed -> same finish time.
- AC-004: resolveBotParams identical with/without garage choices, `stage.bot.parts` absent and present.
- AC-005: `grep -n "Math.random" src/bot/*.js` empty; `npm run test:sim` green.

## Execution Plan
1. PRNG + preset. 2. Reference driver; measure Mata reference time. 3. Bot driver; sweep tuning over seeds/difficulties in a scratch script. 4. Tests. 5. Index regen, validation, delivery.
