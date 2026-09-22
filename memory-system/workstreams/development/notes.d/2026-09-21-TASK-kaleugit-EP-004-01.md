# 2026-09-21 — TASK-kaleugit-EP-004-01

- `createBotDriver({ track, difficulty, seed, params? })` -> `{ decide(carState, dt) }` returning `{ up, down, left, right, space, locked: false }`; feed it `botCar.state` each frame. Tuning knobs in `TUNING` at the top of src/bot/bot-driver.js.
- `runBotToFinish({ car, driver, track, dt, maxTime, startTime })` returns the finish time on the race clock (pass the current race time as startTime) or null.
- `resolveBotParams(stage)` uses `stage.bot.parts ?? BOT_DEFAULT_PARTS` (misto/padrao).
- `createReferenceDriver(track)` in tests/sim/reference-driver.js is the harness driver for CA-004/CA-009.
