# 2026-09-22 — TASK-kaleugit-EP-008-14

- `E2E_PORT=<port> npm test` picks the preview port (default 4173). Nothing else hardcodes 4173.
- The governance workflow does NOT run e2e (validate-all only) — the local `npm test` before delivery is the only end-to-end evidence.
