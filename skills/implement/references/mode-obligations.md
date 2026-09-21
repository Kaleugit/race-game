# Mode Obligations For /implement

Summary of per-mode requirements mapped to `/implement` phases.
Source of truth: `AGENTS.md` Execution Modes section.

Global delivery boundary:
- `/implement` commits only on the task branch.
- PR creation/update is executed only by `/delivery`.
- `/implement` must not invoke `/delivery`; human/supervisor does.

## Quick Mode

### Phase 0 (Context)
- Task file: required (minimal fields)
- Branch: required
- Workstreams: identify relevant ones
- Mode selection is autonomous per `AGENTS.md` decision precedence

### Phase 1 (Analysis)
- Inline by executing agent (no persona delegation)
- Planning: minimal notes in task file (not a separate doc)
- Test strategy: at least one verifiable check (unit or manual)

### Phase 2 (Approval)
- Skipped. Mode selection and scope are autonomous.

### Phase 3 (Execution)
- Implement with minimum scope
- Checkpoints: at completion only

### Phase 4 (Validation)
- Evidence: `PASS/FAIL` + command/check in task file `Evidence` field
- Report doc: not required

### Phase 5 (Delivery Handoff)
- Session-log fragment: required
- Record handoff marker in task file for human/supervisor delivery
- Keep task status `IN_PROGRESS` (no `COMPLETED` in `/implement`)

## Standard Mode

### Phase 0 (Context)
- Task file: required (all standard fields)
- Branch: required
- Mode selection is autonomous per `AGENTS.md` decision precedence

### Phase 1 (Analysis)
- Delegate to `architect` skill: scope analysis, design, contracts
- Delegate to `testing` skill: test strategy, requirement-to-test mapping
- Planning doc: required (`planning-template.md`)
- Test strategy: risk-based selection (unit/integration/e2e/manual)

### Phase 2 (Approval)
- Skipped by default. Ambiguity resolved via `PROJECT_SPECS.md` Section 10 criteria.
- Entered only when Mandatory Escalation Conditions (`AGENTS.md`) apply.

### Phase 3 (Execution)
- Implement per plan
- Checkpoints: after each logical unit of work

### Phase 4 (Validation)
- Delegate to `testing` skill: verify traceability and coverage
- Report doc: required (`report-template.md`)
- Traceability: Requirement -> Criterion -> Test with PASS/FAIL

### Phase 5 (Delivery Handoff)
- Session-log + workstream notes fragments: required
- Record handoff marker in task file for human/supervisor delivery
- Keep task status `IN_PROGRESS` (no `COMPLETED` in `/implement`)

## Critical Mode

### Phase 0 (Context)
- Same as Standard (mode selection is autonomous per `AGENTS.md` decision precedence)

### Phase 1 (Analysis)
- Delegate to `architect`, `testing`, AND `security` skills
- Planning doc: required (`planning-template.md`)
- Test strategy: unit + integration required; e2e when applicable

### Phase 2 (Approval)
- Human approval: mandatory at Architecture and Testing gates

### Phase 3 (Execution)
- Same as Standard with stricter checkpoints
- Security-sensitive changes require extra care

### Phase 4 (Validation)
- Delegate to `testing` AND `security` skills
- Report doc: required with full traceability + explicit evidence per criterion
- Unit + integration tests: mandatory pass

### Phase 5 (Delivery Handoff)
- Full standard flow
- Explicit updates to impacted architecture/contract docs
- Record handoff marker in task file for human/supervisor delivery
- Keep task status `IN_PROGRESS` (no `COMPLETED` in `/implement`)

## Mode Escalation Rules

- Any phase may escalate: Quick -> Standard, Standard -> Critical.
- Triggers for escalation:
  - New risk discovered during analysis or execution.
  - Scope grows beyond Quick criteria (>3 files, contract changes, schema changes).
  - Security or data concerns emerge.
- Downgrade (e.g., Standard -> Quick): allowed only with explicit human
  justification recorded in task artifact.
- After escalation: re-evaluate Phase 1 obligations for the new mode.
  Produce any newly required artifacts before proceeding.
