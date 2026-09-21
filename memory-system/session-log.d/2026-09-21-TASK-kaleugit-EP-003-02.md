# 2026-09-21 — TASK-kaleugit-EP-003-02

- EP-003 Task 02 (Standard): crash restart replaced by RF-005 auto-righting (human-approved behavior change). Chassis contact rests the car on CHASSIS_HITBOX; after 1.5 s upside down on the ground it is set back on its wheels keeping x (`righted: true`). Crash flow and overlay removed from src/main.js/index.html. `npm run test:sim` 26/26 (goldens unchanged), `npm test` 2 passed. UX gate pending human.
