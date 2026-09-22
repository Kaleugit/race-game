# TASK-kaleugit-EP-004-02 - Real bot in the game loop (remove ghost)

- Status: COMPLETED
- Priority: 1
- Description: In src/main.js replace updateBot/BOT_* ghost with botCar = createCarPhysics + botDriver stepped in tick; botScroll/botFinishTime from botCar.state.x; runBotToFinish when player finishes first; race bar reads bot position; bot has no mesh. Add tests/e2e/bot.spec.js. Owns src/main.js in EP-004. See docs/EPICO-EP-004-bot-ia-TASKS.md Task 02.
- Depends On: TASK-kaleugit-EP-004-01
- Blocked By: None
- Branch: TASK-kaleugit-EP-004-02-implement
- Workstreams: [development]
- Execution Mode: Standard
- Last Updated: 2026-09-21 21:50
- Started: 2026-09-21 21:40
- Completed: 2026-09-21 21:50
- Planning: memory-system/task-docs/TASK-kaleugit-EP-004-02-implement-planning-2026-09-21.md
- Report: memory-system/task-docs/TASK-kaleugit-EP-004-02-implement-report-2026-09-21.md
- prior-art: src/bot/bot-driver.js (createBotDriver, runBotToFinish) and src/bot/bot-preset.js (resolveBotParams) from EP-004-01 reused as-is; src/physics/car-physics.js createCarPhysics reused for the second car; existing #race-bar-bot / #bot-dist HUD and showDefeatScreen/showEndScreen flow kept
- Evidence: PASS — `grep -nE "BOT_FINISH_TIME|BOT_BASE_SPEED|BOT_CYCLE|function updateBot" src/main.js` empty; `grep -n "botCar.step" src/main.js` -> line 482 inside tick; no scene.add for the bot; `npm test` 3/3 (smoke, stage-data, bot: idle player -> DERROTA with numeric bot time); `npm run test:sim` 53/53
- Delivery Handoff: DONE (owner: skills/delivery)
- Delivery PR: Pending
- Delivery Status: PR_OPEN_MANUAL_MERGE

## Autonomous Decisions
- DA-001: botCar/botDriver are rebuilt in resetGame (every race start, incl. restart and play again) and raceIndex++ there — Criteria: epic DA-005 + CDC-002 — Rationale: one place covers all race-start paths; seed varies per rematch.
- DA-002: The bot stops stepping once it crosses finishX (botScroll clamped to finishX); after DERROTA the player keeps racing as before — Criteria: KISS — Rationale: the bar marker stays at the line; no extra physics cost.
- DA-003: If runBotToFinish returns null (bot past 180 s) the end screen shows "—" (existing formatting) — Criteria: CDC-002 — Rationale: no new UI path.
- DA-004: No persona consults — Criteria: runbook (speed over ceremony) — Rationale: wiring fully specified by the epic and EP-004-01 context.
- UX Gate: pending human (batched at epic end) — bot on the race bar plausible and beatable on Mata Atlântica; perceived performance with the second physics instance.
- Delivery Merged At: Pending
