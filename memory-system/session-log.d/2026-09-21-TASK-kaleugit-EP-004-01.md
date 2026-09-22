# 2026-09-21 — TASK-kaleugit-EP-004-01

- EP-004 Task 01 (Standard): src/bot/ (prng mulberry32, bot-driver with createBotDriver/runBotToFinish, bot-preset with BOT_DEFAULT_PARTS/resolveBotParams) and tests/sim/reference-driver.js. Mata Atlântica: reference 17.30 s; bot d=0.5 seeds 1..10 median 18.81 s (-4.2%/+9.5%), all finish and all slower than the reference; stall recovery on the steep climb proven. `npm run test:sim` 53/53. src/main.js untouched (EP-004-02).
