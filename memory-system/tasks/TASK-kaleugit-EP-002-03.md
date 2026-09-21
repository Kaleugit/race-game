# TASK-kaleugit-EP-002-03 - CA-003 proof: data-only test stage + e2e

- Status: COMPLETED
- Priority: 2
- Description: Add hidden src/stages/teste-plano.stage.js (flat, finishX 200, one sand and one mud zone) and tests/e2e/stage-data.spec.js driving /?stage=teste-plano to #end-overlay. Only src/stages/ and tests/ may change (CA-003). See docs/EPICO-EP-002-motor-estagios-TASKS.md Task 03.
- Depends On: TASK-kaleugit-EP-002-02
- Blocked By: None
- Branch: TASK-kaleugit-EP-002-03-implement
- Workstreams: [development]
- Execution Mode: Quick
- Last Updated: 2026-09-21 19:45
- Started: 2026-09-21 19:40
- Completed: 2026-09-21 19:45
- Evidence: PASS — `npm test` 2 passed (smoke + stage-data), `npm run test:sim` 10/10, CA-003 diff check (see Evidence section)
- prior-art: src/stages/mata-atlantica.stage.js (stage data shape) and tests/e2e/smoke.spec.js (e2e flow) — new files follow them; no existing test stage
- Delivery Handoff: DONE (owner: gohorse/subagent)
- Delivery PR: Pending
- Delivery Status: Pending

## Planning Notes (Quick)
- Scope: 2 new files only — `src/stages/teste-plano.stage.js`, `tests/e2e/stage-data.spec.js`. No engine file (`src/main.js`, `src/track/*`, `src/stages/index.js`, `src/stages/registry.js`) changes: the glob in `src/stages/index.js` discovers the new file.
- Acceptance: (1) CA-003 — source/test diff vs main is only the two new files (plus memory-system/docs metadata and regenerated docs/INDEX-API.md); (2) `npm test` passes smoke.spec.js and stage-data.spec.js; (3) `npm run test:sim` stays green (hidden stage does not change listStages/getDefaultStage).
- Test approach: Playwright e2e (`npm test`) + sim regression (`npm run test:sim`).

## Evidence
- PASS `npm test` — 2 passed (smoke.spec.js, stage-data.spec.js).
- PASS `npm run test:sim` — 10/10.
- PASS CA-003 — `git diff --name-only origin/main...HEAD` source/test paths: `src/stages/teste-plano.stage.js`, `tests/e2e/stage-data.spec.js` only; no edit to src/main.js or src/track/*.
- PASS `./scripts/validate-changed.sh`; `./scripts/validate-all.sh` N/A locally (TD-001/TD-002), CI runs it.

## Autonomous Decisions
- DA-001: Test stage uses `/img/cerrado.jpg` background, `mudLayer: false`, zones sand [60,90) and mud [120,150), palette colors for both zone types, a single low-amplitude noise term — Criteria: task description ("quase plana", existing background in public/img) — Rationale: exercises generic zone rendering for both types without the mud-layer special case.
- DA-002: e2e also asserts no "stage ... not found" console warning — Criteria: CA-003 — Rationale: without it, a silent fallback to the default stage would still pass the flow.
