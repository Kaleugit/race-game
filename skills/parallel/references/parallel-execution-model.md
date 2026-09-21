# Parallel Execution Model

Detailed reference for the `parallel` skill. The SKILL.md is the entry
point; this document covers rationale, edge cases, and recovery procedures.

## Design Rationale

### Why parallel over sequential (gohorse-light)?

Sequential execution (`gohorse-light`) runs every task in a single Claude Code
session. Context accumulates across tasks, degrading quality around task 5-7
in a typical 200k-token window.

Parallel execution gives each task a fresh context window. A worker Claude
loads only `PROJECT_SPECS`, the task file, and the epic context — well within
limits even for large projects. The orchestrator stays lightweight (status
checks and short commands), preserving its own context for the full run.

### Why eager delivery?

Delivering each task immediately after handoff keeps `main` up to date.
Workers launched later inherit all previously merged code via `git fetch`.
This eliminates the coordination problem of wave-based delivery where
workers in the same wave might produce conflicting changes.

Deliveries are serialized (one at a time) to avoid merge conflicts.

### Why reuse worker sessions for delivery?

After `/implement` Phase 5, the worker Claude is still alive and has full
context of the task it just implemented. Sending `/delivery` to the same
session is optimal: the agent already knows the scope, changes, and
acceptance criteria. No context is wasted bootstrapping a new session.

## tmux Reference

### Session naming

```
parallel-<epic-id>      e.g. parallel-ep-001
```

### Window naming

Each window is named after the task ID for easy identification:

```
parallel-ep-001:TASK-oda-EP-001-01
parallel-ep-001:TASK-oda-EP-001-02
```

### Key commands for the orchestrator

```bash
# Create session
tmux new-session -d -s "parallel-ep-001" -n "orchestrator"

# Create worker window
tmux new-window -t "parallel-ep-001" -n "TASK-oda-EP-001-01"

# Send command to worker
tmux send-keys -t "parallel-ep-001:TASK-oda-EP-001-01" "command here" Enter

# Capture pane content (last 50 lines)
tmux capture-pane -t "parallel-ep-001:TASK-oda-EP-001-01" -p -S -50

# Check if pane process is alive
tmux list-panes -t "parallel-ep-001:TASK-oda-EP-001-01" -F '#{pane_pid}' 2>/dev/null

# List all windows in session
tmux list-windows -t "parallel-ep-001" -F '#{window_name}'

# Kill session
tmux kill-session -t "parallel-ep-001"
```

### Key commands for the human

```bash
# Attach to a worker
tmux attach -t parallel-ep-001:TASK-oda-EP-001-01

# Detach without stopping
Ctrl+B D

# List sessions
tmux ls

# Switch between windows inside a session
Ctrl+B N  (next)
Ctrl+B P  (previous)
Ctrl+B W  (window list)
```

## Worker Lifecycle

```
PENDING ──launch──> IMPLEMENTING ──handoff──> AWAITING_DELIVERY
                        │                           │
                        │ crash                     │ delivery sent
                        ▼                           ▼
                     CRASHED ──relaunch──>    DELIVERING
                        │                      │
                        │ max retries           │ merge
                        ▼                       ▼
                     BLOCKED                  DONE
```

### State detection

| State              | Task file signal                            | Pane signal   |
|--------------------|---------------------------------------------|---------------|
| IMPLEMENTING       | Status: IN_PROGRESS, no handoff marker      | pane alive    |
| AWAITING_DELIVERY  | Delivery Handoff: PENDING                   | pane alive    |
| DELIVERING         | (orchestrator tracks internally)            | pane alive    |
| DONE               | Status: COMPLETED                           | may be dead   |
| CRASHED            | Status not COMPLETED/BLOCKED                | pane dead     |
| BLOCKED            | Status: BLOCKED                             | may be dead   |

## Stagnation Detection

The orchestrator monitors task file modification time (`stat -c %Y`). If
a task file has not been modified for more than 3 minutes while the worker
is in `IMPLEMENTING` state:

1. **Capture** the last 50 lines of the pane with `tmux capture-pane`.
2. **Analyze semantically**: the orchestrator (a Claude instance) reads the
   captured text and classifies it as one of:
   - **Question pending**: the worker asked something and is waiting for
     input. Answer via autonomy policy or escalate.
   - **Error state**: visible error messages or stack traces. Report to human.
   - **Normal execution**: the worker is generating code, running tests, or
     waiting for an API call. Reset the stagnation timer.

### Why not use tmux monitor-silence?

Claude Code produces continuous terminal output (spinners, streaming tokens,
tool call results) that prevents silence-based detection from working
reliably. File-based monitoring is more accurate because `Last Updated` in
the task file reflects real progress through `/implement` phases.

## Recovery Procedures

### Worker crash

If a tmux pane dies but the task is not `COMPLETED` or `BLOCKED`:

1. The `/implement` skill has resume detection (Phase algorithm in
   `skills/implement/SKILL.md`). Relaunching `claude --prompt '/implement
   TASK-ID'` automatically resumes from the last completed phase.
2. Allow up to 2 relaunches. After that, mark the task `BLOCKED` with
   reason "Worker crashed 3 times" and continue with other tasks.

### Delivery failure

If `/delivery` fails (CI failure, merge conflict, validation error):

1. The worker Claude session reports the failure in its pane.
2. The orchestrator detects that the task did not reach `COMPLETED`.
3. Capture pane to understand the failure.
4. Options:
   - If fixable (minor CI issue): send fix instructions via `tmux send-keys`.
   - If merge conflict: report to human. The human can attach to the pane
     and resolve manually.
   - If validation failure: mark task `BLOCKED` and continue.

### Orchestrator context exhaustion

The orchestrator is a Claude Code session with its own context window. If
context approaches limits (many cycles, many pane captures):

1. The orchestrator should minimize pane captures (only on stagnation).
2. Status checks via task files are low-cost (~100 tokens per cycle).
3. If context is exhausted, the human can start a new session and re-run
   `/parallel` — the DAG builder detects completed tasks and resumes only
   pending/in-progress work.

## Concurrency Safety

### Git operations

- Each worker operates in its own worktree (created by `/implement` Phase 0).
- Git worktree creation acquires internal git locks — concurrent creation
  of different branches is safe.
- `git fetch` is safe to run concurrently.

### Task file writes

- Each worker writes only to its own task file (`memory-system/tasks/TASK-<id>.md`).
- The orchestrator only reads task files, never writes them.
- No race condition on task file access.

### Delivery serialization

- Only one delivery runs at a time (enforced by the orchestrator queue).
- Each delivery pushes to its own branch and creates its own PR.
- Auto-merge on `main` is sequential by nature (GitHub processes one at a time).

### Memory system fragments

- Each worker writes its own fragments (append-only, `merge=union`).
- Consolidated files are never edited by workers (only by CI reconciliation).

## Worker Launch Configuration

### Why these flags?

The worker launch command uses several Claude Code CLI flags to optimize
autonomous parallel execution:

#### `--permission-mode bypassPermissions`

Equivalent to `--dangerously-skip-permissions` but set as a mode. Workers
need full tool access to create worktrees, write code, run tests, and
commit. Without this, every tool call blocks on a permission prompt in an
unattended tmux pane.

#### `--append-system-prompt`

Injects the autonomy policy directly into the system prompt without
replacing the default prompt. This is more reliable than depending on the
`/implement` skill to read and follow the gohorse autonomy policy:

- System prompt instructions have higher precedence than skill instructions.
- The worker sees "do not ask the human" as a system-level directive.
- Combined with the implement skill's own workflow, this creates defense in
  depth against unnecessary human interruptions.

#### `--name '<TASK-ID>'`

Names the Claude Code session with the task ID. Benefits:
- Terminal title shows the task ID (visible in `tmux list-windows`).
- Session appears in `claude --resume` if manual reconnection is needed.
- Logs and diagnostics reference the named session.

#### `--model opus`

Pins the model to match the orchestrator. Without this, a worker could
fall back to a different model if the default changes or if rate limits
trigger a fallback. Consistent model across all workers ensures consistent
code quality and style.

#### `--effort`

Controls the model's effort level per task:
- `max` for Critical execution mode tasks (maximum capability).
- `high` for Standard tasks (good balance of quality and cost).
- Not set for Quick tasks (uses default).

#### `--disallowedTools`

Removes specific MCP tools from the worker's context entirely. These tools
are not just blocked — they are invisible to the worker, saving context
window tokens and preventing the model from considering them:

- `mcp__claude_ai_Gmail__*` — email tools.
- `mcp__claude_ai_Google_Calendar__*` — calendar tools.
- `mcp__google-docs-mcp__*` — Google Docs tools.

Chrome/browser tools (`mcp__claude-in-chrome__*`) are intentionally **kept
available**. Workers implementing frontend tasks may need browser automation
for e2e testing, UI verification, or interaction with running dev servers.

This typically saves 2-3k tokens of context per worker.

### Flags NOT used (and why)

| Flag | Why not |
|------|---------|
| `-p` (print mode) | Workers need interactive mode for human intervention and session reuse for delivery. |
| `--max-turns` | Only works in print mode. Stagnation detection + crash limits serve as safety nets instead. |
| `--max-budget-usd` | Only works in print mode. |
| `--worktree` | Built-in worktree creates in `.claude/worktrees/` which conflicts with the project's convention (`../wt-TASK-xxx/`). `/implement` Phase 0 handles worktrees. |
| `--system-prompt` | Would replace the default system prompt entirely, losing Claude Code's built-in capabilities. `--append-system-prompt` adds to it. |
| `--output-format` | Only works in print mode. |
| `--no-session-persistence` | Sessions should persist for potential resume after crash. |
| `--no-chrome` | Workers may need Chrome for e2e/UI testing. Disabling would break frontend task workflows. |

### Alternative: granular permissions instead of bypass

For higher safety (at the cost of more configuration), replace
`--permission-mode bypassPermissions` with explicit tool allowlist:

```bash
--permission-mode default \
--allowedTools "Bash" "Read" "Write" "Edit" "Glob" "Grep" "Agent" "Skill"
```

This auto-approves code tools while blocking unknown tools. The trade-off
is that new tools added to Claude Code would be blocked until explicitly
allowed.

## Limits and Recommendations

| Parameter        | Recommended | Rationale                               |
|------------------|-------------|-----------------------------------------|
| max_parallel     | 3-4         | API rate limits, system resources        |
| stagnation_mins  | 3           | Balance between false positives and responsiveness |
| max_crash_retry  | 2           | Prevent infinite relaunch loops          |
| monitor_interval | 60s         | Sufficient granularity without excessive polling |
