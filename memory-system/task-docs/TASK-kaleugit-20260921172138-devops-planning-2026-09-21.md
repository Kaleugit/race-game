# Task Planning

## Task Info
- Task ID: TASK-kaleugit-20260921172138
- Date: 2026-09-21 14:30
- Role/Skill: devops
- Execution Mode: Standard
- Branch: TASK-kaleugit-20260921172138-devops
- Depends On: None

## Summary
- Objective: `scripts/validate-all.sh` reports three failing harnesses on this Windows (Git Bash, ARM64) checkout; fix each root cause.
- Expected result: `bash scripts/run-tests.sh` exits 0 with every harness passing.
- Authorization: manager approved the fix in-conversation on 2026-09-21 ("aprovo tudo e corrija os erros").

## Scope
### In Scope
- `scripts/tests/test-report-error.sh`: remove. It checks Next.js routes (`app/api/cron/faturamento`, `app/api/cs/...`) from another project (header cites TASK-leorochapinto-EP-004-05); none of that code exists here, so it cannot test anything in this repo.
- `skills/telemetry/scripts/install-hooks.sh`: on Git Bash `git rev-parse --show-toplevel` returns `C:/...` while `pwd -P` returns `/c/...`, so the prefix strip fails and an absolute path is appended to `.gitignore`. Canonicalize `root` with `pwd -P` too.
- `scripts/tests/test-telemetry-orphan.sh`: the no-flock fixture uses `ln -sf` to build a restricted PATH; on MSYS `ln -s` copies the binary away from its DLLs, so every command fails with exit 127. Replace copies with exec shims that keep flock off PATH.

### Out of Scope
- Changing `scripts/run-tests.sh`, `scripts/validate-*`, or CI workflows.
- Changing `append-to-orphan.sh` locking logic (it is not the defect).

## Requirements
### Functional
- REQ-001: Test suite contains only harnesses for code in this repository.
- REQ-002: install-hooks writes a repo-relative sidecar path to `.gitignore` on Git Bash, macOS, and Linux, idempotently.
- REQ-003: The no-flock fixture actually executes commands on Git Bash while still excluding flock.

## Acceptance Criteria
- AC-001: `scripts/tests/test-report-error.sh` no longer exists and nothing references it.
- AC-002: `bash scripts/tests/test-telemetry-install.sh` -> ALL PASS.
- AC-003: `bash scripts/tests/test-telemetry-orphan.sh` -> ALL PASS, including the fixture assertion that flock is absent from the restricted PATH.
- AC-004: `bash scripts/run-tests.sh` exits 0.
- AC-005: Re-running install-hooks on the real repo leaves exactly one `.claude/telemetry-statusline.json` line in `.gitignore`.

## Technical Impact
- Files/Modules: the three files above.
- API/Contract Impact: None
- Data Model / Migration Impact: None

## Test Plan
- Levels: integration (bash harnesses)
- REQ-001 -> AC-001 -> `test ! -e scripts/tests/test-report-error.sh && ! grep -rn test-report-error scripts skills`
- REQ-002 -> AC-002, AC-005 -> test-telemetry-install.sh; install-hooks.sh + `grep -cxF`
- REQ-003 -> AC-003 -> test-telemetry-orphan.sh
- All -> AC-004 -> run-tests.sh

## Risks / Open Questions
- Shims must not reintroduce flock on PATH; the existing fixture assertion guards this.
- Fixes are boilerplate-level; worth upstreaming to agentes-oda.

## Ready Checklist
- [x] Task status set to `IN_PROGRESS`
- [x] Acceptance criteria are testable
- [x] Test commands/checks defined
- [x] No unresolved ambiguity with human
