# Workflow/Parallel Layer (gohorse)

This document specifies the **Workflow/parallel orchestration layer** of gohorse —
what it adds relative to the sequential `gohorse-light` base. Everything not
contradicted here is as described in:
- `orchestration-model.md`
- `subagent-prompt-template.md`

Read those first. This file is the parallel/Workflow layer, not a replacement.

## Source of truth for the Workflow JS API

The `agent()`, `parallel()`, `pipeline()`, `agent({ schema })`,
`agent({ isolation: "worktree", label })` surface used here is specified by the
**Workflow tool's own contract** (the tool description/schema available to the
orchestrator that runs `/gohorse`), NOT by the public `workflows.md` web page
(which describes workflows conceptually and does not list the JS API). When this
file says "the Workflow contract documents X", that is the authoritative source.
Behavioral limits that ALSO appear on the public page (16 concurrent / 1000 total,
intra-session resume, no mid-run user input, allowlist/permission behavior) are
cited as `workflows.md`.

Key contract facts relied upon:
- `agent(prompt, { schema })` forces the subagent to return a **validated** object
  (no manual parsing); `agent()` returns **`null`** if the subagent is skipped or
  dies on a terminal error after retries — callers must reconcile, not blindly drop.
- `parallel(thunks)` is a barrier; a thunk that throws resolves to `null`.
- `agent({ isolation: "worktree" })` runs the subagent in a fresh git worktree.

## Orchestrator vs Workflow boundary (read first)

The Workflow runtime runs a JS script that **only coordinates agents** — it has
**no direct filesystem or shell access** (`workflows.md`). Every step is one of:
- **[orchestrator]** — done by the main `/gohorse` session, *before* or *after* the
  Workflow run (read inputs, run `build-dag.sh`, present the plan, post-run
  `ep-check`, worktree cleanup). The orchestrator has NO `agent()` — to run agents it
  must launch a workflow.
- **[agent()]** — a subagent spawned *inside* the Workflow script (sync/fetch,
  implement a task, deliver a task). Only these touch the repo/shell.

## Substrate

- **Subagent worktrees branch from `origin/HEAD` (the repo's default branch) by
  default**, falling back to local `HEAD` if no remote/fetch; NOT from the
  orchestrator's HEAD, unless `worktree.baseRef` is `"head"` (`worktrees.md`).
  gohorse relies on the default plus a per-wave fetch — see § Cross-wave
  base-branch (C1). It does NOT change `worktree.baseRef`.
- Worktree commits live in the **shared `.git`**, so a later delivery `agent()` can
  `git checkout`/rebase/merge that branch; it must also reach `origin/main` for the
  next wave's worktrees to see it.
- Worktree auto-cleanup removes only worktrees with **no uncommitted changes, no
  untracked files, and no unpushed commits**, after `cleanupPeriodDays`
  (`worktrees.md`). Implementation worktrees always have commits → NOT auto-cleaned
  in-run; gohorse removes them explicitly (see § Cleanup).
- Concurrency: up to **16 agents** concurrent (fewer on limited CPUs) and **1,000
  total per run** (`workflows.md`). `max_parallel` (default 4) bounds top-level
  implement tasks per wave; a request above the runtime cap is reduced by the runtime.

## Preflight (Phase 0) — [orchestrator]

Preflight that needs `agent()` must itself be a **tiny probe workflow** (the
orchestrator has no direct `agent()`): launch a one-agent workflow via the Workflow
tool and read its result.

1. **Workflow + worktree isolation + schema return** — the probe workflow runs one
   `agent({ isolation: "worktree", schema })` that runs
   `./scripts/assert_isolated.sh --expected-branch "$(git rev-parse --abbrev-ref HEAD)"`,
   writes a file in its worktree, and returns a small structured object including the
   guard's exit code. Assert: the workflow ran, the guard confirmed isolation (exit 0,
   i.e. NOT the primary repo root), AND the validated `schema` object came back.
   *Correctness-critical:* if any fails, abort → recommend `gohorse-light`. (Uses the same
   guard the per-task subagents use, and proves the `schema` path N1 depends on.)
2. **Permission allowlist (C2)** — delivery agents run shell inside the workflow.
   `workflows.md`: subagents run `acceptEdits` and inherit your allowlist, but shell/
   web/MCP outside it "can still prompt you mid-run"; a background run auto-denies
   such prompts. Verify the allowlist (or run mode) permits `git`, `gh`,
   `./skills/delivery/scripts/*`, `./scripts/validate-changed.sh`,
   `./scripts/validate-all.sh`, the CI command, and —
   when the claim-on-first-touch layer is active — `./scripts/gohorse-lock.sh` (one
   prefix rule `Bash(./scripts/gohorse-lock.sh:*)` covers wipe/claim/release-all; see
   `ownership-delta.md`).
   *Correctness-critical for delivery:* otherwise every delivery stalls (prompt) or
   fails (auto-deny). Add them or abort → recommend `gohorse-light`.
3. **Auto-merge viability (A5)** — verify the repo's delivery path can merge without a
   mandatory human reviewer (PR auto-merge enabled / branch protection does not
   require human approval). If a human gate exists, the synchronous-merge drain would
   stall; warn the human and treat affected tasks as parked rather than blocking.
4. **Notification** — check `PushNotification`. *Degradable:* fall back to terminal.
5. **Unpushed epic-setup commits (C1 wave-1 base)** — wave-1 worktrees branch from
   `origin/HEAD`, NOT the orchestrator's local `HEAD` (§ Substrate). If the epic was
   decomposed/committed only on **local `main`** (task decomposition, the
   `docs/EPICO-*-TASKS.md`, the `TASK-*.md` spec files) and not yet pushed, wave 1
   branches from a **stale** base WITHOUT those files and every task returns BLOCKED
   "stale base". Run `git log origin/main..HEAD --oneline`; if it is non-empty, **push
   the setup commits to `origin/main` before launching wave 1** (or abort with an
   explicit message telling the operator to push them). This is the wave-1 counterpart
   of the per-wave fetch in § C1 (which only fixes waves ≥2).
   *Correctness-critical:* otherwise the whole of wave 1 is BLOCKED at epic start.

Record the outcome as a `DA-xxx`. A notification failure never aborts the run.

## Cross-wave base-branch correctness (C1)

A later wave's implement worktree (branched from `origin/HEAD`) contains a prior
wave's merged code only if that merge reached `origin/main` **and the local remote
refs were fetched** before the worktree is created. Local `origin/HEAD`/`origin/main`
update only on `git fetch`/push, not from a server-side `gh` PR merge. gohorse
guarantees freshness by ordering plus an explicit fetch.

> **Wave 1** has the symmetric hazard for the *epic-setup* commits, not prior-wave
> merges: it branches from `origin/HEAD`, so the task spec files must already be in
> `origin/main`. That is handled in Preflight step 5, not here.

1. The serial delivery drain merges each task to `origin/main` and the delivery
   `agent()` **confirms the merge before returning** (§ Delivery, also A5).
2. **At the start of every wave after the first, a sync `agent()` runs `git fetch
   origin`** so `origin/HEAD`/`origin/main` are current before this wave's implement
   worktrees are created. Worktrees then branch from the freshly-fetched `origin/HEAD`,
   which already includes prior waves' merged code.

`DA-worktree-base`: chose push + per-wave fetch over `worktree.baseRef:"head"` —
criterion reversibility + minimal-complexity (no global settings change; reuses
delivery's push to `origin/main`).

## Workflow Orchestration (Phase 2) — [agent()s inside the script]

Deterministic, wave-based loop. Pseudocode:

```js
// args: { tasks: [{id, dependsOn, mode, file}], maxParallel }
const done = new Set(), blocked = new Set(), parked = new Set();
// N5c: tasks whose delivery returned null AND whose merge-state could not be
// determined (the reconcile agent died in the SAME outage). NOT blocked — limbo,
// re-reconciled at each wave start and at exit (see § Double-failure reconcile).
const pendingReconcile = new Set();
let context = "", first = true;

while (true) {
  const pending = args.tasks.filter(t =>
    !done.has(t.id) && !blocked.has(t.id) && !parked.has(t.id)
    && !pendingReconcile.has(t.id));                   // limbo: not re-dispatched
  if (!pending.length && !pendingReconcile.size) break;  // normal exit
  if (!pending.length) {                                // only limbo left → reconcile & exit
    await reconcilePending(pendingReconcile, { done, blocked, pendingReconcile });
    if (pendingReconcile.size) log("UNRECONCILED (re-run to finalize vs origin/main): "
      + JSON.stringify([...pendingReconcile]));
    break;
  }

  const ready = pending.filter(t => t.dependsOn.every(d => done.has(d)));
  if (!ready.length) {                                  // A3: no ready task
    // A dependent can be gated by a task stuck in limbo (pendingReconcile) that is
    // actually merged — reconcile (with a fresh fetch) BEFORE declaring deadlock.
    if (pendingReconcile.size) {
      const before = done.size;
      await agent("Run `git fetch origin` and report origin/main SHA.", { label: "sync" });
      await reconcilePending(pendingReconcile, { done, blocked, pendingReconcile });
      if (done.size > before) continue;                 // a gate opened → re-evaluate
    }
    const chain = pending.map(t => ({ id: t.id,
      gatedBy: t.dependsOn.filter(d => !done.has(d)).map(d =>
        blocked.has(d) ? `${d}(BLOCKED)` : parked.has(d) ? `${d}(PARKED)`
        : pendingReconcile.has(d) ? `${d}(UNRECONCILED)` : `${d}(CYCLE/UNREACHABLE)`) }));
    log("DEPENDENCY DEADLOCK / gated chain:\n" + JSON.stringify(chain, null, 2));
    break;
  }

  // C1: refresh local remote refs so new worktrees see prior merges
  if (!first) await agent("Run `git fetch origin` and report origin/main SHA.",
                          { label: "sync" });
  first = false;

  // N5c reconcile-on-resume: after the fetch (fresh origin/main), re-derive the
  // merge-state of any task left in limbo by a prior wave's double-failure. A merge
  // that landed becomes done (opens dependents); a confirmed non-merge becomes blocked;
  // still-unknown (outage persists) stays in limbo. This is what makes the reconcile
  // survive the outage that disabled it — it runs again once connectivity returns.
  if (pendingReconcile.size)
    await reconcilePending(pendingReconcile, { done, blocked, pendingReconcile });

  // 1) IMPLEMENT — parallel barrier; worktree-isolated; validated schema return
  const wave = ready.slice(0, maxParallel);
  const results = await parallel(wave.map(t => () =>
    agent(buildImplementPrompt(t, context, contractWarnings(t)),
          { isolation: "worktree", schema: IMPLEMENT_RETURN, label: t.id })));

  // N5: reconcile dispatched vs returned — agent() returns null on crash/terminal fail
  for (let i = 0; i < wave.length; i++) {
    const t = wave[i], r = results[i];
    if (r === null) { blocked.add(t.id);               // after inherited 1 retry
                      log(`FAILED (no return): ${t.id}`); continue; }
    if (r.status === "AWAITING_APPROVAL") { parked.add(t.id); continue; }
    if (r.status !== "IMPLEMENTED")       { blocked.add(t.id); continue; }

    // 2) DELIVER — SERIAL (never parallel): one confirmed merge at a time
    const d = await agent(buildDeliveryPrompt(r), { label: `deliver:${t.id}` });
    // N5b/N5c: agent() returns null when the delivery subagent dies on a transient API
    // error — which can land AFTER the merge already reached origin/main. Treating
    // that null as terminal falsely BLOCKs a delivered task and deadlocks dependents.
    // Reconcile against git FIRST — but the reconcile is ITSELF an agent() that can die
    // in the SAME outage, so use the RETRYING tri-state reconcileMerged() and treat an
    // undetermined result as limbo (pendingReconcile), NEVER terminal BLOCKED.
    if (d === null) {
      const st = await reconcileMerged(t);               // retry/backoff; 'merged'|'not-merged'|'unknown'
      if (st === "merged")          { done.add(t.id); context = accumulate(context, r); }
      else if (st === "not-merged") { blocked.add(t.id); }   // genuinely undelivered
      else                          { pendingReconcile.add(t.id); } // double-failure → limbo, retried on resume
      continue;
    }
    if (d.merged) { done.add(t.id); context = accumulate(context, r); }
    else if (d.reason === "REBASE_CONFLICT") {
      // N4: conflict needs CODE resolution → re-dispatch an implement agent, then re-deliver
      const fix = await agent(buildConflictFixPrompt(r, d), { isolation: "worktree", label: `fix:${t.id}` });
      const d2 = fix ? await agent(buildDeliveryPrompt(fix), { label: `redeliver:${t.id}` }) : null;
      if (d2 === null) {                                  // re-deliver can also die post-merge
        const st = await reconcileMerged(t);
        if (st === "merged")          { done.add(t.id); context = accumulate(context, r); }
        else if (st === "not-merged") { blocked.add(t.id); }
        else                          { pendingReconcile.add(t.id); }
      }
      else if (d2.merged) { done.add(t.id); context = accumulate(context, r); }
      else blocked.add(t.id);
    } else blocked.add(t.id);                            // CI fail etc., after 1 retry
  }

  // 3) WAVE-BOUNDARY VALIDATION (optimistic model — O1) — run the repo-wide net
  //    ONCE per wave, AFTER this wave's merges landed and BEFORE the next wave's
  //    C1 fetch creates worktrees. The per-task gate is the cheap, attributable
  //    `validate-changed` (delivery script); the expensive repo-wide `validate-all`
  //    is amortized to once per wave here instead of N times on the serial path.
  //    This gate MUST finish (incl. any rollback) before the loop iterates, so a red
  //    never reaches the next wave's base.
  //
  //    ATTRIBUTION (M1) — only revert what THIS wave caused. validate-all bundles
  //    NON-file-attributable checks (`run-tests`, `validate-dates`) whose failures
  //    name no file → empty offendingFiles. Reverting "all merged-this-wave on empty
  //    offendingFiles" would mass-discard a wave's good work and reintroduce #58 at
  //    wave granularity, and a pre-existing/flaky red would never go green no matter
  //    what we revert. So: baseline first, and SURFACE (don't mass-revert) the
  //    unattributable case.
  const mergedThisWave = wave.filter(t => done.has(t.id));
  if (mergedThisWave.length) {
    const v = await agent(
      "Fetch origin and check out the current origin/main, run `scripts/validate-all.sh` "
      + "against it, and report { passed:boolean, offendingFiles:string[] } "
      + "(offendingFiles = files named by failing checks; empty if the failure is not "
      + "file-attributable, e.g. a failing test or a date check).",
      { label: "wave-validate", schema: VALIDATE_RETURN });
    if (v && v.passed === false) {                       // null => inconclusive (crashed agent): re-run next boundary
      const culprits = attributeToTasks(v.offendingFiles, mergedThisWave); // [] when unattributable
      if (!culprits.length) {
        // Unattributable (test/date failure, or a red that pre-existed on the wave
        // base). Reverting good merges can't fix it → STOP and surface for the human;
        // do NOT mass-revert. The wave's merges stay; the next wave does not launch.
        log(`WAVE-BOUNDARY RED, unattributable: ${JSON.stringify(v.offendingFiles)} — `
          + `halting before next wave; human fix-forward required (not auto-reverting).`);
        break;
      }
      // Attributable: revert ONLY the culprit merges (newest-first; revert is clean
      // because gohorse tasks are mostly file-disjoint), BLOCK them for fix-forward,
      // keep their worktrees (cleanup only confirmed-green tasks).
      for (const t of culprits.reverse()) {
        await agent(`Revert ${t.id}'s merge on origin/main and push. The merge is a true `
                  + `merge commit (gohorse delivers with \`gh pr merge --merge\`), so use `
                  + `\`git revert -m 1 <merge>\`; if it is NOT a merge commit (a derived `
                  + `project on squash/rebase merges), use a plain \`git revert <sha>\`. `
                  + `Confirm validate-all is green afterwards.`,
                    { label: `rollback:${t.id}` });
        done.delete(t.id); blocked.add(t.id);            // fix-forward in a later run; worktree kept
        context = stripContext(context, t);              // undo the accumulate() from its delivery
      }
    }
  }
}
return { done: [...done], blocked: [...blocked], parked: [...parked],
         unreconciled: [...pendingReconcile] };  // re-run /gohorse to finalize vs origin/main
```

Notes:
- **Gating invariant:** a task enters a wave only when every `Depends On` is in `done`
  (merged to `origin/main`). Dependents always launch in a later wave — see C1.
- **Serial delivery + confirmed merge (A5):** the delivery loop is sequential and
  `d.merged` is true only after a confirmed merge; merges never overlap (strategy C).
- **N5:** an *implement-phase* `null` (crashed/terminal-failed agent, no merge yet) is
  marked FAILED → BLOCKED, never silently dropped (matches inherited error model). A
  *delivery-phase* `null` is NOT terminal on its own — reconcile first (N5b).
- **N5b (delivery git-reconcile):** `agent()` returns `null` when the delivery subagent
  dies on a transient API error, and that death can occur *after* the merge already
  reached `origin/main` (e.g. `socket connection closed` right after `gh pr merge`).
  Marking such a task BLOCKED falsely fails a delivered task and deadlocks its
  dependents. The reconciliation re-derives merge-state from git: `git fetch origin`,
  then `merged` iff the delivery actually landed — `gh pr list --head <t.branch> --state
  merged` returns the PR, OR `git merge-base --is-ancestor <t.branchTip> origin/main`.
  A confirmed merge → `done` (open the dependents' gate); a confirmed non-merge → BLOCKED.
- **N5c (double-failure — reconcile must survive the outage that triggered it):** the
  reconcile is ITSELF an `agent()` (the Workflow script has no shell), so a SUSTAINED
  outage kills the delivery agent AND the reconcile agent in the same drop — the naive
  `if (mergedToOrigin) … else BLOCKED` then false-BLOCKs an already-merged task INSIDE the
  run (observed EP-057: `deliver:T07` FailedToOpenSocket + `reconcile:T07` ConnectionRefused;
  both branches MERGED; recovery was 100% manual). Two-part fix: (1) `reconcileMerged(t)`
  is **retrying/backoff** and **tri-state** — `merged` / `not-merged` / `unknown`; transient
  errors (`FailedToOpenSocket`/`ConnectionRefused`/`socket connection closed`) are retried,
  never mapped to a verdict. (2) An `unknown` result is **limbo** (`pendingReconcile`), NEVER
  terminal BLOCKED: it is re-reconciled at the next wave start (after the C1 fetch), before
  any deadlock verdict, and at exit; whatever stays `unknown` when the run ends is returned
  as `unreconciled` (NOT blocked) so the next `/gohorse` run's inherited task-file + git
  reconciliation finalizes it. The reconcile thus survives the outage by simply running
  again once connectivity returns — it is never a single point that dies with the delivery.
- **N4:** a rebase conflict re-dispatches an *implement* agent to resolve code, then
  re-delivers — only BLOCKED if that fails. CI failures retry delivery once. A re-deliver
  `null` is reconciled via N5b/N5c too (it can also die post-merge, incl. the double-failure).
- **A3:** the no-`ready` branch reports the gated chain; it does not break silently.
- **Barrier per wave:** acceptable since delivery is serial. `pipeline()` overlap is
  a future optimization (YAGNI).
- **Empty `StructuredOutput {}` retry loop (harness defense):** a subagent that finished
  its work (commit on the task branch) can still hang emitting `StructuredOutput {}`
  (empty object) → schema validation fails → infinite retry → it never returns and
  delivery never fires. Root cause is the Claude Code Workflow harness, not the skill,
  but defend against it: (1) keep return schemas (`IMPLEMENT_RETURN`) **small and flat** —
  fewer required fields, no deep nesting, to cut schema-mismatch retries; (2) when a run
  stalls and `git log` on the task branch shows the work committed, `TaskStop` the run
  and finalize manually (treat as IMPLEMENTED), then deliver — do not wait on the loop.

Reconcile helpers (N5b/N5c):
- `reconcileMerged(t)` → `'merged' | 'not-merged' | 'unknown'`. A short retry/backoff
  loop (e.g. 3 attempts) around a reconcile `agent()` that runs `git fetch origin` then
  reports whether `gh pr list --head <t.branch> --state merged` returns the PR OR
  `git merge-base --is-ancestor <t.branchTip> origin/main` succeeds. A transient
  connection/API error (`FailedToOpenSocket`/`ConnectionRefused`/`socket connection
  closed`, or `agent()`→`null`) is **retried**, and after the retries are exhausted
  returns `'unknown'` — it is NEVER coerced to `'not-merged'`. Only a positive
  confirmation yields `'merged'`; only a positive non-merge yields `'not-merged'`.
- `reconcilePending(set, { done, blocked, pendingReconcile })` — for each task in the
  set, call `reconcileMerged`; `merged` → move to `done` (and `accumulate` context),
  `not-merged` → `blocked`, `unknown` → leave in the set (retry next wave / next run).

### Subagent prompt delta (implement subagents)

Build from `subagent-prompt-template.md` with these
overrides (state them explicitly):

1. **The harness provides the worktree** (`isolation: "worktree"`), but on a
   **harness-named branch** (`worktree-wf_<runid>-<n>`), NOT on the task branch. The
   subagent MUST NOT run the inherited Phase 0 step 6 `create-worktree.sh` nor create
   its own worktree — it creates its **task branch inside the provided worktree** (1b).
1b. **Verify the harness worktree, then create the task branch in it, before the first
   write.** Do NOT trust the worktree (anthropics/claude-code #51596: `isolation:
   "worktree"` can silently reuse a stale/contaminated worktree on agentId-prefix
   collision) AND do NOT assume it is already on the task branch — it is on
   `worktree-wf_*`, because the voided `create-worktree.sh` was the only step that would
   have put it on the `TASK-*` branch. Verifying directly with `--expected-branch <task
   branch>` here would therefore fail (exit 2) and BLOCK every implement subagent. Four
   steps, in order:
     1. Confirm structural isolation on the **current (harness) branch**:
        `./scripts/assert_isolated.sh --expected-branch "$(git rev-parse --abbrev-ref HEAD)" --require-clean`.
        Non-zero exit ⇒ return `status: BLOCKED` (blocker "worktree isolation
        unverified"); do NOT write, do NOT guess a worktree.
     2. Create/switch to the task branch **in this worktree**:
        `git checkout -b <this task's branch> 2>/dev/null || git checkout <this task's branch>`.
     3. Re-confirm on the task branch:
        `./scripts/assert_isolated.sh --expected-branch <this task's branch> --require-clean`
        (must exit 0). Non-zero ⇒ `status: BLOCKED` as above.
     4. Commit all work on `<this task's branch>` (delivery rebases/merges that branch;
        the `--pre-commit` guard and the delivery stage expect the conventional `TASK-*`
        name).
   The inherited Phase 0 verify step is RETAINED; only the `create-worktree.sh`
   provisioning in step 6 is voided.
2. **Stop at handoff.** Run implement Phase 0 → Phase 4, then STOP. Do NOT run Phase 5
   (Delivery). Leave the task branch committed, handoff PENDING.
3. **Status semantics.** Report `IMPLEMENTED` (not `COMPLETED`). `COMPLETED` is set by
   the script after a confirmed merge.
4. **Structured return via `schema`** (validated). Do NOT emit the inherited
   text-marker block — REMOVED for gohorse.
5. **Report the worktree path** (N3) in the return so post-run cleanup can target it.

#### Voided / redefined inherited sections (zero ambiguity)

- `subagent-prompt-template.md` Phase 0 step 6 (`create-worktree.sh`) and Phase 5
  (Delivery) — voided.
- `subagent-prompt-template.md` Return Protocol text-marker block — voided, replaced
  by the JSON `schema` below.
- `orchestration-model.md` Return Protocol `DELIVERY_STATUS`/`DELIVERY_PR` fields and
  the Post-dispatch "If COMPLETED: DELIVERY_STATUS is MERGED/PR_OPEN" check — voided
  in the *subagent* return (delivery is tracked by the script).
- **(A4)** `orchestration-model.md` § STATUS Semantics enum and the Post-dispatch
  "STATUS is a valid enum value" check — **redefined**: the valid subagent enum is
  `IMPLEMENTED | BLOCKED | FAILED | AWAITING_APPROVAL`. The script maps subagent
  `IMPLEMENTED` → task `COMPLETED` only after a confirmed merge.

#### IMPLEMENT_RETURN schema

```json
{
  "task_id": "string",
  "status": "IMPLEMENTED | BLOCKED | FAILED | AWAITING_APPROVAL",
  "execution_mode": "Quick | Standard | Critical",
  "evidence_summary": "one-line PASS/FAIL per acceptance criterion",
  "branch": "task branch name (in the shared .git)",
  "worktree_path": "path of the provided worktree (for post-run cleanup)",
  "blockers": ["..."],
  "autonomous_decisions": ["DA-001: ... — Criteria: ... — Rationale: ..."],
  "contracts_changed": ["..."],
  "artifacts_created": ["..."],
  "files_modified": ["path: brief change"],
  "key_context_for_next_tasks": ["..."]
}
```

Field meaning/accumulation/size-management inherited from `orchestration-model.md`
§ Inter-Task Context Model. `files_modified`/`contracts_changed` feed contract
warnings injected into later waves.

### Delivery subagent — [agent()], serial

One delivery `agent()` per implemented task, run sequentially:
1. `git fetch origin`; rebase the task `branch` onto latest `origin/main`. If the
   rebase conflicts, return `{ merged:false, reason:"REBASE_CONFLICT" }` (the script
   re-dispatches an implement agent to resolve — N4).
2. Run `skills/delivery` (semantic validation + CI + PR). The pre-merge governance
   gate is now **incremental** (`scripts/validate-changed.sh` — base `origin/main` …
   tip task branch), NOT the repo-wide `validate-all.sh`: it validates only this
   task's change set (~seconds, attributable to THIS task) instead of re-scanning the
   whole repo on the serial critical path. The repo-wide pass runs once per wave at the
   boundary (O1) — see § Optimistic delivery model below.
3. **(A5) Confirm a synchronous merge to `origin/main` before returning.** Do NOT
   return `merged:true` on a still-open PR / pending auto-merge. If delivery uses
   PR-auto-merge, poll `gh pr view` until merged, with a **bounded wait** (interval +
   max total, e.g. every 30s up to a cap). On timeout, return `{ merged:false,
   reason:"MERGE_TIMEOUT" }` → the script marks BLOCKED (re-attempt in a later run);
   never block the pipeline unboundedly. Preflight step 3 reduces the chance of an
   un-mergeable PR.
4. **(C2)** Requires `git`, `gh`, delivery scripts, `validate-changed.sh`,
   `validate-all.sh`, CI allowlisted.
On CI failure: retry once with error context; still failing → `{ merged:false }`.

### Optimistic delivery model (merge-first + wave-boundary validation — O1)

The per-task delivery drain used to put the repo-wide `validate-all.sh` (minutes;
`validate-conventions` is super-linear in git history) on the **serial** critical path
— twice per delivery, N times per epic — and a missing completion field left by a
SIBLING task's finalize would fail the shared repo-wide gate and block the delivery of
an otherwise-perfect task (issues #57/#58). The optimistic model removes both:

1. **Cheap, attributable pre-merge gate.** Each delivery runs only `validate-changed`
   on its own change set (step 2). A red is caused by THIS task, never a sibling's
   pre-existing defect — the sibling coupling of #58 is dissolved at the root.
2. **Merge immediately** (serial confirmed merge, A5 — unchanged).
3. **Repo-wide validation once per wave, at the boundary** (loop step 3 / O1), AFTER
   the wave's merges land and BEFORE the next wave's C1 fetch creates worktrees. The
   expensive scan is amortized to once per wave (≈ number of waves) instead of once per
   task: **serial-sum → per-wave-max**.
4. **Rollback-on-red — attributable only.** If the boundary `validate-all` fails,
   attribute the failure to the offending merged task(s) via `offendingFiles` and revert
   ONLY those (newest-first; revert is clean because gohorse tasks are mostly
   file-disjoint), mark them BLOCKED for fix-forward, and **keep their worktrees**
   (Cleanup removes only confirmed-green tasks). The revert assumes a true merge commit
   (gohorse delivers with `gh pr merge --merge`), so `git revert -m 1 <merge>`; a derived
   project on squash/rebase merges has non-merge commits → use a plain `git revert <sha>`.
   **Unattributable red (M1):** `validate-all` bundles non-file-attributable checks
   (`run-tests`, `validate-dates`) and may be red from a pre-existing/flaky cause —
   `offendingFiles` is then empty. Do NOT mass-revert the wave (that would discard good
   work and reintroduce #58 at wave granularity, and would never go green if the red
   pre-existed): **halt before the next wave and surface it for human fix-forward.**

**Wave-boundary invariant (correctness-critical).** The boundary validation is the
gate that keeps an unvalidated commit from becoming the next wave's base. It MUST
complete (and finish any rollback) before the loop iterates to the next wave's C1
fetch. This is what makes merge-first safe: the only real risk — a sibling stacking on
an unvalidated commit — is eliminated because no wave starts on top of un-validated
(or reverted) state.

Helpers used by the loop pseudocode:
- `VALIDATE_RETURN` — `{ passed: boolean, offendingFiles: string[] }` (small, flat).
- `attributeToTasks(offendingFiles, mergedThisWave)` — map each offending path to the
  wave task whose change set (from its `IMPLEMENT_RETURN.files_modified`) contains it;
  returns the set of culprit tasks, or **`[]` when `offendingFiles` is empty/unattributable**
  (e.g. a `run-tests`/`validate-dates` failure). The loop treats `[]` as "halt and
  surface" (M1), never as "revert everything".
- `stripContext(context, t)` — undo the `accumulate(context, r)` done at t's delivery,
  so a rolled-back task does not leak its (reverted) context into later waves.

### AWAITING_APPROVAL parking

A Critical task whose Phase 2 needs human sign-off returns `AWAITING_APPROVAL`. The
script parks it (no delivery), leaves dependents gated, reports it. Approval + resume
happens in a subsequent run — `workflows.md`: *"No mid-run user input… For sign-off
between stages, run each stage as its own workflow."* Parking never stalls siblings.

### Cleanup (A2) — [orchestrator], per-merge + post-run

- **Per-merge during the run:** `git worktree remove` a task's worktree as soon as
  its branch merges, not only at the end. An orphan worktree sitting on the same
  HEAD is exactly the vector that makes a confused agent's *guess* of the wrong
  worktree "plausible" (the INC behind #43). Removing per-merge shrinks that window.
- **Merged tasks (post-run sweep):** remove any remaining merged-task worktrees.
- **BLOCKED/parked tasks:** their worktrees hold commits and are NOT auto-cleaned.
  Using `worktree_path` from each return (N3), the orchestrator either
  `git worktree remove --force <path>` them or reports the paths for human inspection
  (state which in the summary). Nothing is left to accumulate under `.claude/worktrees/`.
- **End-of-epic orphan sweep (safety net):** `git worktree list` and reconcile
  against the set of `worktree_path` values returned by the run. Any worktree that
  did NOT come back in a return (e.g. an agent that died mid-run) is an orphan —
  inspect it (see recovery runbook below) and remove or report it. Never silently
  leave or silently delete: a dead agent's worktree may hold uncommitted source.

#### Diff-before-copy convention

When consolidating or porting files **from a worktree into the main tree**, always
`git diff` (or `git diff --no-index`) the source against the destination FIRST.
Never blind-copy: a blind copy overwrites legitimate edits in the destination
(real UI/source loss has happened this way). Copy only after the diff confirms what
changes.

#### Dead-agent recovery runbook (referenced by #76)

A workflow agent that dies (network/API drop) can leave its source **uncommitted**
in its worktree. Recover it; do NOT re-implement from scratch:

1. Locate the worktree (its `worktree_path` from a partial return, or via the
   end-of-epic orphan sweep above).
2. Inspect it read-only: `git -C <wt> status` and `git -C <wt> diff` (plus
   `git -C <wt> diff --cached` for staged-but-uncommitted work).
3. If real source is present, commit it on the task branch from within the
   worktree (honoring the post-commit source-presence guard, `subagent-prompt-template.md`),
   or hand the diff to a resumed agent. Re-implementing blindly discards this work.
4. Only after confirming the worktree holds nothing recoverable, remove it.

### Retomability (A6)

- **Native workflow resume (intra-session only):** `workflows.md` — resume works only
  within the same Claude Code session; completed `agent()` calls return cached results.
  Exit Claude Code mid-run → the next session starts the workflow **fresh**.
- **Inherited task-file resume (inter-session):** re-running `/gohorse` re-derives
  state from task-file status + `git log` (`orchestration-model.md` § Retomability).
  COMPLETED/merged → skip; IN_PROGRESS with commits → resume from detected phase; empty
  never-committed worktrees auto-clean and the task restarts PENDING.

## Failure modes of the native Workflow tool (observed)

Two real failure modes of the **native Workflow tool** (the contract that drives
`/gohorse`) that bite in practice. Neither is a bug — both are contract behavior
mitigated by convention.

### F1 — `args` arrives `undefined`

The Workflow contract states `args` is "the value passed as Workflow's `args`
input, verbatim (**undefined if not provided**)". A script that reads config off
`args` (`args.tasks`, `args.map`, `args.filter`) throws immediately when the
invocation passed no `args`. Empirically `const TASKS = args.tasks` died in ~12 ms
with 0 agents spawned (EP-052).

- **Convention:** inline run config as a `const` in the script body (task list,
  paths) instead of depending on `args`. If `args` is genuinely used, guard it:
  `const TASKS = args?.tasks ?? [ ...inlined... ]`. Never assume `args` is present.

### F2 — heavy implement agent loops on empty `StructuredOutput`

With `agent({ schema })` the subagent is forced to return a validated object. A
**heavy** implement agent (large working context at return time) can repeatedly
call `StructuredOutput` with an empty `{}` and never converge, burning the whole
wave. Observed: **244× retry** of `StructuredOutput` with empty input in a single
agent, no self-heal (EP-051 T01). A light probe with a similar schema returned
fine — so:

- **Root cause is the weight of the CONTEXT at return time, not the count of
  `required` fields.** In the EP-051 repro the agent carried a 153 MB tarball
  `npm install` + a persona sub-agent spawned inside the implement + a full build +
  a large curated doc. The heavy context degrades structured-object emission.
- **Mitigation (zeroed the loop; T02–T05 fell to 2–3 transient self-healed
  retries):**
  - **Minimal return schema** — only `task_id, status, branch, worktree_path`
    `required`; everything else optional. The rich context (contracts changed, key
    context for next tasks, decisions) is recovered from the task report / git
    post-merge, not from the return object.
  - **Light-context discipline at return:** do the bookkeeping (task-file updates,
    notes) BEFORE the return; do NOT spawn persona sub-agents inside the implement
    agent (context bloat); make the last action a SINGLE `StructuredOutput` call
    with short strings.
- **Recurrence signal:** `grep -c "does not match required schema"` over the run's
  `agent-*.jsonl`.
- **Partially mitigated upstream (Claude Code 2.1.196):** the harness stopped
  rendering a rejected `StructuredOutput` attempt alongside its retry (the
  "duplicate recap" bug), which previously inflated the agent's context and
  **amplified** F2 (rejection → duplicated in context → heavier context → worse
  emission → more rejections). The 2.1.196 fix removes that amplifier; it does NOT
  remove the root cause (context weight at return time), so the minimal-schema +
  light-context discipline above still stands. Re-validate whether the 244×-retry
  symptom still reproduces on ≥ 2.1.196 before relaxing anything.

This is why the `IMPLEMENT_RETURN schema` (§ above) is deliberately small — it is
the F2 mitigation, not an accident.

## Design Rationale (DA log — RTFM, with citations)

- **DA-substrate — Workflow tool** (not plain Agent `run_in_background`: no portable
  wait-for-N/structured collection; not agent teams: they partition files rather than
  collaborate, are not composable with workflows, experimental behind a flag —
  `agent-teams.md`, `features-overview.md`, `workflows.md`). The JS API is specified by
  the Workflow tool contract (see § Source of truth), not the public page.
- **DA-worktree-base (C1) — push + per-wave fetch, not `worktree.baseRef:"head"`.**
  Worktrees branch from `origin/HEAD` (`worktrees.md`); a sync fetch each wave makes
  local refs current so dependents see merged code. Criterion: reversibility +
  minimal-complexity.
- **DA-delivery — strategy C + synchronous bounded merge + `ep-check` at Close.**
  Criteria: minimal-complexity + reversibility + reuse. Integration branch (B)
  defers/concentrates conflicts and needs net-new machinery.
- **DA-optimistic-delivery (O1) — incremental per-task gate + repo-wide validation
  once per wave + revert-on-red.** The repo-wide `validate-all` is the wrong scope for
  a per-task gate: on the serial path it re-scans untouched files (N× per epic) and a
  sibling's finalize defect blocks unrelated deliveries (#57/#58). Move it off the
  per-task path: cheap attributable `validate-changed` pre-merge, merge, then one
  `validate-all` at the wave boundary that reverts the offending merge on red (clean
  because tasks are mostly file-disjoint) and keeps the worktree for fix-forward.
  Cross-wave safety is preserved by gating the boundary pass before the next C1 fetch.
  Criteria: minimal-complexity (reuses delivery's merge + revert; no integration
  branch) + reversibility (revert-on-red) + delivery-speed (serial-sum → per-wave-max).
- **DA-steering — no live steering.** `SendMessage` only exists with
  `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` and only resumes a stopped subagent /
  messages a teammate (`sub-agents.md`, `tools-reference`). Contract warnings injected
  pre-dispatch.
- **DA-notification — `PushNotification` + `preferredNotifChannel`, best-effort.**
  PushNotification is Anthropic-infra (not Bedrock/Vertex/Foundry). No `Notification`
  hook event (INFERRED — not RTFM-confirmed this round; non-blocking by design).
- **DA-scope — no cron/scheduling, no integration branch, no `claude agents` CLI
  monitoring.** Criterion: YAGNI.
</content>
