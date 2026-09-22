# 2026-09-21 — TASK-kaleugit-EP-004-02

- EP-004 Task 02 (Standard): fixed-time ghost removed from src/main.js; the opponent is now a second createCarPhysics instance driven by createBotDriver (seed = session race counter), rebuilt per race in resetGame, no mesh; its x feeds #race-bar-bot/#bot-dist; runBotToFinish gives the bot time when the player wins. New tests/e2e/bot.spec.js (idle player on teste-plano -> DERROTA). `npm test` 3/3, `npm run test:sim` 53/53. UX gate pending human.
