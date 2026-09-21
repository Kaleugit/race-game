# Task Planning

## Task Info
- Task ID: TASK-kaleugit-20260921180706
- Date: 2026-09-21 15:07
- Role/Skill: devops
- Execution Mode: Standard
- Branch: TASK-kaleugit-20260921180706-devops
- Depends On: TASK-kaleugit-20260921172138

## Summary
- Objective: make the `governance` check able to pass on clean CI checkouts.
- Expected result: validate-skill-taxonomy.sh no longer reports "missing symlink" on CI.
- Authorization (ADR-016): the project manager explicitly authorized both actions in-conversation on 2026-09-21 ("ok" to: add `bash scripts/setup-links.sh` to governance.yml; restore +x on the 13 CI-scope scripts).

## Scope
### In Scope
- .github/workflows/governance.yml: one step line `bash scripts/setup-links.sh` before validate-all.sh.
- Mode 100644 -> 100755 on scripts/validate-* (9), scripts/reconcile-*.sh (3), scripts/run-tests.sh.

### Out of Scope
- Changing validators; tracking the links in git (project decision: not versioned, see scripts/setup-links.sh header).
- The other 61 *.sh mode fixes (delivered in TASK-kaleugit-20260921172138, PR #2).

## Requirements
### Functional
- REQ-001: CI creates .claude/skills and .agents/skills -> ../skills before validation.
- REQ-002: CI-scope scripts executable in git.

## Acceptance Criteria
- AC-001: The PR governance run has no "missing symlink" error.
- AC-002: `git ls-files -s` shows 100755 for the 13 scripts.

## Technical Impact
- Files/Modules: .github/workflows/governance.yml, 13 scripts (mode only)
- API/Contract Impact: None
- Data Model / Migration Impact: None

## Test Plan
- Levels: integration (CI run)
- REQ-001 -> AC-001 -> governance job log on this PR
- REQ-002 -> AC-002 -> git ls-files -s

## Risks / Open Questions
- CHANGELOG.md absence is a separate failure, fixed by a docs-only commit on main.

## Ready Checklist
- [x] Task status set to `IN_PROGRESS`
- [x] Acceptance criteria are testable
- [x] Test commands/checks defined
- [x] No unresolved ambiguity with human
