# Tech Debt

AI-facing registry of known technical debt for this repository. One row per item.
Rows whose Status is `open` are surfaced at SessionStart/PostCompact by `project-state.sh`.

- Severity: `low` | `medium` | `high`
- Status: `open` | `resolved`
- ID pattern: `TD-NNN`

| ID | Area | Severity | Description | Created | Status |
|----|------|----------|-------------|---------|--------|
| TD-001 | telemetry | low | On slow hosts (Windows ARM64, ~300ms per git call, ~3s per append-to-orphan.sh) 15 concurrent appends exceed the lock wait cap and drop lines; test-telemetry-orphan.sh "15 concurrent appends" fails under full-suite load. record-event.sh also blocks each hook ~3s. Fix path: detach record-event like statusline-tap, raise cap, poll in stream test. Telemetry is disabled in this project (TASK-kaleugit-20260921172138 report). | 2026-09-21 | open |
| TD-002 | governance | medium | validate-skill-taxonomy.sh requires `../skills` literally; Windows junctions from setup-links.sh store an absolute path, so local validate-all.sh / deliver-to-main.sh always fail on Windows. Fix: accept a link that resolves to ROOT/skills (needs ADR-016 authorization). | 2026-09-21 | open |
