# Orchestration Model

Defines how the gohorse orchestrator manages subagents, accumulates context,
validates between tasks, and handles errors.

## Subagent Lifecycle

```
For each task:
  1. Pre-dispatch validation (dependencies, status)
  2. Build prompt (template + inter-task context + contract warnings)
  3. Dispatch subagent (Agent tool, general-purpose)
  4. Wait for completion
  5. Parse structured return
  6. Post-dispatch validation and context accumulation
  7. Report progress to human
```

## Return Protocol

### Markers
- Start: `--- GOHORSE RETURN START ---`
- End: `--- GOHORSE RETURN END ---`

### Fields

| Field | Type | Required | Description |
|---|---|---|---|
| TASK_ID | string | yes | Task identifier |
| STATUS | enum | yes | `COMPLETED`, `BLOCKED`, `FAILED`, `AWAITING_APPROVAL` |
| EXECUTION_MODE | enum | yes | `Quick`, `Standard`, `Critical` |
| EVIDENCE_SUMMARY | string | yes | One-line PASS/FAIL summary |
| DELIVERY_STATUS | enum | yes | `MERGED`, `PR_OPEN`, `FAILED`, `SKIPPED`, `NOT_ATTEMPTED` |
| DELIVERY_PR | string | yes | PR number or "None" |
| BLOCKERS | list | yes | Specific blockers or "None" |
| AUTONOMOUS_DECISIONS | list | yes | DA-xxx entries or "None" |
| CONTRACTS_CHANGED | list | yes | API/schema/contract changes or "None" |
| ARTIFACTS_CREATED | list | yes | File paths created or "None" |
| FILES_MODIFIED | list | yes | File paths modified or "None" |
| KEY_CONTEXT_FOR_NEXT_TASKS | list | yes | Critical info for subsequent tasks or "None" |

### Parsing Rules
1. Find content between start and end markers.
2. Parse each field by its label prefix (e.g., `TASK_ID:`).
3. List fields (lines prefixed with `- `) continue until the next field label.
4. If return block is missing or malformed: treat as `FAILED` with blocker "subagent did not return structured result".

### STATUS Semantics

| STATUS | Meaning | Orchestrator Action |
|---|---|---|
| COMPLETED | Task implemented and delivered | Accumulate context, continue |
| BLOCKED | Subagent hit an unresolvable issue | Record blocker, attempt orchestrator-level resolution, or escalate to human |
| FAILED | Subagent encountered an error | Retry once with error context, then mark BLOCKED |
| AWAITING_APPROVAL | Critical task Phase 2 needs human sign-off | Present plan to human, re-dispatch if approved |

## Inter-Task Context Model

### Purpose
Each subagent starts with a clean context window. The inter-task context
is the ONLY mechanism for passing information between tasks. Without it,
task 2 does not know what task 1 produced.

### Accumulator Format

The orchestrator builds a text block that grows with each completed task:

```
### Completed: TASK-oda-EP-001-01 (Quick, PASS)
Contracts: Created POST /api/items (src/routes/items.ts), ItemSchema (src/types/item.ts)
Decisions: DA-001: SQLite over Postgres — CDC-003 (zero deps)
Key context: Item API at /api/items, ItemSchema: {id, name, description, createdAt}, SQLite auto-migration

### Completed: TASK-oda-EP-001-02 (Standard, PASS)
Contracts: Extended ItemSchema with `category` field, Created GET /api/categories
Decisions: DA-002: flat category list — CDC-002 (minimal complexity)
Key context: Categories are flat strings in items table, no separate table
```

### Accumulation Rules
1. After each COMPLETED task: append a summary block built from KEY_CONTEXT_FOR_NEXT_TASKS, CONTRACTS_CHANGED, and AUTONOMOUS_DECISIONS.
2. BLOCKED/FAILED tasks are NOT added (they did not produce stable output).
3. The orchestrator never edits or rewrites prior context entries.
4. The accumulator is append-only within a single epic run.

### Context Size Management
- Target: keep accumulator under ~2000 tokens (~50 lines).
- When exceeded:
  1. Summarize the oldest entries into a compact "Prior Tasks Summary" block.
  2. Keep the 3 most recent task entries in full detail.
  3. The summary preserves: all contract names and paths, all DA-xxx decisions, key architectural choices.
- The orchestrator performs summarization inline (no external tool needed).

### Context Injection
- Injected into the subagent prompt at `{INTER_TASK_CONTEXT}`.
- First task: "This is the first task in the epic. No prior context."
- Subsequent tasks: full accumulator text.

## Contract Warnings

When the orchestrator detects that a completed task changed a contract that
a pending task depends on (based on CONTRACTS_CHANGED and task descriptions),
it injects a warning into `{CONTRACT_WARNINGS}`:

```
WARNING: TASK-oda-EP-001-01 changed the ItemSchema (added `category` field).
Your task references items — ensure you use the updated schema.
```

If no warnings apply: "None".

## Validation Checkpoints

### Pre-dispatch (orchestrator)
- [ ] **`git fetch origin` + reconcile the task against `origin/main` BEFORE
      provisioning any worktree** (§ Retomability step 3). Local task-file STATUS
      goes stale: a task/epic already merged upstream can still read PENDING
      locally, and dispatching it re-executes already-merged work over a merged
      base. Git is authoritative for "did this actually merge", not the task file.
- [ ] All `Depends On` tasks are COMPLETED.
- [ ] Task is not COMPLETED or CANCELED.
- [ ] Task file exists and has required fields (Status, Priority, Execution Mode, Branch).

### Post-dispatch (orchestrator)
- [ ] Return block exists and is parseable.
- [ ] STATUS is a valid enum value.
- [ ] If COMPLETED: DELIVERY_STATUS is MERGED or PR_OPEN (not FAILED/SKIPPED).
- [ ] If COMPLETED: EVIDENCE_SUMMARY contains PASS.
- [ ] If BLOCKED: BLOCKERS is not "None".
- [ ] If AWAITING_APPROVAL: task is Critical mode.

### Cross-task consistency (after each task)
- Check CONTRACTS_CHANGED against prior context for conflicts (same contract modified twice).
- Check FILES_MODIFIED for overlap with pending tasks.
- If conflict detected: inject warning into next subagent prompt via `{CONTRACT_WARNINGS}`.

## Error Handling

### Subagent timeout or crash
1. Treat as FAILED.
2. Read task file status to determine progress.
3. If `IN_PROGRESS` with artifacts: retry with "resume from detected phase" in prompt.
4. If still `PENDING`: retry from scratch.
5. Maximum 1 retry per task.

### Malformed return
1. Treat as FAILED with blocker: "subagent return protocol violation".
2. Check if task was completed despite bad return (read task file, check git log for commits on task branch).
3. If task appears completed: manually extract context from task file and artifacts, build accumulator entry, continue.
4. Otherwise: retry once with explicit reminder about return protocol.

### Delivery failure
If subagent returns COMPLETED but DELIVERY_STATUS is FAILED:
1. Read delivery error from subagent output.
2. CI failure: mark BLOCKED (likely needs code fix).
3. Merge conflict: orchestrator may attempt rebase and re-delivery.
4. Other: report to human.

### Delivery crash after merge (no/`null` return)
A delivery subagent can crash on a transient error (e.g. `socket connection closed`)
**after** the merge already reached `origin/main`. Before marking such a task BLOCKED,
reconcile against git — a delivered task wrongly marked BLOCKED deadlocks its dependents:
1. `git fetch origin` to refresh local remote refs (a server-side `gh pr merge` does not
   advance local `origin/main` until fetched).
2. Check whether the task branch actually merged: `gh pr list --head <task-branch>
   --state merged` returns the PR, OR `git merge-base --is-ancestor <task-branch-tip>
   origin/main` succeeds.
3. If merged: treat the task as COMPLETED (the delivery happened; only the return was
   lost), accumulate context, and open dependents — do NOT mark BLOCKED.
4. Only mark BLOCKED when the branch is **confirmed NOT merged** (genuine failure).

**Double-failure — the reconcile must survive the outage that triggered it.** Step 1's
`git fetch` (and the `gh`/`git` checks) can THEMSELVES fail in the SAME sustained outage
that killed the delivery — so a naive "reconcile once, else BLOCKED" still false-BLOCKs an
already-merged task (observed repeatedly on EP-057, recovered only by hand). The reconcile
is therefore **tri-state and retrying**, never a single attempt whose failure means
"not merged":
- Retry the reconcile with backoff; treat a transient connection/API error
  (`FailedToOpenSocket` / `ConnectionRefused` / `socket connection closed`) as
  **re-enqueueable, NOT** `FAILED`→`BLOCKED`.
- If merge-state is still **undetermined** after retries, leave the task in a
  **reconcile-pending** limbo (neither COMPLETED nor BLOCKED) and re-derive it
  **on resume** — at the next opportunity once connectivity returns, and on the next
  orchestrator run via the inherited task-file + `git` reconciliation (§ Retomability).
  Mark BLOCKED only on a positive non-merge confirmation.
(gohorse's parallel layer implements this as `reconcileMerged`/`pendingReconcile` — see
`parallel-delta.md` N5c.)

### Dependency deadlock
After full loop, if re-queued tasks still have unmet dependencies:
1. Identify the dependency chain.
2. Report deadlock to human with specific task IDs and missing dependencies.
3. Do not attempt circular resolution.

## Retomability

The orchestrator is retomable across sessions via task file status:
1. On start, read all task files for the epic.
2. Tasks with `Status: COMPLETED` and delivery metadata: skip.
3. **Reconcile-on-resume against git BEFORE acting on any non-COMPLETED task.** A task
   whose branch already merged to `origin/main` — `git fetch origin` then
   `git merge-base --is-ancestor <branch> origin/main` succeeds, OR `gh pr list --head
   <branch> --state merged` returns the PR — is a survivor of a delivery/finalize crash
   that died in the same outage (the `unreconciled` limbo of § Delivery crash after
   merge; the task-file was never flipped to COMPLETED). Treat it as **COMPLETED**:
   finalize its task-file metadata (`Status: COMPLETED` + delivery fields) and skip it.
   This is the run-ENTRY counterpart of the in-run `reconcileMerged` — without it, a
   merged-but-not-finalized task is mis-read by status alone (step 4/5 below) and
   **re-dispatched/re-resumed, re-implementing already-merged work** (duplicate work +
   delivery conflict). Deciding skip/dispatch by task-file status ALONE is the gap;
   git is authoritative for "did this actually merge".
   - **Branch-pruned fallback (subject correlation).** `merge-base --is-ancestor
     <branch>` and `gh pr list --head <branch>` both need the task **branch** to
     still resolve. After a squash-merge with branch deletion the branch is gone,
     so ancestry can't be computed — yet the squash commit on `origin/main`
     carries the TASK ID in its subject (delivery's default PR title is
     `chore(<TASK_ID>): delivery <branch>`, so the upper-case `TASK-...` is present).
     As a fallback, scan `git log origin/main --format='%s'` for the task's ID and
     treat a match as merged → COMPLETED. **Reuse the upper-case TASK-ID regex
     `TASK_ID_GREP` from `skills/delivery/scripts/deliver-to-main.sh`** (the same
     one `detect_overlapping_task_commits` uses for subjects — that function has two
     regexes, `TASK_ID_GREP` upper-case and `TASK_REF_GREP` lower-case; the subject
     scan needs `TASK_ID_GREP`) — DRY, one regex shared. **Caveat:** a custom
     `--pr-title` that omits the TASK ID defeats this fallback silently (inherent
     limit of subject correlation); the branch-ancestry path above remains primary.
     This also catches the epic-level case: a whole epic already
     merged upstream resolves task-by-task here without provisioning a worktree.
4. Tasks with `Status: IN_PROGRESS` (and not merged per step 3): subagent resumes from detected phase (resume detection per `implement/references/resume-detection.md`).
5. Tasks with `Status: PENDING` (and not merged per step 3): dispatch normally.
6. Rebuild inter-task context from completed task files and their artifacts.

Inter-task context reconstruction when resuming:
- For each completed task, read task file and build a context entry from:
  - Task report (for contracts, decisions).
  - Delivery validation note (for delivery outcome).
  - Git log on main (for files modified).
- This is approximate but sufficient for context continuity.
