# 2026-09-22 — TASK-kaleugit-EP-008-02

- Engine sound gearing: finalDrive 3.3 (was 4.5). Top gear at maxSpeedTurbo ~2620 rpm; full turbo tops out in 4th on Mata Atlântica. Engine variants (EP-008-03) can override `finalDrive`/`redlineRpm` via createEngineModel options.
- tests/sim/engine-model.test.js keeps a LEGACY `{ finalDrive: 4.5 }` baseline for the ">= 1.3x per gear" and "fewer upshifts" checks.
