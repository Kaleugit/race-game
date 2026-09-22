# 2026-09-22 — TASK-kaleugit-EP-008-04

- profile.getGarage() -> { color, tire, gearbox, engine, chassis, tank } (always valid ids; safe for resolveCarParams). race_profile_v1 version stays 1.
- showGarage({ selection, colors, tires, gearboxes, engines, chassis, tanks, onChange, onConfirm }); rows #garage-engines [data-engine], #garage-chassis [data-chassis], #garage-tanks [data-tank]; .garage-sel-trade shows the selected label (visible only at max-height 500px).
- #hud data-engine / data-turbo-capacity / data-mass = resolved params of the current race; #turbobar cells = round(12 x turboCapacity).
- tests/e2e/drive.js pickGarage accepts engine/chassis/tank.
