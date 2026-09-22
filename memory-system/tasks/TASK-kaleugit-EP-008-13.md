# TASK-kaleugit-EP-008-13 - Modo livre: terreno de 5000 m

- Status: COMPLETED
- Priority: 1
- Description: Manager UX feedback (2026-09-22). See docs/EPICO-EP-008-pecas-corridas-curtas-TASKS.md Task 13.
- Depends On: TASK-kaleugit-EP-008-09, TASK-kaleugit-EP-008-11, TASK-kaleugit-EP-008-12
- Blocked By: None
- Branch: TASK-kaleugit-EP-008-13-implement
- Workstreams: [development]
- Execution Mode: Standard
- Last Updated: 2026-09-22 22:46
- Completed: 2026-09-22 22:45
- Started: 2026-09-22 21:40
- Planning: memory-system/task-docs/TASK-kaleugit-EP-008-13-implement-planning-2026-09-22.md
- Report: memory-system/task-docs/TASK-kaleugit-EP-008-13-implement-report-2026-09-22.md
- prior-art: data-driven stage files + `validateStage` contract (EP-002-01/02), hidden test stage `teste-plano` reached by `?stage=` (EP-002-03), hazard signs derived from `surfaces.zones` (EP-008-12), map screen as the place for pre-race choices and its layout e2e (EP-006-03 / EP-008-09 / EP-008-11), screen modules that take data + callbacks only (`src/ui/result.js`, `src/ui/stage-map.js`), shared `:root` UI tokens and race HUD (EP-008-07), e2e driving helpers in `tests/e2e/drive.js` (EP-006-05 / EP-008-05)
- Evidence: PASS — `npm run test:sim` 137/137 (9 new free-roam cases: stage contract `mode`, 5000 m length, hazard zones per kilometre, feature/slope variety, max slope <= Mata's 0.86, 21 warning signs, drivable end to end in ~158 s with no stall, plus the short `livre-teste` stage); `E2E_PORT=4187 npm test` 34/34 (3 new in `tests/e2e/free-roam.spec.js`: MODO LIVRE from the map with no bot elements and `race_profile_v1` untouched, the BOT FANTASMA option drawing nothing in free roam, and the FIM DO PERCURSO screen with DE NOVO / VOLTAR — `map-layout.spec.js` extended to cover the new card at the same four viewports); `./scripts/validate-changed.sh` PASS; validate-all N/A locally (TD-001/TD-002), CI runs it
- UX Gate: pending human (batched at epic end) — screenshots memory-system/task-docs/TASK-kaleugit-EP-008-13-*.png
- Delivery Handoff: DONE (owner: github-actions)
- Delivery PR: #40
- Delivery Status: MERGED

- Delivery Merged At: 2026-09-22 22:45
## Autonomous Decisions
- DA-001: Free roam is declared by the stage data (`mode: 'free'`), not by a URL flag or a separate code path — Criteria: "a new data-driven stage using only the existing stage data model" — Rationale: one validated field keeps the game loop with a single branch and lets any future terrain opt in without touching `src/main.js`.
- DA-002: The free-roam stages are `hidden` and carry no `bot` block — Criteria: "nothing written to progress"; CA-004/CA-009 must keep passing — Rationale: `listStages()` is what feeds the race ladder, the unlock order and the duration/bot sim tests; a free-roam stage that never appears there cannot be raced or unlocked by accident, and the missing `bot` block makes that structural rather than conventional.
- DA-003: A dedicated `#free-end-overlay` (`src/ui/free-end.js`) instead of reusing `showResult` in a "free" variant — Criteria: "no win/defeat" — Rationale: the result screen is built around VITÓRIA/DERROTA, opponent time, best time and delta; a mode with none of those is clearer as its own small screen module than as four flags inside the existing one.
- DA-004: A second hidden free-roam stage `livre-teste` (180 m) for the e2e — Criteria: "e2e ... plus the end screen", with the epic's speed rule — Rationale: the real 5 km run takes ~2.5 minutes in the browser; the same precedent as `teste-plano` keeps the end-screen spec at ~18 s instead of adding ~5 minutes to every suite run. The 5 km terrain is still driven by the map-entry spec and by the screenshots.
- DA-005: The MODO LIVRE card is teal with an infinity mark instead of the gold numbered rows — Criteria: "visually distinct from the two race stages" — Rationale: colour plus the missing stage number says "mode, not stage" without extra copy; `map-layout.spec.js` now asserts the accent actually differs, so the distinction cannot silently regress.
- DA-006: The BOT FANTASMA option stays visible on the map but is forced off during free roam — Criteria: "no ghost option effect" — Rationale: it is a race option and the player may be heading to a race next; hiding it would make the map twitch, while `setUpGhost` ignoring it in free roam keeps the guarantee where it belongs.
- DA-007: No persona consults — Criteria: the runbook allows at most 2 and the user wants speed over ceremony — Rationale: additive change with an existing precedent for every part (stage data, screen module, map card, e2e helpers).
- Delivery Merged At: Pending
