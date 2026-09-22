# TASK-kaleugit-EP-007-02 - Engine-order synthesis + wiring

- Status: COMPLETED
- Priority: 1
- Description: Rewrite src/sound.js with engine-order synthesis (0.5/1/2/4 orders, load-dependent gains/filter, lower pitch 27-133 Hz firing), remove GEARS/virtualSf/overdrive, wire engineSound.update in src/main.js; keep {start, update, stop}; human UX gate. See docs/EPICO-EP-007-som-motor-TASKS.md Task 02.
- Depends On: TASK-kaleugit-EP-007-01
- Blocked By: None
- Branch: TASK-kaleugit-EP-007-02-implement
- Workstreams: [development]
- Execution Mode: Standard
- Last Updated: 2026-09-21 21:30
- Started: 2026-09-21 21:15
- Completed: 2026-09-21 21:30
- Planning: memory-system/task-docs/TASK-kaleugit-EP-007-02-implement-planning-2026-09-21.md
- Report: memory-system/task-docs/TASK-kaleugit-EP-007-02-implement-report-2026-09-21.md
- prior-art: src/sound.js — previous GEARS/virtualSf/shiftDip/overdrive synth replaced; blow-off, turbo noise chain and soft-clip/lowpass structure kept; src/audio/engine-model.js (EP-007-01) consumed as-is
- Evidence: PASS — grep `GEARS|virtualSf|overdriveFreq|shiftDip` in src/sound.js empty; `npm test` 2/2 (e2e with audio active, fails on any console.error/pageerror); `npm run test:sim` 43/43; mock-AudioContext scratch run (60 s of driving, shifts, airborne, turbo toggles, preset change, stop/start) -> 0 non-finite AudioParam values
- Delivery Handoff: DONE (owner: skills/delivery)
- Delivery PR: Pending
- Delivery Status: PR_OPEN

## Autonomous Decisions
- DA-001: update(dt, { speed, throttle, airborne, turboActive, gearboxPreset }) — Criteria: epic Task 02 wiring contract — Rationale: dt comes from the main frame loop (the engine model is time-stepped); a changed gearboxPreset rebuilds the model so the EP-006 garage can swap presets without an API change.
- DA-002: engine model reset in start() (called from startCountdown after resetGame) and in stop() — Criteria: "reset on race restart" — Rationale: one place covers first race, play again and the restart button.
- DA-003: Throttle = keys.up (boolean), including during the countdown — Criteria: manager instruction — Rationale: pre-start revving climbs to the launch clutch-slip RPM (1800), which is realistic.
- DA-004: Order 2 doubled (0 and +7 cents) as the dominant firing voice; 0.5 sine, 1 triangle, 4 sawtooth rising with rpm*load — Criteria: "light detune" + lower pitch — Rationale: the firing order carries the pitch (27-133 Hz); the slow beat gives body without chorus.
- DA-005: Shift sound = the model's ratio RPM drop + zero-load window (gains drop, lowpass closes), smoothed with 25 ms pitch / 40 ms gain time constants — Criteria: remove fixed shiftDip — Rationale: the dip now comes from real engine state.
- DA-006: Turbo hiss/whine audible only while turboActive (the old turbo noise chain was wired but always at gain 0); blow-off kept (threshold rpmNorm > 0.2) — Criteria: "turbo whine/blow-off kept" — Rationale: minimal, level <= 0.06.
- DA-007: No automated Web Audio test added — Criteria: epic DA-001 (synthesis only needs the UX gate) — Rationale: Node has no Web Audio; e2e covers console errors with audio active.
- DA-008: No persona consults — Criteria: runbook — Rationale: contract fully specified.
- UX Gate: pending human (batched at epic end) — realism of shifts and lower tone.
- Delivery Merged At: Pending
