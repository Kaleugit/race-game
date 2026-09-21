# 2026-09-21 — TASK-kaleugit-EP-003-02

- `step` returns `{ chassisContact, landed, righted }` with a real `righted`. State: `chassisLatched` removed; `overturned`, `upsideDownTime` added. Params: `autoRightDelay` 1.5, `chassisFriction` 15, `chassisSettleRate` 6.
- Upside down = `cos(rot - atan(slopeAt(x))) < 0`; while upside down the wheel clamp is skipped (the chassis holds the car) and throttle/turbo are ignored.
- `tests/sim/harness.js` no longer stops on chassis contact; `crashed` = any contact; `rightedTimes` lists auto-rights.
- Righting leaves speed 0: on steep climbs a constant-`up` driver may stall (the EP-004 bot should back up or use turbo).
