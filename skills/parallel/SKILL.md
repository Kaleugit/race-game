---
name: parallel
description: >
  Use this workflow skill to execute epic tasks in parallel across multiple
  Claude Code instances via tmux, with dependency-aware scheduling and
  eager delivery after each task completes.

metadata:
  kind: workflow
---

# Parallel Skill

Orchestrates parallel task execution for an epic using multiple Claude Code
instances running in tmux windows. Resolves the dependency graph, launches
workers for independent tasks simultaneously, monitors progress via task
files, and triggers eager delivery as each task completes.

This is the tmux-based parallel equivalent of `skills/gohorse-light/SKILL.md` (and a
sibling of the Workflow-based `skills/gohorse/SKILL.md`).

## When To Use

- Epic has multiple tasks that can execute in parallel (independent dependencies).
- You want to maximize throughput while preserving dependency order.
- Tasks are already defined (in `docs/EPICO-<ID>-<slug>-TASKS.md` or `memory-system/tasks/`).
- Human wants visibility and the ability to interact with any worker session.

## Inputs To Read

1. `AGENTS.md`
2. `docs/PROJECT_SPECS.md`
3. `docs/EPICOS.md`
4. Target epic task list doc (`docs/EPICO-<ID>-<slug>-TASKS.md`)
5. `memory-system/2-tasks.md`
6. Task files in `memory-system/tasks/` (if they exist)
7. `skills/implement/SKILL.md`
8. `skills/delivery/SKILL.md`

## Autonomy Policy

Same as `skills/gohorse/SKILL.md`. Canonical decision precedence: `AGENTS.md` "Autonomous Decision-Making" section.

1. Explicit human decision (overrides everything).
2. Task file fields and linked artifacts.
3. `docs/PROJECT_SPECS.md` Section 10 criteria (project-specific first, then defaults).
4. Epic task list, existing code conventions, and prior completed tasks.
5. Conservative assumptions that preserve reversibility, documented in task artifacts.

Escalate to human only for Mandatory Escalation Conditions (`AGENTS.md`):
- Conflicting sources with no safe tie-breaker.
- Security/compliance/legal implications.
- Breaking contract/interface not in scope.
- Irreversible/destructive operations with high impact.
- External dependency deadlock.

## Workflow

### Step 1: Build Dependency Graph

Run the DAG builder:

```bash
./skills/parallel/scripts/build-dag.sh --epic <EPIC-ID>
```

Or for specific tasks:

```bash
./skills/parallel/scripts/build-dag.sh --tasks TASK-ID1,TASK-ID2,TASK-ID3
```

The script outputs task inventory with statuses, launchable tasks (all
dependencies met), and full dependency graph.

### Step 2: Present Plan to Human

Show the human:
- Total tasks and dependency structure.
- Which tasks launch immediately.
- Maximum parallel width.

Wait for human approval before proceeding. The human may specify:
- `max_parallel` (default: 4) to limit concurrent workers.
- Tasks to exclude or reorder.

### Step 3: Create tmux Session

```bash
tmux new-session -d -s "parallel-<epic-id>" -n "orchestrator"
```

The `orchestrator` window is reserved for status reference. Workers run in
separate named windows.

### Step 4: Launch Workers

For each launchable task, up to `max_parallel`:

```bash
tmux new-window -t "parallel-<epic-id>" -n "<TASK-ID>"
tmux send-keys -t "parallel-<epic-id>:<TASK-ID>" \
  "cd $(pwd) && claude \
    --permission-mode bypassPermissions \
    --name '<TASK-ID>' \
    --model opus \
    --append-system-prompt 'You are a parallel worker executing a single task autonomously. Resolve ambiguities from project specs and existing conventions. Do not ask the human for input unless you encounter: contradictory requirements with no safe resolution, security/compliance risk, or irreversible destructive operations. After completing /implement, wait silently for the next command.' \
    --disallowedTools 'mcp__claude_ai_Gmail__*' 'mcp__claude_ai_Google_Calendar__*' 'mcp__google-docs-mcp__*' \
    '/implement <TASK-ID>'" Enter
```

#### Worker flag rationale

| Flag | Purpose |
|------|---------|
| `--permission-mode bypassPermissions` | Autonomous execution without permission prompts. Equivalent to `--dangerously-skip-permissions` but set as mode. |
| `--name '<TASK-ID>'` | Names the session for identification in `claude --resume` and terminal title. Enables resume if the orchestrator needs to reconnect. |
| `--model opus` | Ensures all workers use the same model as the orchestrator. Prevents fallback to a weaker model. |
| `--append-system-prompt '...'` | Injects the autonomy policy directly into the system prompt. More reliable than relying on the skill instructions alone — the worker sees this as a system-level directive. |
| `--disallowedTools '...'` | Removes MCP tools (Gmail, Calendar, Google Docs) from context. Reduces context window consumption (~2-3k tokens saved) and prevents accidental MCP calls. Chrome/browser tools are kept available for tasks that need e2e or UI testing. |

#### Optional flags by execution mode

For `Critical` tasks, increase effort:
```bash
--effort max
```

For `Quick` tasks, reduce cost:
```bash
--effort high
```

#### Environment cleanup

If recursion detection blocks worker launch, prepend:
```bash
env -u CLAUDE_CODE -u CLAUDE_CODE_RUNNING claude ...
```

Record launch timestamp for each worker.

Each worker is tracked in one of these states:
- `IMPLEMENTING` — worker running `/implement`.
- `AWAITING_DELIVERY` — handoff detected, queued for delivery.
- `DELIVERING` — `/delivery` in progress in worker pane.
- `DONE` — task status `COMPLETED`.
- `CRASHED` — pane dead, task not completed.
- `BLOCKED` — task status `BLOCKED`.

### Step 5: Monitor Loop

Repeat until all tasks are `DONE` or `BLOCKED`.

#### 5a. Check All Workers

Run a single Bash command to check every active worker:

```bash
for task in <ACTIVE-TASK-IDS>; do
  file="memory-system/tasks/$task.md"
  if [ -f "$file" ]; then
    status=$(grep -m1 '^- Status:' "$file" | sed 's/.*: //')
    handoff=$(grep -m1 '^- Delivery Handoff:' "$file" | sed 's/.*: //')
    mtime=$(stat -c %Y "$file")
    pane_alive=$(tmux list-panes -t "parallel-<epic>:$task" -F '#{pane_pid}' 2>/dev/null && echo "1" || echo "0")
    echo "$task|$status|$handoff|$pane_alive|$mtime"
  else
    echo "$task|NO_FILE|-|1|0"
  fi
done
```

#### 5b. Process Worker States

For each worker, based on the check output:

- **Handoff detected** (`Delivery Handoff: PENDING`):
  Move to `AWAITING_DELIVERY`. Add to delivery queue.

- **Completed** (`Status: COMPLETED`):
  Move to `DONE`. Check for newly unblocked tasks (Step 5d).

- **Blocked** (`Status: BLOCKED`):
  Report to human with blocker reason. Continue other workers.

- **Pane dead** but task not `COMPLETED`/`BLOCKED`:
  Worker crashed. Relaunch using the same worker launch command from Step 4.
  The `/implement` resume detection picks up from the last completed phase.
  Allow up to 2 crash relaunches per task. After that, mark `BLOCKED`.

- **Stagnation** (task file unchanged for >3 minutes, status `IN_PROGRESS`):
  Capture pane content for semantic analysis:
  ```bash
  tmux capture-pane -t "parallel-<epic>:<TASK>" -p -S -50
  ```
  Analyze the captured text:
  - **Question pending** (text with `?`, options, "confirm"): answer via
    autonomy policy using `tmux send-keys`, or escalate to human.
  - **Error/crash visible**: report to human.
  - **Normal execution** (code generation, test output): reset stagnation
    timer — the task file may not update during long execution phases.

#### 5c. Process Delivery Queue (Serialized)

Process one delivery at a time to avoid merge conflicts on `main`.

1. Pick the oldest `AWAITING_DELIVERY` task.
2. Send delivery command to the worker pane:
   ```bash
   tmux send-keys -t "parallel-<epic>:<TASK>" "/delivery" Enter
   ```
   The worker Claude session is still alive after `/implement` handoff and
   has full task context. Sending `/delivery` continues the session.
3. Mark worker as `DELIVERING`.
4. Wait for task status to become `COMPLETED` before starting next delivery.
5. After delivery: `git fetch origin` in the project root so new workers
   get the latest `main`.

#### 5d. Launch Newly Unblocked Tasks

After each delivery completes:

1. Re-run DAG check:
   ```bash
   ./skills/parallel/scripts/build-dag.sh --epic <EPIC-ID>
   ```
2. Launch any newly launchable tasks (dependencies now met).
3. Respect `max_parallel` limit (count active workers).

#### 5e. Report Status

At each monitor cycle, output status to human:

```
══════════════════════════════════════════════
 PARALLEL — EP-001 — 2026-03-21 14:30 — Cycle 5
══════════════════════════════════════════════
 TASK-oda-EP-001-01   DELIVERING      15m
 TASK-oda-EP-001-02   IMPLEMENTING    12m
 TASK-oda-EP-001-03   DONE             8m
 TASK-oda-EP-001-04   PENDING          -    (waits: 01)
 TASK-oda-EP-001-05   PENDING          -    (waits: 01,02)
══════════════════════════════════════════════
 1/5 done | 1 delivering | 1 implementing | 2 pending
 tmux attach -t parallel-ep-001:<TASK-ID>
══════════════════════════════════════════════
```

#### 5f. Wait Between Cycles

Wait 60 seconds between monitor cycles using `sleep 60`.

### Step 6: Close Epic Run

When all tasks are `DONE` or `BLOCKED`:

1. Produce epic summary:
   - Completed tasks with delivery evidence (PR numbers).
   - Blocked tasks with reasons.
   - Human decisions still needed.
   - Wall-clock time and parallel efficiency vs sequential estimate.
2. Run `ep-check` on `main` and drive its findings → fix → re-check loop. **Mark the
   epic `Status: DONE` in `docs/EPICOS.md` ONLY on `ep-check`'s final `GO`** (zero
   leftover findings AND both human gates: architecture-delta acknowledgement +
   manual UX PASS/N/A). On `AWAITING HUMAN VALIDATION` or `NO-GO`, do NOT mark the
   epic done — report pending human actions / blocking findings. Never declare
   "epic complete" on anything but a final `GO`.
3. Kill tmux session:
   ```bash
   tmux kill-session -t "parallel-<epic-id>"
   ```

## Worker Pane Interaction

The human can interact with any worker at any time:

```bash
# Attach to a specific worker
tmux attach -t parallel-<epic-id>:<TASK-ID>

# Detach without stopping the worker
Ctrl+B D
```

If the human answers a question or unblocks a worker manually, the
orchestrator detects progress resumption on the next monitor cycle.

## Mandatory Rules

1. Never bypass `implement` phase gates in workers.
2. Never bypass `delivery` semantic validation.
3. Never alter tests to make them pass.
4. Serialize all deliveries — one at a time to prevent merge conflicts.
5. Respect `max_parallel` limit to manage API rate limits.
6. Workers must use `--permission-mode bypassPermissions` for autonomous execution.
7. Workers must use `--append-system-prompt` to inject the autonomy policy.
8. Workers must use `--disallowedTools` to remove unused MCP tools (Gmail, Calendar, Google Docs) from context. Keep Chrome/browser tools available for tasks that may need UI or e2e testing.
9. Workers must use `--name '<TASK-ID>'` for session identification.
10. Scope remains within the approved epic/task artifacts.
11. If epic scope is ambiguous, stop and request human resolution.
12. Launch workers in interactive mode (positional prompt), not `-p` (print mode).
13. Each worker handles its own worktree via `/implement` Phase 0, which verifies
    isolation (`./scripts/assert_isolated.sh`) before the first write and ABORTs if it
    cannot be confirmed — never guessing a worktree (anthropics/claude-code #33045/#51596).
14. Allow up to 2 crash relaunches per task before marking `BLOCKED`.

## Required Outputs

- Execution plan with dependency graph (before launch).
- Per-cycle status reports during execution.
- Final epic summary:
  - Task-by-task trace (ID, mode, status, evidence, delivery PR).
  - Blocked items with reasons and required human decisions.
  - Wall-clock time.

## Reference Skills

- `skills/implement/SKILL.md`
- `skills/delivery/SKILL.md`
- `skills/gohorse-light/SKILL.md` (sequential equivalent)
- `skills/gohorse/SKILL.md` (Workflow-based parallel + claim-on-first-touch)

## Reference Files

- Parallel execution model: `references/parallel-execution-model.md`
