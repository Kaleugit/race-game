# Task Report

## Task Info
- Task ID: TASK-kaleugit-EP-005-02
- Date Started: 2026-09-21 22:20
- Date Completed: 2026-09-21 22:40
- Role/Skill: implement
- Execution Mode: Standard
- Branch: TASK-kaleugit-EP-005-02-implement
- Planning Doc: TASK-kaleugit-EP-005-02-implement-planning-2026-09-21.md

## Summary
- `src/stages/cerrado.stage.js` (new, order 2 -> listed right after Mata Atlântica): finishX 2800, long-wavelength low noise (open savanna). Relief: termite-mound kickers, sandy lowland (dunes), first chapada (14 m escarpment climb, flat table with rock ledges, 15 m drop), red-earth plain with a gully, vereda sandy riverbed, second higher chapada in two steps (9 + 8 m) with table-top kickers, 18 m drop into a sand pan, final savanna run. Max slope 0.71 (Mata 0.86). Sand zones [270,440) [1180,1330) [2150,2280). Visuals: /img/cerrado.jpg, mudLayer false, palette.ground 0x5a2616 (red earth), palette.zones.sand 0xd9b27a. bot.difficulty 0.6.
- Measured (dt 1/60): reference driver (DEFAULT_PARTS) 80.53 s, no chassis contact; bot d=0.6 seeds 1..10: 85.9 84.4 86.0 87.8 86.4 86.9 88.6 85.4 84.5 87.0 (median 86.23 s, +2.7%/-2.1%), ratio 1.071 (Mata 1.078); constant `up` 104.12 s; front-flip driver 121.37 s (8 rightings).
- CA-008 on Cerrado (constant up, padrao): sand-zone crossing times Off-road 6.53 / 5.77 / 4.98 s vs Estrada 9.28 / 8.02 / 6.88 s. Swaps vs Misto/Padrão (104.12 s, 28.88 m/s): estrada 107.20 s / 30.04 m/s; offroad 108.42 s / 27.52; curta 109.50 s / 27.26; longa 101.33 s / 30.07 — all >= 3% on time or max speed.
- Tests: `tests/sim/cerrado.test.js` (registry order/visuals, sand zones + distinct relief, CA-008 per sand zone, CA-008 swaps, ratio Cerrado < Mata and > 1); `tests/e2e/cerrado.spec.js` (/?stage=cerrado to #end-overlay within 150 s, no errors, no fallback warning). CA-004/CA-009 for Cerrado come from the generic tests.
- Measured times recorded in docs/PREREQUISITES.md, pending validation by Kaleu.

## Acceptance Criteria Status
| Criterion | Result | Evidence |
|---|---|---|
| AC-001 CA-009 | PASS | stage-duration.test.js (cerrado): 80.53 s |
| AC-002 CA-004 | PASS | bot.test.js CA-004 (cerrado) |
| AC-003 CA-008 | PASS | cerrado.test.js |
| AC-004 ratio | PASS | 1.071 < 1.078, > 1 |
| AC-005 src scope | PASS | `git diff --name-only origin/main...HEAD -- src` = src/stages/cerrado.stage.js |
| AC-006 tests | PASS | test:sim 63/63; npm test 4/4 (--workers=2) |
| AC-007 UX gate | PENDING HUMAN | batched at epic end |

## Test Evidence
- `npm run test:sim` -> PASS (63/63)
- `npm test -- --workers=2` -> PASS (4/4; cerrado 1.6 min, smoke 1.4 min). With the default 4 workers the countdown `show` check (5 s) failed for one spec in each of 3 runs (stage-data twice, cerrado once): the known local GPU-contention flake, now with two long races in parallel. cerrado.spec.js alone passes (1.7 min). CI does not run e2e.
- `./scripts/validate-changed.sh` -> see validation note
- `./scripts/validate-all.sh` -> N/A locally (TD-001/TD-002); CI runs it

## Files Changed
- src/stages/cerrado.stage.js (new), tests/sim/cerrado.test.js (new), tests/e2e/cerrado.spec.js (new), docs/INDEX-API.md, docs/PREREQUISITES.md, docs/EPICO-EP-005-conteudo-estagios-TASKS.md, task file, planning/report/validation notes, session-log and development notes fragments
