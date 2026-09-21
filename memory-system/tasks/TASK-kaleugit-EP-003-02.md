# TASK-kaleugit-EP-003-02 - Auto-right after 1.5s upside down (RF-005)

- Status: COMPLETED
- Priority: 1
- Description: In src/physics/car-physics.js track upsideDownTime and right the car at params.autoRightDelay=1.5 keeping x; chassis contact rests the car instead of ending physics. Remove triggerCrash/finalizeCrash/CRASH_AUTO_RESET race reset from src/main.js. CA-005 via tests/sim. See docs/EPICO-EP-003-fisica-carro-TASKS.md Task 02.
- Depends On: TASK-kaleugit-EP-003-01
- Blocked By: None
- Branch: TASK-kaleugit-EP-003-02-implement
- Workstreams: [development]
- Execution Mode: Standard
- Last Updated: 2026-09-21 23:39
- Started: 2026-09-21 20:25
- Completed: 2026-09-21 23:39
- Planning: memory-system/task-docs/TASK-kaleugit-EP-003-02-implement-planning-2026-09-21.md
- Report: memory-system/task-docs/TASK-kaleugit-EP-003-02-implement-report-2026-09-21.md
- prior-art: src/physics/car-physics.js — EP-003-01 checkChassisHitbox (boolean) extended to a penetration depth and reused for the chassis rest; src/main.js triggerCrash/finalizeCrash removed (no existing recovery/righting code)
- Evidence: PASS — `npm run test:sim` 26/26 (6 new in tests/sim/auto-right.test.js incl. CA-005 righted at 1.517s and flip sequence on mata-atlantica finishing; 3 EP-003-01 golden tests unchanged and green), `npm test` 2 passed, `grep -nE "triggerCrash|finalizeCrash|CRASH_AUTO_RESET" src/main.js` empty
- Delivery Handoff: DONE (owner: github-actions)
- Delivery PR: #9
- Delivery Status: MERGED
- UX Gate: pending human (batched at epic end) — timing and look of the auto-right (instant pose change at 1.5s), roof rest and chassis slide

- Delivery Merged At: 2026-09-21 23:39
## Autonomous Decisions
- DA-001: "Upside down" uses the slope ANGLE: `cos(rot - atan(slopeAt(x))) < 0` — Criteria: epic text says "cos(rot - inclinação)"; slopeAt returns dy/dx — Rationale: rot is an angle; atan(slope) is the inclination angle already used by the rotation code. No new definition (side flips follow the same rule), so no human escalation.
- DA-002: Wheels only carry the car while they face the ground (`cos(rot - slope angle) >= 0`); upside down the wheel clamp is skipped and CHASSIS_HITBOX alone holds the car up — Criteria: epic "repousa sobre o chassi (clamp vertical pelos pontos de CHASSIS_HITBOX)" — Rationale: with the old rotation-agnostic wheel clamp an upside-down car floated 0.32 above the ground and a wheel landing snapped it upright instantly. Non-crash runs are unaffected (goldens bit-identical).
- DA-003: Chassis rest = lift y by the deepest hitbox penetration, zero downward vy, grounded, friction `params.chassisFriction = 15` m/s^2, springs relax as in the air, and rotation settles toward the nearest stable pose (wheels or roof) at `params.chassisSettleRate = 6`/s with steering ignored — Criteria: KISS + CDC-002 (values in data) — Rationale: exact translation leaves no penetration or tremor (tested); settling avoids a car hanging on its nose forever.
- DA-004: Upside-down timer counts while overturned AND in ground contact (wheel line reached or chassis contact), resets to 0 otherwise; throttle/turbo ignored while overturned — Criteria: epic "acumula enquanto ... em contato com o chão (rodas ou chassi)" — Rationale: literal rule; an upside-down car must not drive.
- DA-005: Harness no longer stops on chassis contact; `crashed` now means "chassis touched the ground at least once" and `rightedTimes` lists auto-right times — Criteria: behavior change approved by the human (2026-09-21) — Rationale: keeps the existing golden/(c) assertions meaningful (they still assert no chassis contact) without editing them.
- DA-006: Removed the now-dead crash overlay DOM/CSS (`#crashfade`, `#crashtitle`, `#crashprompt`) from index.html — Criteria: YAGNI; epic "deixam de ser acionados" — Rationale: nothing references them; their text ("aguarde 2s ou clique em REINICIAR") is obsolete.
- DA-007: No persona consults (architect/testing) — Criteria: runbook "at most 2 lightweight consults", human preference for speed — Rationale: scope and tests fully specified by the epic Task 02 done criteria.
- Delivery Merged At: Pending
