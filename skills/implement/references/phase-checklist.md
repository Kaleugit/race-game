# Phase Checklist For /implement

Use this checklist at each phase transition to verify gate conditions.

## Phase 0 -> Phase 1 Gate

- [ ] Task file exists in `memory-system/tasks/`
- [ ] Task status is `IN_PROGRESS`
- [ ] Execution mode is set (Quick/Standard/Critical)
- [ ] Task branch exists
- [ ] Gate 0 bootstrap risk recorded (if applicable)
- [ ] Mode selected autonomously per `AGENTS.md` decision precedence

## Phase 1 -> Phase 2 Gate (Standard/Critical only)

- [ ] Architecture analysis completed (via `architect` skill)
- [ ] Test strategy defined (via `testing` skill)
- [ ] Security assessment done (Critical only, when applicable)
- [ ] Planning doc created with non-placeholder content
- [ ] Acceptance criteria are testable and binary (PASS/FAIL)
- [ ] Task file updated with `Planning` reference

## Phase 1 -> Phase 3 Gate (Quick only)

- [ ] Inline analysis completed
- [ ] Minimal acceptance criteria defined (at least one verifiable check)
- [ ] Test approach identified
- [ ] Analysis recorded in task file

## Phase 2 -> Phase 3 Gate

- [ ] Human explicitly approved the plan (mandatory for `Critical` only; `Standard` resolves ambiguity via `PROJECT_SPECS.md` Section 10 criteria)
- [ ] No unresolved ambiguity in scope or acceptance criteria
- [ ] Approval noted in planning doc Ready Checklist
- [ ] Mode is confirmed (no pending escalation)

## Phase 3 -> Phase 4 Gate

- [ ] All planned changes are implemented
- [ ] Source code in `src/` (or `*/src/` in monorepo)
- [ ] Commits follow `<type>(task-<github-login>-<task-key>[-<scope>]): <description>` convention
- [ ] Tests from plan have been run during execution
- [ ] No unresolved blockers or scope conflicts
- [ ] No integrity violations (per `INTEGRITY-RULES.md`)

## Phase 4 -> Phase 5 Gate

- [ ] All acceptance criteria have explicit `PASS` status
- [ ] Evidence recorded per mode:
  - Quick: `Evidence` field in task file
  - Standard/Critical: report doc with traceability table
- [ ] No test manipulation or workarounds
- [ ] Requirement traceability complete (Standard/Critical):
  Requirement -> Criterion -> Test -> PASS/FAIL
- [ ] Human confirmed validation results (Critical only; Standard/Quick self-validate)
- [ ] `validate-all.sh` passes (Standard/Critical)

## Phase 5 Completion

- [ ] Session-log fragment written in `memory-system/session-log.d/`
- [ ] Workstream notes fragment written (Standard/Critical)
- [ ] Task remains `IN_PROGRESS` after `/implement` (not `COMPLETED`)
- [ ] `Delivery Handoff: PENDING (owner: human/supervisor)` recorded in task file
- [ ] Human/supervisor explicitly informed to run `/delivery`
