# TASK-kaleugit-EP-008-11 - Bot fantasma opcional

- Status: COMPLETED
- Priority: 1
- Description: Manager UX feedback (2026-09-22). See docs/EPICO-EP-008-pecas-corridas-curtas-TASKS.md Task 11.
- Depends On: TASK-kaleugit-EP-008-09, TASK-kaleugit-EP-008-10
- Blocked By: None
- Branch: TASK-kaleugit-EP-008-11-implement
- Workstreams: [development]
- Execution Mode: Standard
- Last Updated: 2026-09-22 21:32
- Completed: 2026-09-22 21:31
- Started: 2026-09-22 19:10
- Planning: memory-system/task-docs/TASK-kaleugit-EP-008-11-implement-planning-2026-09-22.md
- Report: memory-system/task-docs/TASK-kaleugit-EP-008-11-implement-report-2026-09-22.md
- prior-art: bot physics instance + race-bar marker with no mesh (EP-004-02), camera/scroll convention worldX - playerX (src/track/track-scene.js, EP-002-02), makeCar/applyCarLook look handle (EP-006-02), non-destructive profile fields (EP-006-01 / EP-008-04), map screen + shared :root UI tokens (EP-006-03 / EP-008-07 / EP-008-09), pixel-sampling and pairwise-layout e2e (garage-layout.spec.js, hud-layout.spec.js)
- Evidence: PASS — `npm run test:sim` 126/126 (3 new profile-settings cases); `npm test` 31/31 post-merge with origin/main (new ghost-bot.spec.js: toggle default off, flip to on survives a reload, ghost pixels present with the option on and exactly zero with it off; new map-layout.spec.js: the toggle never overlaps the title/stages/LOBBY and needs no scrolling at 1280x720, 1920x1080, 640x360 and 740x360, in both states); `./scripts/validate-changed.sh` PASS; validate-all N/A locally (TD-001/TD-002), CI runs it
- UX Gate: pending human (batched at epic end) — screenshots memory-system/task-docs/TASK-kaleugit-EP-008-11-*.png
- Delivery Handoff: DONE (owner: github-actions)
- Delivery PR: #39
- Delivery Status: MERGED

- Delivery Merged At: 2026-09-22 21:31
## Autonomous Decisions
- DA-001: Ghost = the same Bandeirante mesh with every material made translucent (opacity 0.62, depthWrite off) and blended 60% towards a cold blue, instead of a separate simplified model — Criteria: task asks for "same car model, translucent and visually distinct" — Rationale: one code path, the ghost always matches the real car; keeping 40% of the car's own shading preserves the silhouette against both the misty jungle and the ochre cerrado.
- DA-002: The option lives in the profile as `settings.ghostBot` beside garage/progress, not inside `garage` — Criteria: profile persistence with no destructive migration — Rationale: it is a race/display option, not a car part; `resolveCarParams` must keep receiving only parts.
- DA-003: The ghost is built lazily, on the first race that has the option on, and never while it is off — Criteria: "must not hurt frame rate" — Rationale: the default path pays nothing; building at the countdown (not mid-race) avoids a hitch.
- DA-004: The ghost keeps the bot's turbo flame and is culled beyond `camera.right + 3 m` — Criteria: readability + performance — Rationale: the flame tells the player when the opponent is boosting; off-screen the pivot is hidden and no per-frame math runs.
- DA-005: e2e proves the ghost on real pixels (cold-blue signature on `teste-plano`), with `#hud[data-ghost]` only as a secondary assertion — Criteria: "e2e proving the ghost is visible when on and absent when off" — Rationale: a DOM flag alone would not prove anything is drawn; no new production hook was added.
- DA-006: No persona consults — Criteria: runbook allows at most 2 and the user wants speed over ceremony — Rationale: contained render + UI + profile change with existing precedents for each part.
- Delivery Merged At: Pending
