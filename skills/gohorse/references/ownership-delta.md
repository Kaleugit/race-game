# Claim-on-First-Touch Layer (gohorse)

This document specifies the **claim-on-first-touch coordination layer** of gohorse —
what it adds on top of the bare Workflow/parallel layer. Everything not contradicted
here is as described in:
- `../SKILL.md`
- `parallel-delta.md` (the Workflow/parallel layer)
- (transitively) `orchestration-model.md`

Read those first. This is a coordination layer, not a new orchestration model.

## One-paragraph summary

Without claim-on-first-touch (the bare parallel layer alone), two parallel tasks can
edit the same file and the clash is resolved later, at the serial rebase+CI drain
(re-dispatch implement → retry → BLOCKED). This layer makes
**ownership emerge at runtime**: before a subagent's first write to a file, it
atomically *claims* that file in a shared lock registry. The first claimant owns it;
a later task that needs an already-claimed file **aborts cleanly and returns
`DEFERRED`**, and the orchestrator re-queues it to a later wave — where it branches
from the winner's already-merged code (the inherited C1 fetch) and becomes the sole
writer. No pre-run map, no template change, no prediction, no agent teams, no live
orchestrator messaging. Contention is resolved at *write time* instead of *merge time*.

## Why not the alternatives (recorded so we do not relitigate)

- **Persistent "agent per file":** needs agent teams + `SendMessage` (experimental,
  not composable inside a Workflow, silent-drop bug when combined with
  `isolation:"worktree"`), holds idle agents, and makes "file" the deliverable instead
  of "task". Rejected.
- **Pre-run ownership map:** the repo's task artifacts do NOT declare write-sets before
  a run (`FILES_MODIFIED` is a *return* field of the implement subagent, known only
  after implementation). A pre-run map would be a guess from `Domain`/paths → weak
  guarantee plus extra machinery. Rejected as over-engineering.
- **Orchestrator-mediated mid-flight claim:** impossible in the substrate. Inside a
  `parallel()` barrier the Workflow script is suspended; it only hears from an agent
  via its *final* structured return, never mid-task (`workflows.md`: "No mid-run user
  input"). A live agent→script channel is agent-teams `SendMessage`
  (experimental/buggy/not composable). So coordination must be either before dispatch
  (needs pre-run knowledge we lack) or **among the agents themselves** — which is what
  this delta does.

## What this layer does NOT change vs the bare parallel layer

Ephemeral subagents; `agent({isolation:"worktree"})`; the `parallel()` implement
barrier; `schema` return; the serial delivery drain with confirmed synchronous merge;
the C1 per-wave `git fetch`; the N4 rebase-conflict path (retained as backstop); N5
null-reconcile; `ep-check` at Close; worktree cleanup. Delivery to `main` is
byte-for-byte the bare parallel layer's path (and identical to `gohorse-light`).

## The shared lock registry (RTFM-grounded)

Subagents run in separate worktrees (`.claude/worktrees/agent-*`) but **share one
`.git`**. The portable common location across all linked worktrees is
`git rev-parse --git-common-dir` (the main repo's `.git`). The registry lives at
`<git-common-dir>/gohorse-locks`, and **`scripts/gohorse-lock.sh` encapsulates every
operation on it** (`wipe` | `claim <file> <task-id>` | `release-all <task-id>`) so the
path is resolved inside the reviewed script, never built by a caller (Issue #55).

A lock is a directory named after the slugified file path. `mkdir` is **atomic on
POSIX** — the classic lock primitive, zero dependencies (CDT: zero deps + minimal
complexity). One file → one lock dir → at most one owner per wave. A claim record
`<lock>/owner` (= task id) lets later phases, cleanup, and humans see who owns what.

Preflight (Phase 0) verifies `git rev-parse --git-common-dir` resolves to the shared
`.git` from inside a worktree, alongside the inherited isolation/schema probe. If ONLY
the git-common-dir check fails (the Workflow/worktree/schema probe passed), the
claim-on-first-touch layer cannot run: **disable it and proceed with the bare parallel
layer** (`parallel-delta.md` — the retained rebase-net is the same-file backstop). Do
NOT downgrade to `gohorse-light` for this failure alone; that would needlessly lose
parallelism. `gohorse-light` is the fallback only when the Workflow/worktree primitive
itself is unavailable.

## Claim protocol (per implement subagent)

Injected into the gohorse implement-subagent prompt as a delta. The inherited
`scripts/assert_isolated.sh` worktree verification still runs **first**; the claim
logic is the first thing after isolation is confirmed and before any write.

Before the **first write to any file F** (create, edit, or move):

1. `./scripts/gohorse-lock.sh claim "F" "<task_id>"`.
   - **Exit 0** → this task owns F (the helper recorded the owner). Proceed to write.
   - **Exit 3 (contended)** → another wave-mate owns F. **Do NOT write F. Do NOT wait.**
     Go to step 3 (no hold-and-wait — see Deadlock freedom).
2. Repeat lazily for each new file the task is about to write (claim-on-first-touch,
   not a batch up front — this is the "first one to open it owns it" semantics).
3. **Lose protocol (clean abort):** `./scripts/gohorse-lock.sh release-all "<task_id>"`
   (releases only the locks this task owns), make NO commit, and return
   `status: DEFERRED` with `contended_file: F` and the list of files it did claim (so
   the orchestrator can prioritize re-dispatch after the owner merges).

The helper owns the destructive `mkdir`/`rmdir`/`rm -rf` ops on the registry, on a
path it derives itself from `git rev-parse --git-common-dir` — never a caller argument.
That is what makes the protocol **allowlistable** with one
`Bash(./scripts/gohorse-lock.sh:*)` rule and keeps the inline variable-path `rmdir` out
of the human's way (no "dangerous rmdir" prompt stalling autonomous runs — Issue #55).
The helper slugs F (percent-encoding unsafe chars) so two distinct paths never collide
on one lock.

## Deadlock freedom (must be explicit)

Two tasks could each hold one file and want the other's. gohorse is deadlock-free by
construction: **a subagent never blocks waiting on a held lock.** On any `mkdir`
EEXIST it immediately runs the lose protocol (release-all + DEFER). No hold-and-wait ⇒
no cycle ⇒ no deadlock. The cost is the loser's wasted partial work — accepted, and
rare when same-file contention is rare.

## Orchestrator delta (Workflow script)

Minimal changes to the gohorse Phase 2 loop:

1. **Wave-start lock wipe — [agent()]:** locks are only meaningful among the
   concurrently-running agents of one wave. Before dispatching each wave, a tiny
   `agent()` runs `./scripts/gohorse-lock.sh wipe` (piggyback on the inherited
   C1 sync agent). This also clears locks orphaned by a crashed agent of a prior wave.
2. **Reconcile `DEFERRED`:** a subagent returning `status: DEFERRED` is **not** BLOCKED
   and **not** FAILED. It returns to `pending` and re-enters `ready` in a later wave.
   Because the owner delivered (merged to `origin/main`) and the next wave does the
   inherited C1 `git fetch`, the deferred task's fresh worktree branches from the merged
   code and is now the sole writer of the formerly-contended file.
3. **Starvation guard (defer cap):** track a per-task `deferCount`. If a task is
   DEFERRED more than `K` times (default 3), stop deferring and mark it BLOCKED with a
   "persistent file contention" reason for human/Close reporting. `DA-defer-cap`:
   criterion = minimal-complexity + avoid silent non-progress (mirrors gohorse's
   no-silent-deadlock rule).
4. Everything else (gating, serial delivery, N4/N5, `ep-check`, cleanup) unchanged.

### IMPLEMENT_RETURN schema delta

Inherit the gohorse `IMPLEMENT_RETURN` schema, with the `status` enum extended:

```
status: "IMPLEMENTED | BLOCKED | FAILED | AWAITING_APPROVAL | DEFERRED"
```

and two optional fields when `status == DEFERRED`:

```json
{ "contended_file": "path that was already claimed by another task",
  "claimed_files": ["files this task did claim before losing (released on abort)"] }
```

## Cost / honesty

- **Wasted work on loss:** a deferred task discards whatever it did before the contended
  write. Cheap when contention is rare; degrades toward redundant work on a hot file.
- **Throughput on hot files:** many tasks writing one central file serialize across
  waves, approaching `gohorse-light` for that cluster. That is correct (they cannot run in
  parallel safely), but the speedup is data-dependent. Report, at Close, the deferral
  chain and any defer-capped tasks so the human sees it.
- **Backstop retained:** the gohorse rebase-net (N4) stays, covering the residue the
  lock cannot (e.g. two tasks touching the same file that was unclaimed at the instant
  of overlap, or non-write coupling).
- **Contract coupling is NOT write contention (Issue #56):** the claim prevents two
  tasks from *writing* the same file; it does nothing for a *contract* shared across
  files that the producer and a consumer hold in different tasks (e.g. a WS field
  renamed by the producer while an untyped frontend consumer still reads the old name).
  `tsc` misses the untyped side and the suite stays green — only behavioral/visual tests
  (the `ep-check` frontend dimension) catch it. Prevention belongs upstream in
  `gen-tasks` (enumerate contract consumers into scope or a dependent task — its
  "Contract-consumer coupling" principle), not in this layer.

`DA-hotfile-honesty`: when same-file contention is pervasive, the retained rebase-net
still covers it, or drop to `gohorse-light` (fully serial). Claim-on-first-touch wins
when tasks are *mostly* file-disjoint with occasional overlap — exactly where
preventing the clash beats repairing it.

## CDT mapping (why this shape)

- **Minimal complexity:** one shell primitive (`mkdir` lock) + one new return status
  (`DEFERRED`) + a defer cap. No new artifact, no template change, no new substrate.
- **Zero dependencies:** POSIX `mkdir`; reuses `git rev-parse --git-common-dir`.
- **Reversibility:** a coordination layer over the bare Workflow/parallel layer;
  remove it → that bare parallel behavior back.
- **Economically viable:** no idle persistent agents; one dispatch pass (no planning pass).
- **RTFM-clean:** avoids the agent-teams + `isolation:"worktree"` bug and the
  no-mid-run-input limit; relies only on documented Workflow + worktree + shared-`.git`.

## Owner-of-record for post-`ep-check` correction

The task that merged a file owns its post-`ep-check` correction (natural rule —
confirmed by human). No explicit owner field is required; merge order is the record.
