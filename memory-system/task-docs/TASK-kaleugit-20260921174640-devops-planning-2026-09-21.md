# Task Planning

## Task Info
- Task ID: TASK-kaleugit-20260921174640
- Date: 2026-09-21 14:50
- Role/Skill: devops
- Execution Mode: Standard
- Branch: TASK-kaleugit-20260921174640-devops
- Depends On: None

## Summary
- Objective: Manager decided (in-conversation, 2026-09-21: "desligue a telemetria pra esse projeto") to turn telemetry off for race-game.
- Expected result: no telemetry hook or statusLine runs; governance hooks unchanged; the decision survives upstream syncs.

## Scope
### In Scope
- Remove every hook whose command lives under skills/telemetry/ and the statusLine key from .claude/settings.json (delegate sidecar was empty: no prior statusLine to restore).
- ADR-019 in docs/decisions.md.
- Opt-out guard in skills/update-upstream/SKILL.md step 7.

### Out of Scope
- Deleting skills/telemetry/, its tests, the remote telemetry branch, or the Vercel Ignored Build Step.

## Requirements
### Functional
- REQ-001: No telemetry hook/statusLine configured.
- REQ-002: Governance hooks (gen-governance-core, cc-watch) intact.
- REQ-003: update-upstream documents the skip.

## Acceptance Criteria
- AC-001: grep -c telemetry .claude/settings.json == 0 and the file is valid JSON.
- AC-002: validate-system.sh reports all PASS (hooks for SessionStart, PostCompact, SubagentStart, UserPromptSubmit, PostToolUse still registered).
- AC-003: update-upstream step 7 contains the ADR-based opt-out before the telemetry re-install bullet.

## Technical Impact
- Files/Modules: .claude/settings.json, docs/decisions.md, skills/update-upstream/SKILL.md
- API/Contract Impact: None
- Data Model / Migration Impact: None

## Test Plan
- Levels: integration (config checks)
- REQ-001 -> AC-001 -> grep + python json.load
- REQ-002 -> AC-002 -> skills/gen-governance-core/scripts/validate-system.sh
- REQ-003 -> AC-003 -> grep ADR-019 skills/update-upstream/SKILL.md

## Risks / Open Questions
- Current session keeps the old hooks until the change reaches main and a new session starts.

## Ready Checklist
- [x] Task status set to `IN_PROGRESS`
- [x] Acceptance criteria are testable
- [x] Test commands/checks defined
- [x] No unresolved ambiguity with human
