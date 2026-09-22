# Task Planning

## Task Info
- Task ID: TASK-kaleugit-EP-004-02
- Date: 2026-09-21 21:40
- Role/Skill: implement (no persona consults — DA-004)
- Execution Mode: Standard
- Branch: TASK-kaleugit-EP-004-02-implement
- Depends On: TASK-kaleugit-EP-004-01

## Summary
- Objective: replace the fixed-time ghost in src/main.js with a real bot car (createCarPhysics + createBotDriver) whose position feeds the existing race bar.

## Scope
### In Scope
- `src/main.js`: remove updateBot/BOT_* constants and botSpeed/botTurboActive/botTurboCycle; create botCar/botDriver per race; step in tick; botScroll/botFinishTime from botCar.state.x; runBotToFinish when the player finishes first; turbo glow from botCar.state.turboActive.
- `tests/e2e/bot.spec.js`; `docs/INDEX-API.md` (regenerated).

### Out of Scope
- Bot rendering/mesh, mini-map (EP-006), per-stage tuning (EP-005), index.html and src/physics changes.

## Acceptance Criteria
- AC-001: grep for ghost symbols in src/main.js empty; `botCar.step` inside tick.
- AC-002: tests/e2e/bot.spec.js: /?stage=teste-plano, idle player -> #end-result DERROTA, #end-bot-time numeric within 60 s, no pageerror/console.error.
- AC-003: `npm test` and `npm run test:sim` green.
- AC-004 (human): bot plausible and beatable on Mata Atlântica — pending human.

## Execution Plan
1. Wire bot in main.js. 2. Add e2e. 3. Run test:sim + npm test. 4. Index regen, validation, delivery.
