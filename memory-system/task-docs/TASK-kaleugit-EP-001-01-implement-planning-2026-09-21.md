# Task Planning

## Task Info
- Task ID: TASK-kaleugit-EP-001-01
- Date: 2026-09-21 19:00
- Role/Skill: testing
- Execution Mode: Standard
- Branch: TASK-kaleugit-EP-001-01-implement
- Depends On: None

## Summary
- Objective: e2e runner exercising the real game with one command.
- Expected result: `npm test` passes a smoke test of Lobby -> countdown -> race -> end overlay.

## Scope
### In Scope
- @playwright/test + Chromium, playwright.config.js (build+preview webServer), npm test, tests/e2e/smoke.spec.js, .gitignore entries, PREREQUISITES update.
### Out of Scope
- Production code changes; CI integration (ADR-016).

## Requirements
### Functional
- REQ-001: One-command e2e run against the production bundle.
- REQ-002: Smoke covers the current flow and fails on page/console errors.

## Acceptance Criteria
- AC-001: `npm test` exits 0 with 1 passing test.
- AC-002: Smoke fails if #end-overlay does not show within 60s or any pageerror/console.error occurs.
- AC-003: No file under src/ changes.

## Technical Impact
- Files/Modules: package.json, package-lock.json, playwright.config.js, tests/e2e/smoke.spec.js, .gitignore, docs/PREREQUISITES.md
- API/Contract Impact: None
- Data Model / Migration Impact: None

## Test Plan
- Levels: e2e
- REQ-001 -> AC-001 -> npm test
- REQ-002 -> AC-002 -> assertions in smoke.spec.js (timeout 60s, errors == [])
- AC-003 -> git diff --stat origin/main -- src/

## Risks / Open Questions
- Headless WebGL on Windows ARM64 (verified working).

## Ready Checklist
- [x] Task status set to `IN_PROGRESS`
- [x] Acceptance criteria are testable
- [x] Test commands/checks defined
- [x] No unresolved ambiguity with human
