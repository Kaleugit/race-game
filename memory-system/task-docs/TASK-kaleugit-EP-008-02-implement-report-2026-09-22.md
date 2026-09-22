# Task Report

## Task Info
- Task ID: TASK-kaleugit-EP-008-02
- Date Started: 2026-09-22 00:25
- Date Completed: 2026-09-22 00:40
- Role/Skill: implement
- Execution Mode: Quick
- Branch: TASK-kaleugit-EP-008-02-implement
- Planning Doc: N/A (Quick)

## Summary
- Manager request: "quero que todas as marchas sejam mais longas (pelo menos o barulho)".
- `src/audio/engine-model.js`: `ENGINE_DEFAULTS.finalDrive` 4.5 -> 3.3. Every gear (all presets) now spans 4.5 / 3.3 = 1.36x more speed; ratios 3.2/2.1/1.5/1.18/0.96, upshift 3600, downshift 1500, idle 800, redline 4000 unchanged. Sound model only; physics untouched.
- Top gear at maxSpeedTurbo: ~2620 rpm (was ~3575), inside [idle, redline] for every preset. Full turbo now tops out in 4th on Mata Atlântica (5th exists but is not reached in a race).

## Calibration (harness, Mata Atlântica, dt 1/60, front-flip driver)
| Preset/driver | First 1->2 upshift speed (before -> now) | Upshifts per race (before -> now) |
|---|---|---|
| curta/throttle | 13.0 -> 17.3 | 21 -> 16 |
| curta/turbo | 13.8 -> 18.4 | 30 -> 23 |
| padrao/throttle | 13.8 -> 18.4 | 17 -> 14 |
| padrao/turbo | 14.8 -> 19.3 | 34 -> 27 |
| longa/throttle | 14.4 -> 19.4 | 2 -> 2 |
| longa/turbo | 15.1 -> 20.1 | 37 -> 29 |
- Total upshifts 141 -> 111. Curta < Padrão < Longa ordering preserved.

## Acceptance Criteria Status
| Criterion | Result (PASS/FAIL) | Evidence |
|---|---|---|
| Every gear speed range >= 1.3x current | PASS | engine-model.test.js "every gear spans >= 1.3x" (static, 5 gears x 3 presets, 1.36x) |
| Fewer upshifts / later first upshift | PASS | engine-model.test.js: first upshift >= 1.25x legacy per run; upshifts <= legacy per run, total strictly fewer |
| RPM in [800, 4000] | PASS | existing every-step test, 6 runs |
| Upshift drop = ratio step (±5%) | PASS | existing test unchanged (>= 2 upshifts per run) |
| Curta < Padrão < Longa | PASS | existing ordering test unchanged |

## Validation
- `npm run test:sim` 88/88; `npm test` 4/4; `./scripts/validate-changed.sh` PASS; `./scripts/validate-all.sh` N/A locally (TD-001/TD-002), CI runs it.
- UX gate: pending human (batched at epic end).

## Decisions
- DA-001: finalDrive 3.3 (not ratio respacing) — uniform 1.36x on every gear, keeps the ratio-step drop and the preset ordering, one constant.
- DA-002: "turbo reaches 5th gear" assertion replaced by "turbo reaches >= 4th" + static "top gear at each preset's turbo top speed inside [idle, redline]" — reaching 5th is incompatible with 1.3x longer gears 1-4 at the unchanged physics top speed (leaving 4th would need ~46 m/s vs 43.3).
- DA-003: in-race first-upshift check uses >= 1.25x (the static range check carries the 1.3x criterion) — the engine lags the wheels (rpmResponse), so the in-race first upshift lands at ~1.30x; finalDrive 3.2 would add margin but drops longa/throttle to 1 upshift, breaking the unchanged ">= 2 upshifts" assertion.
