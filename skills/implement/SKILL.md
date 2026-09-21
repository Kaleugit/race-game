---
name: implement
description: >
  Use this skill to orchestrate end-to-end task implementation: context loading,
  analysis delegation to persona skills, human approval gates, execution with
  checkpoints, validation, and delivery handoff to human/supervisor.

metadata:
  kind: workflow
---

# Implement Skill

Entry point for executing tasks end-to-end. The executing agent follows this
recipe directly, delegating judgment to persona skills at defined phases.
All human interaction flows through the executing agent — persona skills
provide analysis, the agent presents findings and mediates approvals.

Supports Quick, Standard, and Critical execution modes with resumable phases.

## When To Use
- Human has a task to implement (new feature, bug fix, refactor, enhancement).
- Task may or may not already exist in `memory-system/tasks/`.
- Works for all execution modes (Quick, Standard, Critical).
- Covers the full lifecycle: context -> analysis -> approval -> execution -> validation -> delivery handoff.

## Inputs To Read
Assume baseline context from `AGENTS.md` is already loaded.

1. `memory-system/2-tasks.md` (task index)
2. `memory-system/tasks/TASK-<github-login>-<task-key>.md` (if task ID provided)
3. `docs/PROJECT_SPECS.md` (functional source of truth)
4. `memory-system/1-project-context.md`
5. Latest entries in `memory-system/session-log.md` and `memory-system/session-log.d/*.md`
6. `memory-system/workstreams/architect/notes.md` (if exists)
7. Workstream notes for task-relevant workstreams
8. Existing task-docs for the task: `memory-system/task-docs/TASK-<github-login>-<task-key>-*`

## Resume Detection

Before starting from Phase 0, check existing artifacts to detect where a
previous session left off. This enables seamless session continuity.

Detection algorithm:
1. No task file exists -> Phase 0 (create task)
2. Task file exists, status `PENDING` -> Phase 0 (load context, set IN_PROGRESS)
3. Task file exists, status `IN_PROGRESS`, no planning doc -> Phase 1 (analysis)
4. Task file exists, planning doc exists, no approval marker -> Phase 2 (plan approval)
5. Task file exists, planning approved, no report doc -> Phase 3 (execution)
6. Task file exists, validation evidence is incomplete -> Phase 4 (validation)
7. Task file exists, validation evidence is complete, no handoff marker -> Phase 5 (delivery handoff)
8. Task file exists, handoff marker exists -> implementation done, awaiting human/supervisor delivery
9. Task `COMPLETED` -> already done, report status
10. Task `BLOCKED` -> report blocker and ask human

Report detected phase to human and resume immediately without waiting for
confirmation. Exception: if detected state is `BLOCKED`, report blocker and
wait for human resolution.

For detailed path patterns and edge cases: `references/resume-detection.md`.

## Mode Classification

Apply mode selection precedence from `AGENTS.md`:
1. Explicit human decision (highest priority).
2. Automatic risk classification by agent.
3. Default to `Standard` when uncertain.

Quick mode criteria: low risk, no contract/schema/infra change, up to 3 files, estimated effort up to 2h.
Critical mode triggers: security changes, data migration, breaking contracts, high regression risk.

Record chosen mode in task file. Mode escalation is allowed at any phase.
For per-mode artifact requirements: `references/mode-obligations.md`.

## Phase 0: Context

**Goal:** Establish task identity, load context, prepare workspace.

Steps:
1. If task ID provided: read existing task file, load all referenced artifacts.
   This is mechanical — do not ask permission to read or follow the canonical file.
2. If description provided (no task ID): create task file using
   `memory-system/templates/task-template.md`. Generate ID via
   `./scripts/generate-task-id.sh --login <github-login>`.
   This is mechanical — do not ask permission to create the file.
3. Check Gate 0 bootstrap status.
   - If status is `READY_FOR_EXECUTION`, proceed.
   - If status is `PRE_BOOTSTRAP`/`INCOMPLETE`/`COMPLETE`, pause and ask for explicit human override before implementation flow.
4. Classify execution mode (or confirm human choice).
5. Identify relevant workstreams (reuse existing or create new per `AGENTS.md` rules).
6. Enforce isolated worktree before coding:
   - create/use task branch `TASK-<github-login>-<task-key>-implement`
   - create/use dedicated worktree via `./scripts/create-worktree.sh --task TASK-<github-login>-<task-key> --suffix implement`
   - if running in a shared workspace, pause and move execution to a task worktree.
   - **verify isolation before the first write** (do not trust provisioning — anthropics/claude-code #33045/#51596): from the worktree run `./scripts/assert_isolated.sh --expected-branch TASK-<github-login>-<task-key>-implement --require-clean`. If it exits non-zero, ABORT (mark `BLOCKED`, blocker "worktree isolation unverified") — never guess a worktree or `cd` into another session's worktree.
7. Mark task as `IN_PROGRESS`, update `Last Updated`.
8. If task is epic-linked (ID contains `EP-XXX`), update task Status to
   `IN_PROGRESS` in the corresponding `docs/EPICO-<ID>-<slug>-TASKS.md`.
   This is mechanical — do not ask permission.

Delegations: none.
Human interaction: none for mechanical steps. Mode selection is autonomous
using existing rules plus `PROJECT_SPECS.md` Section 10 criteria. Report
chosen mode to human without waiting for confirmation. Task file
creation/loading, worktree setup, and following the canonical file are
mechanical steps — do not ask permission for these. The canonical task file
is the source of truth by governance (`gen-tasks` creates it; `implement`
follows it).

**Gate to Phase 1:**
- Task file exists in `memory-system/tasks/`.
- Task status is `IN_PROGRESS`.
- Execution mode is set and recorded.
- Task branch exists.
- Dedicated task worktree exists and is in use.
- Worktree isolation verified (`./scripts/assert_isolated.sh` exit 0); if it cannot be verified, ABORT — never proceed from a non-isolated or guessed worktree.

## Phase 1: Analysis

**Goal:** Understand scope, define design and test strategy.

This phase has two paths based on execution mode.

### Quick Mode (inline analysis)

The executing agent performs a brief analysis directly:
1. Identify scope: affected files, modules, boundaries.
2. Define minimal acceptance criteria (at least one verifiable check).
3. Identify test approach (unit check, manual verification, or both).
4. Record analysis as minimal planning notes in the task file itself.

No persona delegation. No separate planning or spec doc required.

**Gate to Phase 3** (skip Phase 2):
- Inline analysis complete with acceptance criteria.
- Human confirmed scope at Phase 0.

### Standard/Critical Mode (delegated analysis)

Delegate judgment to persona skills. These delegations can run in parallel
when the provider supports it.

1. **Delegate to the `architect` skill:**
   Analyze task scope against `docs/PROJECT_SPECS.md`. Identify architecture
   impacts, define contracts if needed, propose implementation approach with
   trade-offs. Produce architecture assessment per the architect skill's
   quality bar.

2. **Delegate to the `testing` skill:**
   Define test strategy based on risk. Map requirements to acceptance criteria
   to tests. Select test levels (unit/integration/e2e/manual). For frontend/UI
   tasks the strategy MUST include e2e covering functional wiring (Playwright MCP
   preferred, claude-in-chrome fallback) per `skills/testing/SKILL.md` § Frontend
   e2e. Ensure criteria
   are measurable and binary (PASS/FAIL).

3. **Critical only — delegate to the `security` skill** (when task involves
   auth, data, APIs, or infrastructure boundaries):
   Identify threat surface, define minimum security controls, produce findings
   with severity ratings.

4. Consolidate delegation outputs into a unified planning doc using `memory-system/templates/planning-template.md`.
5. Update task file with the `Planning` reference.

**Gate to Phase 2 (when required):**
- Planning doc exists with non-placeholder content.
- Acceptance criteria are defined, testable, and binary.
- Approval requirement decision recorded:
  - `Critical`: always requires Phase 2 approval.
  - `Standard`: requires Phase 2 only when ambiguity or high risk exists.

## Phase 2: Plan Approval

**Applies to Critical always.**
**Standard mode skips this phase** — ambiguity is resolved via `PROJECT_SPECS.md`
Section 10 criteria. Phase 2 is entered for Standard only when Mandatory
Escalation Conditions (`AGENTS.md`) apply.
Quick mode skips this phase.

**Goal:** Get human sign-off on the implementation plan.

Steps:
1. Present consolidated plan to human: objectives, scope, architecture
   decisions, test strategy, risks, acceptance criteria.
2. Format as a concise summary with links to full artifacts.
3. If human requests changes: update artifacts, re-present.
4. If human identifies new risks requiring mode escalation: escalate per
   `AGENTS.md` rules and repeat Phase 1 for new mode requirements.

Human interaction:
- Critical: mandatory approval.
- Standard: only when Mandatory Escalation Conditions apply.
- Human may approve, request changes, or escalate mode.

**Gate to Phase 3:**
- Explicit human approval obtained (Critical always; Standard only when
  Mandatory Escalation Conditions required Phase 2).
- Approval noted in planning doc (Ready Checklist).
- No unresolved ambiguity in scope or acceptance criteria.

## Phase 3: Execution

**Goal:** Implement the planned changes with minimum necessary scope.

Steps:
1. Follow the plan from Phase 1/2.
2. Implement with KISS/YAGNI principles (Golden Rules from `AGENTS.md`).
3. Application source code goes in `src/` (or `*/src/` in monorepo).
4. Commit format: `<type>(task-<github-login>-<task-key>[-<scope>]): <description>`.
5. Use selective `git add` (never `git add -A` or `git add .`).
6. Commit only on the task branch; do not open/update PR in this phase.
   **Never use `--no-verify`** — a hook that blocks the commit signals a real
   problem; fix the cause, do not bypass it.
7. **Post-commit source-presence guard (before declaring the task done).** Run
   `git diff --stat origin/main...HEAD` — the task branch's full diff vs its merge
   base, **not** `git show --stat HEAD` alone (a task may span several checkpoint
   commits; a file committed earlier won't appear in `HEAD` and checking only
   `HEAD` would falsely fail a complete task). Confirm the source files the task
   was meant to produce actually entered the branch (not just docs/metadata). A
   forgotten `git add` or a `--no-verify`-masked hook yields a "green" commit with
   the source missing — a dead feature with green history. If the expected source
   is absent from the range diff, the task is NOT done: stop and fix, do not mark
   it complete.

Checkpoints (Standard/Critical):
- After each logical unit of work, run relevant tests.
- If a test fails: fix before proceeding (per `INTEGRITY-RULES.md`).
- If stuck or scope grows beyond plan: pause and report to human.

Smoke subset for the dev loop (`--smoke`):
- During iteration, agents may run a focused subset instead of the full suite.
- Resolve the subset by running `scripts/list-smoke-tests.sh --diff-base main`
  in the task worktree. The script combines a default heuristic (`__tests__/`
  siblings and mirrored `tests/<dir>/`) with an optional project override at
  `.governance/smoke-tests.conf`. Empty output means "nothing to scope" — fall
  back to the full suite.
- Pipe the output to the project's test runner. Example: `xargs -r pytest`,
  `xargs -r npx jest`, `xargs -r go test`.
- The smoke subset is for speed during dev. **Phase 4 validation always runs
  the full suite** regardless of any `--smoke` use earlier.

Tactical delegations during execution:
- If implementation encounters design questions not covered in Phase 1:
  delegate focused review to the `architect` skill.
- If security concerns arise during coding: delegate to the `security` skill.
- These are tactical consultations, not full-phase delegations.

Human interaction:
- If scope conflict, dependency conflict, or regression risk appears: attempt
  resolution using `PROJECT_SPECS.md` Section 10 criteria first. If criteria
  are insufficient or Mandatory Escalation Conditions (`AGENTS.md`) apply,
  pause and escalate to human.
- If expected behavior is ambiguous: resolve using `PROJECT_SPECS.md` Section
  10 criteria. Document the resolution as a `DA-xxx` entry. Escalate only if
  Mandatory Escalation Conditions (`AGENTS.md`) apply.

**Gate to Phase 4:**
- All planned changes are implemented.
- Tests defined in Phase 1 have been run.
- No unresolved blockers or scope conflicts.

## Phase 4: Validation

**Goal:** Collect evidence that acceptance criteria are met.

### Quick Mode

1. Run tests and collect results.
2. Record `Evidence` in task file: `PASS/FAIL` + executed command/check.
3. Present summary to human.

### Standard/Critical Mode

1. Run `./scripts/validate-all.sh` plus task-specific tests.
2. **Delegate to the `testing` skill:** verify all acceptance criteria have
   evidence, check requirement-to-test traceability, confirm no test
   manipulation or workarounds. For frontend/UI tasks, require e2e evidence of
   functional wiring (Playwright MCP / claude-in-chrome); without it the criterion
   is `FAIL`, never handed to the human (`skills/testing/SKILL.md` § Frontend e2e).
3. **Critical only — delegate to the `security` skill** (when task touched
   security-sensitive areas): final security review of implemented changes.
4. Create report using `memory-system/templates/report-template.md`.
5. Update task file with `Report` reference.

Human interaction: present validation summary. For Critical mode, human
confirms results or requests fixes. For Standard/Quick, self-validate
against acceptance criteria and proceed. If fixes needed, return to Phase 3.
For frontend tasks, any human confirmation is limited to **UX**; functional/
wiring correctness is self-validated by the agent via e2e and never handed to
the human (`AGENTS.md` § Non-Escalable: verification of non-UX behavior).

**Gate to Phase 5:**
- All acceptance criteria have explicit `PASS` status.
- Report complete (Standard/Critical) or Evidence recorded (Quick).
- Requirement traceability complete (Standard/Critical).
- No test manipulation or workarounds.
- Human confirmed validation (Critical only; Standard/Quick self-validate).

For full gate checklist: `references/phase-checklist.md`.

## Phase 5: Delivery Handoff

**Goal:** Finalize memory and hand off delivery execution to human/supervisor.

Steps:
1. Create session-log fragment in `memory-system/session-log.d/`.
   Use `memory-system/templates/chatlog-template.md`.
2. Create workstream notes fragments for task-relevant mapped workstreams.
   - Use the task `Workstreams` field as the source of truth.
   - Resolve aliases via `memory-system/workstreams/aliases.conf`.
   - Write fragments to `memory-system/workstreams/<mapped-workstream>/notes.d/`.
   - Use `memory-system/templates/notes-template.md`.
3. Keep task status as `IN_PROGRESS` (do not mark `COMPLETED` in `/implement`).
4. Record handoff marker in the task file:
   - `Delivery Handoff: PENDING (owner: human/supervisor)`
   - update `Last Updated`.
5. Present final implementation summary and explicitly request the next actor
   to run `/delivery` from the task branch.

`/implement` does not invoke `/delivery`. Delivery validation, PR creation,
CI gate, and merge are executed by human/supervisor through `/delivery`.

## Autonomy Policy

- Default to autonomous execution. Resolve ambiguity from `PROJECT_SPECS.md` Section 10 criteria.
- Never ask for phase change confirmation. Resume from detected phase automatically.
- Never ask for mode confirmation. Apply mode selection rules autonomously.
- Phase 2 approval: mandatory for Critical only. Standard resolves ambiguity via criteria.
- Phase 4 human confirmation: Critical only. Standard/Quick self-validate.
- Document autonomous decisions in task report (Standard/Critical) or task Evidence (Quick) under "Decisoes Autonomas".
- Escalate only for Mandatory Escalation Conditions (`AGENTS.md`).

## Mandatory Rules

1. Never skip Phase 1 analysis, even in Quick mode (inline analysis is required).
2. Never proceed past a gate without meeting all its conditions.
3. Never mark a task as `COMPLETED` in `/implement`.
4. Follow `INTEGRITY-RULES.md` throughout execution.
5. If expected behavior or acceptance criteria are ambiguous at any phase:
   resolve using `PROJECT_SPECS.md` Section 10 criteria. Document the
   autonomous decision. Escalate to human only when Mandatory Escalation
   Conditions (`AGENTS.md`) apply.
6. Mode escalation (Quick->Standard, Standard->Critical) is allowed at any
   phase. Downgrade requires explicit justification in the task artifact.
7. Use existing templates from `memory-system/templates/`. Do not create new ones.
8. Application source code must go in `src/` (or `*/src/` in monorepo).
9. `/implement` only commits on the task branch and never opens/updates PR.
10. `/implement` must not invoke `/delivery`; handoff is mandatory.
11. This workflow does not replace persona skills for standalone analysis.
   The `architect` skill remains available for pure architecture work outside
   of task implementation.
12. When updating task status in the canonical file (`IN_PROGRESS`, `BLOCKED`),
   also propagate the same status to `docs/EPICO-<ID>-<slug>-TASKS.md` if the
   task is epic-linked. This is mechanical — do not ask permission.

## Required Outputs

By mode:
- **Quick:** task file with Evidence field, session-log fragment.
- **Standard:** task file, spec-lite, planning doc, report doc, session-log
  and workstream notes fragments.
- **Critical:** task file, full spec, planning doc, report doc, session-log
  and workstream notes fragments.

All modes: explicit handoff for external `/delivery` execution
(human/supervisor responsibility).

## Reference Files
- Resume detection guide: `references/resume-detection.md`
- Mode obligations summary: `references/mode-obligations.md`
- Phase gate checklist: `references/phase-checklist.md`
