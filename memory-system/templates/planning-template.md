# Task Planning

Unified task artifact for scope, requirements, execution plan, and validation.
Use for `Standard` and `Critical` tasks. Optional for `Quick`.

## Task Info
- Task ID: TASK-<github-login>-<task-key>
- Date: YYYY-MM-DD HH:MM
- Role/Skill: [role/skill]
- Execution Mode: Quick | Standard | Critical
- Branch: TASK-<github-login>-<task-key>-[role|workstream]
- Depends On: None | TASK-<github-login>-<task-key>

## Summary
- Objective: [one clear objective]
- Expected result: [observable outcome]

## Scope
### In Scope
- [item]

### Out of Scope
- [item]

## Requirements
### Functional
- REQ-001: [requirement]

### Non-Functional
- [performance/security/reliability requirement when relevant]

## Acceptance Criteria
- AC-001: Given [context], when [action], then [observable result]
- AC-002: [measurable criterion]

## Technical Impact
- Files/Modules: [list]
- API/Contract Impact: [None | description]
- Data Model / Migration Impact: [None | description]

## Execution Plan
1. [step]
2. [step]
3. [step]

## Test Plan
- Levels: unit | integration | e2e | manual
- Requirement -> Criterion -> Test:
  - REQ-001 -> AC-001 -> [command/check]
- PASS/FAIL rule per criterion:
  - AC-001: PASS when [observable result]

## Risks / Open Questions
- [risk or question]

## Ready Checklist
- [ ] Task status set to `IN_PROGRESS`
- [ ] Acceptance criteria are testable
- [ ] Test commands/checks defined
- [ ] No unresolved ambiguity with human
