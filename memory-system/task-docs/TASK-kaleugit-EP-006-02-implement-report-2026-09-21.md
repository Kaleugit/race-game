# Task Report

## Task Info
- Task ID: TASK-kaleugit-EP-006-02
- Date Started: 2026-09-21 23:00
- Date Completed: 2026-09-21 23:10
- Role/Skill: implement
- Execution Mode: Quick
- Branch: TASK-kaleugit-EP-006-02-implement
- Planning Doc: N/A (Quick)

## Summary
- `src/car.js`: `export function applyCarLook(carBuilt, { color, tire })`. `color` = CAR_COLORS id (via `getCarColor(id).hex`) or hex number; recolors the body material and the trims that follow it (door creases on the Bandeirante, darker hood/deck on the Besouro) keeping the original trim/body lightness ratio (very dark bodies get a lighter trim). `tire` = `estrada`|`misto`|`offroad` swaps tread lug scale (depth/width/length), tread shade/roughness and the sidewall texture (`makeTireSideTexture(variant)`, cached per variant: estrada adds a thin light stripe, offroad adds chunky shoulder blocks). No new geometry; flat shading kept.
- `makeCar(look?)`: without args identical to before (no applyCarLook call); `look` forwards to applyCarLook. `makeCar()`/`makeBesouro()` return an extra `look` handle (materials + studs + original values). Applying vermelho+misto restores the exact original.
- `makeCarGLB()` has no look handle: applyCarLook returns it unchanged (limitation: GLB materials are not mapped to body/tire).
- `tests/sim/car-look.test.js`: 6 tests in Node with a canvas stub.

## Acceptance Criteria Status
| Criterion | Result | Evidence |
|---|---|---|
| `export function applyCarLook` in src/car.js, only src/car.js changed in src/ | PASS | grep = 1 line; `git diff --stat origin/main...HEAD` |
| makeCar() without args unchanged | PASS | car-look.test.js "without args" + identity snapshot test |
| 10 colors / 3 tires applied, low-poly | PASS | car-look.test.js (all CAR_COLORS; 3 distinct tire looks) |
| `npm run build` and `npm test` green | PASS | build OK; e2e 4/4 |
| Human UX gate (10 colors, 3 tires) | PENDING | UX gate: pending human (batched at epic end) |

## Test Evidence
- `npm run test:sim` -> PASS (79/79; car-look.test.js 6/6)
- `npm run build` -> PASS
- `npm test` -> PASS (4/4, 2.0m)
- `./scripts/validate-changed.sh` -> PASS
- `./scripts/validate-all.sh` -> N/A locally (TD-001/TD-002); CI runs it

## Files Changed
- src/car.js, tests/sim/car-look.test.js (new), docs/INDEX-API.md, docs/EPICO-EP-006-telas-garagem-progressao-TASKS.md, task file, report/validation note, fragments
