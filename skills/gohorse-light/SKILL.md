---
name: gohorse-light
description: Use this sequential, dependency-free workflow skill to execute an approved epic end-to-end with minimal human interaction by orchestrating implement and delivery per task via dedicated subagents (one task at a time, Agent tool, text-marker returns). It is the stable fallback for `gohorse` when the native Workflow/worktree primitive is unavailable.

metadata:
  kind: workflow
---

# Gohorse-Light Skill

This workflow executes one approved epic with an autonomy-first strategy,
**sequentially** (one task at a time) using the Agent tool — no native Workflow
tool, no worktree-isolation primitive, no parallelism. It is the dependency-free
**stable fallback** for the default `gohorse` skill: prefer `gohorse` unless its
Preflight reports a missing correctness-critical primitive (Workflow execution,
worktree isolation, schema return, shared `.git`, or the delivery allowlist).

Each task is delegated to a dedicated subagent with isolated context.
The orchestrator accumulates inter-task context and manages validation
between tasks. Human interaction is minimized to epic-level decisions.

## When To Use
- Human asks to execute a full epic with minimal interaction.
- Epic tasks are already defined (e.g., `docs/EPICO-<ID>-<slug>-TASKS.md`).
- Deterministic orchestration of implement + delivery per task is needed.

## Inputs To Read
1. `AGENTS.md`
2. `docs/PROJECT_SPECS.md`
3. `docs/EPICOS.md` (if present)
4. Target epic task list doc (e.g., `docs/EPICO-<ID>-<slug>-TASKS.md`)
5. `memory-system/2-tasks.md`
6. Task files for the epic in `memory-system/tasks/`
7. `memory-system/workstreams/aliases.conf`
8. `skills/implement/SKILL.md`
9. `skills/delivery/SKILL.md`
10. `skills/gohorse/references/subagent-prompt-template.md`
11. `skills/gohorse/references/orchestration-model.md`

## Autonomy Policy
- Default behavior is autonomous execution.
- Canonical decision precedence: `AGENTS.md` "Autonomous Decision-Making" section.
- Resolve doubts from `implement` and `delivery` using this specialization:
  1. Explicit human decision (overrides everything).
  2. Task file fields and linked task artifacts (`Planning`, `Report`).
  3. `docs/PROJECT_SPECS.md` Section 10 criteria (project-specific first, then defaults).
  4. Epic task list, existing code conventions, and previously completed tasks in the same epic.
  5. Conservative assumptions that preserve reversibility, documented in task artifacts.
- Escalate to human only for high-uncertainty conflicts (Mandatory Escalation Conditions per `AGENTS.md`):
  - conflicting sources with no safe tie-breaker
  - security/compliance/legal implications
  - breaking contract/interface not covered by approved epic scope
  - irreversible/destructive operations with high impact
  - external dependency deadlock that requires human decision

## Workflow

### Phase 1: Load Epic Scope

1. Read all inputs listed above.
2. Verify prerequisites readiness: read `docs/PREREQUISITES.md` (if exists).
   If blocking items are unchecked, warn human and pause until acknowledged.
3. Identify epic ID and candidate tasks from the epic task list doc.
4. Build execution order by dependency (`Depends On`) and priority.
4. Skip tasks already `COMPLETED` or `CANCELED`.
5. Initialize the inter-task context accumulator (empty).
6. Report execution plan to human: task order, modes, estimated scope.

### Phase 2: Task Execution Loop

For each eligible task in order:

#### 2.1 Pre-dispatch validation
- Verify task dependencies are satisfied (all `Depends On` tasks are `COMPLETED`).
- If dependency not met: skip and re-queue after remaining unblocked tasks.
- Read the task file to get current status and mode.

#### 2.2 Build subagent prompt
- Read `skills/gohorse/references/subagent-prompt-template.md`.
- Fill template slots:
  - `{TASK_ID}`: task ID.
  - `{TASK_FILE_PATH}`: path to task file.
  - `{EPIC_TASK_LIST_PATH}`: path to epic task list doc.
  - `{EXECUTION_MODE}`: mode from task file.
  - `{INTER_TASK_CONTEXT}`: accumulated context from prior tasks (or "This is the first task in the epic. No prior context.").
  - `{CONTRACT_WARNINGS}`: warnings about contracts changed by prior tasks that this task depends on (or "None").
- The prompt instructs the subagent to read all necessary files itself.

#### 2.3 Dispatch subagent
- Spawn a single Agent (subagent_type: `general-purpose`) with the built prompt.
- The subagent executes implement phases 0-4 and delivery autonomously.
- The subagent delegates to persona skills (`architect`, `testing`, `security`) via Agent tool when mode obligations require it (Standard/Critical). This is expected and allowed.
- Wait for subagent completion.

#### 2.4 Parse subagent return
- Extract structured return block between `--- GOHORSE RETURN START ---` and `--- GOHORSE RETURN END ---`.
- Parse fields per `skills/gohorse/references/orchestration-model.md` Return Protocol.
- If block is missing or malformed: treat as FAILED.

#### 2.5 Post-dispatch action by STATUS

**COMPLETED:**
- Append KEY_CONTEXT_FOR_NEXT_TASKS to inter-task context accumulator.
- Record AUTONOMOUS_DECISIONS and CONTRACTS_CHANGED.
- Verify DELIVERY_STATUS is MERGED or PR_OPEN.
- Report concise task summary to human.
- Continue to next task.

**BLOCKED:**
- Record blocker rationale.
- Attempt resolution using Autonomy Policy.
- If unresolvable: report to human, skip task, continue with others.

**FAILED:**
- Allow 1 retry with error context injected into prompt.
- If still failed: mark BLOCKED, report to human, continue.

**AWAITING_APPROVAL** (Critical mode Phase 2):
- Present planning doc to human for approval.
- If approved: re-dispatch subagent with "resume from Phase 3" instruction appended to prompt.
- If rejected: mark task for revision, continue with others.

#### 2.6 Progress checkpoint
After every task (regardless of outcome), report to human:
- Tasks completed / total.
- Current blockers (if any).
- Summary of autonomous decisions made.

#### 2.7 Re-queued tasks
After processing all tasks in order, check re-queued tasks (skipped due to unmet dependencies).
If re-queued tasks now have dependencies met: process them.
If still blocked: report dependency deadlock to human.

### Phase 3: Close Epic Run

1. Produce epic execution summary:
   - Task-by-task trace: task ID, mode, status, evidence summary, delivery outcome.
   - Accumulated inter-task context (contracts, decisions, key artifacts).
   - Blocked tasks with explicit human asks.
   - Autonomous decisions log (all DA-xxx from all tasks).
2. Update epic task list doc with final statuses.
3. Run `ep-check` on `main` and drive its findings → fix → re-check loop. **Mark the
   epic `Status: DONE` in `docs/EPICOS.md` ONLY on `ep-check`'s final `GO`** (zero
   leftover findings AND both human gates: architecture-delta acknowledgement +
   manual UX PASS/N/A). On `AWAITING HUMAN VALIDATION` or `NO-GO`, do NOT mark the
   epic done — report pending human actions / blocking findings and stop. Never
   declare "epic complete" on anything but a final `GO`.
4. Report summary to human.

## Human Interaction Contract
- Report epic execution plan at start (Phase 1).
- Report concise progress after each task (Phase 2.6).
- Report full summary at end (Phase 3).
- Ask human only when:
  - Critical task needs Phase 2 approval (AWAITING_APPROVAL).
  - Task is BLOCKED and orchestrator cannot resolve.
  - Mandatory Escalation Conditions are met.

## Mandatory Rules
1. Never bypass implement phase gates within the subagent.
2. Never bypass delivery semantic validation before shipping.
3. Never alter tests only to make them pass.
4. Keep scope within the approved epic and task artifacts.
5. If epic scope itself is ambiguous, stop once and request human resolution.
6. Each task gets a fresh subagent with isolated context.
7. Inter-task context must be explicit (injected via prompt, not assumed).
8. Subagent prompts must include the return protocol.
9. Failed subagent dispatch: retry once with error context, then mark BLOCKED.
10. Do not dispatch tasks whose dependencies are not COMPLETED.

## Required Outputs
- Task-by-task trace: task ID, mode, status, evidence summary, delivery outcome.
- Inter-task context log: accumulated contracts, decisions, key artifacts.
- Epic execution summary with unresolved blockers and concrete human asks.
- All outputs from individual tasks (task files, planning docs, reports, session logs).

## Reference Files
- Subagent prompt template: `skills/gohorse/references/subagent-prompt-template.md`
- Orchestration model: `skills/gohorse/references/orchestration-model.md`
- Implement skill: `skills/implement/SKILL.md`
- Delivery skill: `skills/delivery/SKILL.md`
- Testing skill: `skills/testing/SKILL.md`
- Default (parallel + claim-on-first-touch) equivalent: `skills/gohorse/SKILL.md`
- tmux equivalent: `skills/parallel/SKILL.md`
