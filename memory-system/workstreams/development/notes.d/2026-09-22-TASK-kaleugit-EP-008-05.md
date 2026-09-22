# 2026-09-22 — TASK-kaleugit-EP-008-05

- BASE_PARAMS.turboReigniteFuel 0.25; car state.turboLockout (set when the tank empties while burning, cleared at >= turboReigniteFuel). Tank recharges whenever turboActive is false.
- Bot TUNING errorRate {1.2, 0.4}, liftDuration [0.4, 0.9]; difficulty Mata 0.5, Cerrado 0.9. Difficulty has a weak/noisy effect now.
- EP-008-03 tanks: a smaller/larger tank should keep turboReigniteFuel meaningful (fraction of capacity).
