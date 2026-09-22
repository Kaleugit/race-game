# TASK-kaleugit-EP-004-01 - Bot AI driver, bot preset and harness calibration

- Status: COMPLETED
- Priority: 1
- Description: Create src/bot/prng.js (mulberry32), src/bot/bot-driver.js (createBotDriver({track, difficulty, seed}).decide(carState, dt) -> input; runBotToFinish), src/bot/bot-preset.js (BOT_DEFAULT_PARTS, resolveBotParams(stage)) and tests/sim/reference-driver.js. CA-004 on Mata Atlantica (10 seeds, +/-15% of median, slower than reference) and CA-005 for bot. No Math.random. Does not edit src/main.js. See docs/EPICO-EP-004-bot-ia-TASKS.md Task 01.
- Depends On: TASK-kaleugit-EP-003-03
- Blocked By: None
- Branch: TASK-kaleugit-EP-004-01-implement
- Workstreams: [development]
- Execution Mode: Standard
- Last Updated: 2026-09-22 00:42
- Started: 2026-09-21 21:05
- Completed: 2026-09-22 00:41
- Planning: memory-system/task-docs/TASK-kaleugit-EP-004-01-implement-planning-2026-09-21.md
- Report: memory-system/task-docs/TASK-kaleugit-EP-004-01-implement-report-2026-09-21.md
- prior-art: tests/sim/harness.js — runRace reused for all bot/reference races; src/parts/presets.js resolveCarParams reused by resolveBotParams; no existing PRNG or AI driver in src/
- Evidence: PASS — `npm run test:sim` 53/53 (tests/sim/bot.test.js 10/10: CA-004 Mata seeds 1..10 all finish, median 18.81 s, spread -4.2%/+9.5%, all slower than reference 17.30 s; CA-005 bot righted in [1.3,1.7] s; same seed same run; stall recovery on the climb; runBotToFinish; resolveBotParams); `grep -n "Math.random" src/bot/*.js` empty; `npm test` green; src/main.js untouched
- Delivery Handoff: DONE (owner: github-actions)
- Delivery PR: #16
- Delivery Status: MERGED

- Delivery Merged At: 2026-09-22 00:41
## Autonomous Decisions
- DA-001: A bot throttle lift keeps the turbo button on its policy (lift with fuel = turbo without throttle, low top speed) — Criteria: CA-004 "slower than the reference" + CDC-103 — Rationale: measured: a lift that also released turbo recharged the tank and shortened jumps, so "errors" made seeds faster than the reference (16.3-16.7 s vs 17.30 s). With the kept turbo button every error costs time.
- DA-002: Reference driver implemented literally as the epic defines it (up always, space while fuel > 0, air correction beyond 0.6 rad from the slope under the car) — Criteria: task file + epic Task 01 (precedence 2) — Rationale: EP-005 reuses it for CA-009; the error-free bot (17.42 s) is no faster than it, so it is the skilled-human benchmark.
- DA-003: CA-004 test asserts every seed (not only the median) is slower than the reference — Criteria: PROJECT_SPECS CA-004 wording ("tempos ... maiores") — Rationale: stricter superset of the epic's median criterion.
- DA-004: runBotToFinish takes optional startTime (race clock at call) and returns null past maxTime (absolute) — Criteria: CDC-002 — Rationale: EP-004-02 calls it mid-race and needs the finish on the race clock.
- DA-005: createBotDriver accepts optional params (default BASE_PARAMS), used only for GRAVITY in the landing prediction — Criteria: CDC-002 — Rationale: keeps the epic signature; no preset changes gravity.
- DA-006: Stall recovery = turbo run when fuel >= 0.35, else reverse without turbo until fuel >= 0.9 on flat ground (slope < 0.15) or 4 s — Criteria: PROJECT_SPECS §7 (no special physics) — Rationale: normal inputs only; proven by the inverted-at-x-213/empty-tank test where constant up stalls.
- DA-007: No persona consults — Criteria: runbook (speed over ceremony) — Rationale: contracts fully specified in the epic.
- UX Gate: pending human (batched at epic end) — bot plausible and beatable (EP-004-02).
- Delivery Merged At: Pending
