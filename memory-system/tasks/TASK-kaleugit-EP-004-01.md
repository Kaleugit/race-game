# TASK-kaleugit-EP-004-01 - Bot AI driver, bot preset and harness calibration

- Status: PENDING
- Priority: 1
- Description: Create src/bot/prng.js (mulberry32), src/bot/bot-driver.js (createBotDriver({track, difficulty, seed}).decide(carState, dt) -> input; runBotToFinish), src/bot/bot-preset.js (BOT_DEFAULT_PARTS, resolveBotParams(stage)) and tests/sim/reference-driver.js. CA-004 on Mata Atlantica (10 seeds, +/-15% of median, slower than reference) and CA-005 for bot. No Math.random. Does not edit src/main.js. See docs/EPICO-EP-004-bot-ia-TASKS.md Task 01.
- Depends On: TASK-kaleugit-EP-003-03
- Blocked By: None
- Branch: TASK-kaleugit-EP-004-01-implement
- Workstreams: None
- Execution Mode: Standard
- Last Updated: 2026-09-21 19:00
