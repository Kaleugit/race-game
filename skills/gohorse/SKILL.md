---
name: gohorse
description: >
  Use this workflow skill to execute an approved epic with parallel implementation
  and serial delivery, orchestrated by the native Claude Code Workflow tool
  (deterministic wave-based fan-out of worktree-isolated implement subagents, then
  one-merge-at-a-time delivery to main), PLUS runtime file-ownership coordination:
  each implement subagent atomically claims a file before its first write
  ("claim-on-first-touch"), and a task that needs an already-claimed file defers
  cleanly to a later wave. Parallelizes implement while preventing same-file write
  clashes at write time. Delivery to main is identical to gohorse-light. The
  sequential, dependency-free `gohorse-light` skill remains the stable fallback.
metadata:
  kind: workflow
---

# Gohorse Skill

Default executor for an approved epic. It executes one epic by **parallelizing
implementation** across worktree-isolated subagents (deterministic wave-based fan-out
via the native **Workflow** tool) while keeping **delivery serial** — one confirmed
merge to `main` at a time. On top of that parallel substrate it adds **claim-on-first-
touch file ownership**: before an implement subagent's first write to a file, it
atomically claims that file in a shared lock registry; a wave-mate that needs an
already-claimed file aborts cleanly and **defers to a later wave** instead of clashing
at the merge-time rebase.

The sequential, dependency-free `gohorse-light` skill is the stable fallback when the
Workflow primitive (or another correctness-critical capability) is unavailable.

## What this skill is made of

- This SKILL.md — when/why/how, phases, mandatory rules (self-contained entry point).
- `references/orchestration-model.md` — the base orchestration model: inter-task
  context accumulation, contract warnings, validation checkpoints, error handling,
  retomability. Shared with `gohorse-light`.
- `references/subagent-prompt-template.md` — the base per-task subagent prompt. The
  parallel layer overrides specific sections of it (see `parallel-delta.md`).
- `references/parallel-delta.md` — the Workflow orchestration layer: the wave loop
  pseudocode, schema returns, serial delivery drain, cross-wave fetch, the optimistic
  delivery model (incremental per-task gate + repo-wide validation once per wave +
  revert-on-red, O1), and design rationale. Read in full.
- `references/ownership-delta.md` — the claim-on-first-touch layer: the shared lock
  registry, claim protocol, deadlock freedom, `DEFERRED` reconciliation, defer cap.
  Read in full.

## Substrate (RTFM — grounded in Claude Code docs)

gohorse runs as a **Workflow**: a JS script the runtime executes, where the script
holds the loop, branching, and intermediate results. The script spawns subagents via
`agent()`; barriers (`parallel()`/`pipeline()`) collect results; `agent({ schema })`
returns **validated** structured output; `agent()` returns `null` when a subagent
dies, so the script must reconcile (not drop). This JS API is specified by the
**Workflow tool's own contract** (available to the executing orchestrator), not the
public `workflows.md` page; behavioral limits (16 concurrent / 1000 total, intra-session
resume, no mid-run input, allowlist behavior) are on `workflows.md`. Subagent commits
land in the **shared `.git`**, so the delivery stage rebases/merges a task branch; a
per-wave `git fetch` keeps local remote refs current (see `references/parallel-delta.md`
§ Source of truth and § Cross-wave base-branch). The lock registry uses the same shared
`.git`: `git rev-parse --git-common-dir` resolves the portable common location across
all linked worktrees (see `references/ownership-delta.md` § The shared lock registry).

Two orchestration primitives were evaluated and rejected (see
`references/parallel-delta.md` § Design Rationale and `references/ownership-delta.md`
§ Why not the alternatives, with doc citations):
- **Plain Agent tool + `run_in_background`**: hits documented gaps (no portable
  "wait for N" / structured collection). Workflow closes these.
- **Agent teams**: do not collaborate on a shared codebase (docs require each
  teammate to own *different* files), are not creatable from within a Workflow, are
  experimental behind a flag, and combining `team_name` with `isolation:"worktree"`
  silently drops isolation. Wrong fit for implementing one task / coordinating writes.

## Why It Exists

| Concern | `parallel` (tmux) | gohorse (Workflow) |
|---|---|---|
| Workers | `claude` CLI in tmux panes | `agent()` subagents in a Workflow script |
| Isolation | manual `git worktree` per worker | `agent({ isolation: "worktree" })` |
| Wait / collect | poll task files every 60s | `parallel()`/`pipeline()` barriers (native) |
| Return | text markers parsed from pane | `agent({ schema })` validated output |
| Same-file writes | fragile, same checkout | claim-on-first-touch defer to a later wave |
| Merge | serial deliver (one at a time) | **same** — serial delivery stage (strategy C) |

vs `gohorse-light` (sequential): gohorse adds parallel throughput AND prevents the
same-file rebase-conflict repair loop, while keeping the exact same serial delivery to
`main`. gohorse-light remains the fallback that needs no Workflow/worktree primitive.

## When To Use

- An approved epic has multiple tasks, mostly touching different files, and you want
  throughput without tmux fragility while avoiding the rebase-conflict repair loop.
- Tasks are defined (`docs/EPICO-<ID>-<slug>-TASKS.md` / `memory-system/tasks/`).

The criterion for falling back to `gohorse-light` is **primitive availability**
(Preflight fails: no Workflow tool, no worktree isolation, no schema return, or the
delivery allowlist is missing), **not the amount of parallelism**. (A missing shared
`.git` does not trigger the fallback — it only disables the claim-on-first-touch layer
while parallel execution continues; see Phase 0.) gohorse's value is not only throughput: the deterministic Workflow
substrate (validated `schema` returns, automatic `null` reconciliation, per-task
worktree isolation, serial confirmed-merge delivery) makes it at least as robust as the
text-marker-parsing sequential `gohorse-light` even at parallelism = 1. A small or
tightly-coupled epic is therefore NOT a reason to downgrade; do not recommend the
fallback merely because "there is no parallelism gain".

Same-file contention honesty: claim-on-first-touch wins when tasks are *mostly
file-disjoint with occasional overlap* — the common case. When contention is pervasive
on a hot file, tasks serialize across waves (approaching `gohorse-light` throughput for
that cluster) and the retained rebase-net handles the residue; see
`references/ownership-delta.md` § Cost / honesty.

## Inputs To Read

1. `AGENTS.md`
2. `docs/PROJECT_SPECS.md`
3. `docs/EPICOS.md` (if present)
4. Target epic task list doc (e.g. `docs/EPICO-<ID>-<slug>-TASKS.md`)
5. `memory-system/2-tasks.md`
6. Task files for the epic in `memory-system/tasks/`
7. `memory-system/workstreams/aliases.conf`
8. `skills/implement/SKILL.md`
9. `skills/delivery/SKILL.md`
10. `references/orchestration-model.md` (base orchestration model)
11. `references/subagent-prompt-template.md` (base subagent prompt)
12. `references/parallel-delta.md` (Workflow orchestration + design rationale)
13. `references/ownership-delta.md` (claim-on-first-touch coordination)

## Autonomy Policy

Identical to `skills/gohorse-light/SKILL.md`. Canonical decision precedence is the
`AGENTS.md` "Autonomous Decision-Making" section: explicit human > task artifacts
> `docs/PROJECT_SPECS.md` Section 10 criteria > epic/conventions/prior tasks >
reversible conservative assumption. Escalate only on Mandatory Escalation
Conditions. Document every autonomous decision as `DA-xxx`.

## Workflow

### Phase 0: Preflight (capability gate, best-effort) — [orchestrator]

1. Run a minimal **probe workflow** (the orchestrator has no direct `agent()`): one
   `agent({ isolation: "worktree", schema })` that writes a file and returns a small
   validated object. Assert all three: Workflow ran, worktree was isolated, AND the
   `schema` object validated. If any of these three fails, abort → recommend
   `gohorse-light` (parallel execution is impossible). ADDITIONALLY assert that
   `git rev-parse --git-common-dir` resolves to the shared `.git` from inside the
   worktree (the lock registry depends on it). If ONLY this last check fails (the
   Workflow/worktree/schema probe passed), do NOT downgrade to `gohorse-light`:
   **disable the claim-on-first-touch layer and proceed with the bare parallel layer**
   (the retained rebase-net is the same-file backstop) — losing the lock registry must
   not cost the parallelism the probe proved is available.
2. **Verify the permission allowlist** permits the delivery agents' shell commands
   (`git`, `gh`, `./skills/delivery/scripts/*`, `./scripts/validate-changed.sh`,
   `./scripts/validate-all.sh`, CI command).
   Inside a workflow, commands outside the allowlist prompt (and auto-deny on a
   background run), which would stall or fail every delivery. If not allowlisted, add
   them or abort → recommend `gohorse-light`.
3. **Verify auto-merge viability:** the delivery path must be able to merge without a
   mandatory human reviewer (else the synchronous-merge drain stalls). If a human PR
   gate exists, warn and treat affected tasks as parked.
3b. **Push unpushed epic-setup commits before wave 1.** Wave-1 worktrees branch from
   `origin/HEAD`, so if the epic decomposition + `TASK-*.md` spec files live only on
   local `main`, wave 1 branches from a stale base without them and every task returns
   BLOCKED "stale base". Run `git log origin/main..HEAD --oneline`; if non-empty, push
   the setup commits to `origin/main` (or abort telling the operator to). *Correctness-
   critical:* see `references/parallel-delta.md` § Preflight, the "Unpushed epic-setup
   commits" check (wave-1 counterpart of the § C1 per-wave fetch).
4. If a correctness-critical primitive for parallel execution (Workflow execution,
   worktree isolation, schema return, or the delivery allowlist) is unavailable: NOTIFY
   (best-effort) and **recommend falling back to `gohorse-light`**. (A missing shared
   `.git` is the exception — it only disables the claim layer, see step 1; parallel
   execution continues.) Never abort merely because notification failed.
5. Record the Preflight outcome as a `DA-xxx`.

See `references/parallel-delta.md` § Preflight and § Cross-wave base-branch (C1), and
`references/ownership-delta.md` § The shared lock registry.

### Phase 1: Plan

1. Read all inputs. Verify prerequisites: read `docs/PREREQUISITES.md` (if it
   exists); if blocking items are unchecked, warn the human and pause until
   acknowledged.
2. Build the dependency graph: `./skills/parallel/scripts/build-dag.sh --epic <EPIC-ID>`
   (reused as-is; gohorse changes the executor, not the DAG).
3. Skip tasks already `COMPLETED` or `CANCELED`. Initialize the inter-task context
   accumulator (empty).
4. Present the plan to the human: task order, dependency structure, wave preview,
   `max_parallel` (default 4), execution modes. Wait for approval.

### Phase 2: Run the Workflow (wave-based fan-out + serial drain) — [agent()s]

Author and run a Workflow script (`Workflow` tool) implementing the deterministic
loop below. The script only coordinates `agent()`s — it has no shell/filesystem
access. Full mechanics, pseudocode, and the orchestrator-vs-agent boundary are in
`references/parallel-delta.md` § Workflow Orchestration and § Orchestrator vs Workflow;
the claim-on-first-touch deltas are in `references/ownership-delta.md` § Orchestrator
delta and § Claim protocol.

Per wave, until no tasks remain:
1. **Gating invariant:** `ready` = tasks whose every `Depends On` is `COMPLETED`
   (merged to `origin/main`). Same-wave tasks are mutually *order*-independent.
2. **Sync + lock wipe (C1):** at the start of every wave after the first, a sync
   `agent()` runs `git fetch origin` so local `origin/HEAD`/`origin/main` are current
   before this wave's worktrees are created. The SAME agent wipes the wave-scoped lock
   registry (`rm -rf "$LOCKDIR" && mkdir -p "$LOCKDIR"`), clearing any locks orphaned by
   a crashed prior-wave agent.
3. **Implement (parallel barrier):** `parallel()` over `ready`, each task an
   `agent({ isolation: "worktree", schema })` that runs implement phases 0-4 and
   STOPS at the delivery handoff (does NOT deliver). Each subagent runs the
   **claim-on-first-touch protocol** (claim a file in the lock registry before its first
   write; on a lost claim, release all locks and return `DEFERRED` — never wait). Inject
   inter-task context and contract warnings pre-dispatch. **Reconcile dispatched vs
   returned:** `agent()` returns `null` on a crashed/terminal-failed subagent — mark
   those FAILED→BLOCKED (never silently drop).
4. **Deliver (serial drain — strategy C):** iterate implemented tasks **sequentially**
   (never `parallel()`); a delivery `agent()` does `git fetch` → rebase on latest
   `origin/main` → run `delivery` and **confirm a synchronous (bounded-poll) merge to
   `origin/main` before returning**. On **rebase conflict**: re-dispatch an *implement*
   agent to resolve code, then re-deliver (BLOCKED only if that fails). On CI failure:
   retry delivery ONCE; still failing → `BLOCKED`. On merge-poll timeout: `BLOCKED`.
5. **Reconcile `DEFERRED` (not a failure):** a subagent returning `DEFERRED` is
   re-queued to `pending` and re-enters `ready` in a later wave — where the contended
   file's owner has merged, the C1 fetch makes it visible, and the deferred task becomes
   the sole writer. Track a per-task `deferCount`; after exceeding the cap `K` (default
   3), mark BLOCKED with a "persistent file contention" reason.
6. After each confirmed merge: mark `COMPLETED`, append `key_context_for_next_tasks`
   to the accumulator, and recompute `ready` for the next wave.

If a wave has no `ready` tasks but tasks remain, this is a deadlock or all-gated state:
classify each remaining task by what gates it (BLOCKED dep / parked dep / cycle) and
report the chain — do not exit silently.

**File-overlap caveat (correctness honesty):** claim-on-first-touch prevents clashes for
any *claimed* file. Residual collisions the lock cannot cover (a file unclaimed at the
instant of overlap, or non-write coupling) still surface at the serial rebase+CI drain
— the retained rebase-net (N4) handles them via retry-then-BLOCKED. Pre-dispatch
contract warnings reduce, but do not eliminate, this.

**AWAITING_APPROVAL parking:** a Critical task that returns `AWAITING_APPROVAL`
(its Phase 2 needs human sign-off) is parked: excluded from this run's delivery,
its dependents stay gated, and it is reported at Close. Approve and resume it in a
subsequent gohorse run. Parking never stalls sibling tasks.

### Phase 3: Close — [orchestrator], after the Workflow run

1. Run `ep-check` on `main` to validate the integrated epic end-to-end (whole-epic
   confidence without an integration-branch big-bang merge). This is a pure orchestrator
   action after the workflow returns (or its own follow-up workflow). Drive the
   `ep-check` findings → fix → re-check loop (incremental mode) until it reaches a
   final verdict. **The epic is "complete" ONLY on `ep-check`'s final `GO`** — which
   requires zero-leftover findings AND both human gates (architecture-delta
   acknowledgement + manual UX PASS/N/A). On `GO`, set the epic's `Status: DONE`
   in `docs/EPICOS.md`. On `AWAITING HUMAN VALIDATION` (technical OK, a human gate
   pending) or `NO-GO`, **do NOT mark the epic done** — leave its status as-is,
   report the pending human actions / blocking findings, and stop. Never declare or
   notify "epic complete" on anything but a final `GO`.
2. **Clear the lock registry** and report any defer-capped tasks (persistent contention).
3. **Cleanup worktrees:** remove merged task worktrees; also explicitly
   `git worktree remove --force` worktrees of BLOCKED/parked tasks (they hold commits and
   are NOT auto-cleaned) OR report their paths for human inspection — state which.
4. Produce the epic summary: task-by-task trace (ID, mode, status, evidence,
   delivery PR), accumulated inter-task context, per-wave deferral report (which tasks
   deferred on which file, any task BLOCKED by the defer cap), blocked/parked tasks with
   explicit human asks (including any dependency-deadlock chain), full `DA-xxx` log,
   wall-clock vs sequential estimate.
5. NOTIFY (best-effort): "epic <ID>: N delivered, M blocked, P parked".

## Notification (best-effort, non-blocking)

Non-blocking. Emit the event; degrade silently to terminal output on failure.
Native paths (RTFM): the `PushNotification` tool (desktop + phone via Remote
Control; Anthropic infra only — not Bedrock/Vertex), and the `preferredNotifChannel`
setting (`terminal_bell`, etc.). There is NO `Notification` hook event; a custom
command would be wired via a `Stop`/`SubagentStop` hook. Triggers: epic complete,
human input needed (parked/blocked), capability degradation (Preflight).

## Mandatory Rules

1. Never bypass `implement` phase gates inside subagents.
2. Never bypass `delivery` semantic validation before shipping.
3. Never alter tests only to make them pass.
4. **Delivery is serial — one CONFIRMED merge to `main` at a time (strategy C).** The
   delivery drain iterates sequentially; never deliver inside `parallel()`. A delivery
   agent must confirm a synchronous merge to `origin/main` before returning (no pending
   PR/auto-merge) — this serializes merges AND makes the next wave's worktrees see the
   merged code (§ Cross-wave base-branch, C1).
5. A task enters a wave only when all its `Depends On` are `COMPLETED`.
6. Each implement subagent runs in an isolated worktree (`isolation: "worktree"`)
   and STOPS at the delivery handoff; the workflow's delivery stage owns delivery.
7. **Claim before write.** An implement subagent claims a file (atomic `mkdir` in the
   shared registry) before its first write to it. No claim → no write.
8. **Never block on a held lock (deadlock freedom).** On a failed claim, the subagent
   immediately releases every lock it holds and returns `DEFERRED` — it never waits.
9. **`DEFERRED` is not a failure.** The orchestrator re-queues a DEFERRED task to a
   later wave; it is BLOCKED only after exceeding the defer cap `K` (default 3).
10. **Lock registry is wave-scoped.** The orchestrator wipes it before each wave.
11. **The rebase-net (N4) is retained** as the backstop for residual collisions the
    lock cannot cover (e.g. a file not yet claimed at the instant of overlap).
12. Inter-task context, contract warnings, validation checkpoints, retomability, and
    error handling follow `references/orchestration-model.md` (DRY).
13. Preflight degradation NOTIFIES and recommends `gohorse-light`; notification failure
    never aborts the run, but a missing correctness-critical primitive does.
14. Do not use agent teams or live `SendMessage` steering of running subagents
    (unsupported for this use case; see `references/parallel-delta.md` § Design Rationale).
15. Keep scope within the approved epic/task artifacts. If epic scope is ambiguous,
    stop once and request human resolution.
16. Retry policy is inherited: 1 retry with error context, then `BLOCKED`.
17. Delivery agents require an allowlist for `git`/`gh`/delivery scripts/CI (verified in
    Preflight); otherwise workflow shell calls are auto-denied and tasks fail spuriously.
18. On a no-`ready`-but-tasks-remain state, report the dependency-deadlock/gated chain;
    never exit silently.
19. Clean up worktrees of merged AND BLOCKED/parked tasks at Close; nothing is left to
    accumulate silently under `.claude/worktrees/`.
20. Reconcile dispatched vs returned each wave: a `null` from `agent()` (crashed/terminal
    failure) is marked FAILED→BLOCKED, never silently dropped.
21. A rebase conflict at delivery re-dispatches an *implement* agent (code resolution),
    not a bare delivery retry, before `BLOCKED`.

## Required Outputs

- Execution plan with dependency graph and wave preview (before launch).
- Workflow progress (native, via the Workflow run; surfaced to the human).
- Final epic summary: task-by-task trace, per-wave deferral report, blocked/parked items
  with required human decisions, `ep-check` result, wall-clock time.
- All per-task outputs (task files, planning docs, reports, session logs,
  workstream note fragments).

## Reference Files

- Base orchestration model: `references/orchestration-model.md`
- Base subagent prompt: `references/subagent-prompt-template.md`
- Workflow orchestration + design rationale: `references/parallel-delta.md`
- Claim-on-first-touch coordination: `references/ownership-delta.md`
- Implement skill: `skills/implement/SKILL.md`
- Delivery skill: `skills/delivery/SKILL.md`
- Epic check skill: `skills/ep-check/SKILL.md`
- Sequential, dependency-free fallback: `skills/gohorse-light/SKILL.md`
- tmux equivalent: `skills/parallel/SKILL.md`
