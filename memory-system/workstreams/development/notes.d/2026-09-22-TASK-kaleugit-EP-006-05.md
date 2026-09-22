# 2026-09-22 — TASK-kaleugit-EP-006-05

- tests/e2e/drive.js: trackErrors, openGarageFromLobby, pickGarage, confirmGarage, startStageFromMap, waitCountdown, driveToFinish (reference turbo policy, frame-aligned KeyboardEvents), resultSeconds.
- Holding Space on an empty tank blocks the recharge; `space: fuel > 0` (one-frame release) is the reference driver's whole advantage (Mata 93.0 s -> 73.7 s). Estrada + Longa is the fastest legal Mata setup (~71 s vs bot ~79 s).
- e2e suite ~5.4 min locally with workers 2.
