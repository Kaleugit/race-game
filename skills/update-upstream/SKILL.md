---
name: update-upstream
description: Use this workflow skill when a derived project needs to pull and reconcile updates from the boilerplate upstream repository while preserving project-specific decisions and safely resolving conflicts.

metadata:
  kind: workflow
---

# Update Upstream Skill

This skill standardizes how a derived project updates from the boilerplate upstream.
It is safety-first: inspect deltas, merge intentionally, preserve local project semantics.

**Resolution is autonomous, not interrogative.** A `docs/migration-notes/*.md`
that covers an incoming change is **authoritative upstream guidance** — it ranks
as `explicit human guidance` at the top of the decision precedence. When a note
covers a file (its per-file policy table says `auto-accept` / `manual-merge` /
`keep-local`), apply that policy **without asking**. Resolve the rest with the
sync checklist and the CDT. Escalate to the human **only** on the governance
triggers (contradictory requirements, security/compliance risk, irreversible
high-blast-radius action, external-dependency deadlock, or genuinely insufficient
criteria). Record every autonomous resolution as a `DA-XXX` in the task artifact.
Do **not** pause to ask merely because a merge has conflicts — conflicts are the
normal case and the notes/checklist/CDT are how you resolve them.

## When To Use
- A derived project wants the latest governance/skills/scripts updates from upstream boilerplate.
- The repository has an `upstream` remote pointing to the boilerplate source.
- Human requests periodic sync with upstream improvements.

## Inputs To Read
1. `AGENTS.md`
2. `docs/PROJECT_SPECS.md`
3. `memory-system/1-project-context.md`
4. `memory-system/2-tasks.md`
5. `memory-system/tasks/` (active task file)
6. `references/upstream-sync-checklist.md`
7. `skills/delivery/SKILL.md`
8. `memory-system/templates/delivery-validation-template.md`

## Workflow
1. Validate prerequisites:
   - clean working tree
   - correct remotes (`origin` project repo, `upstream` boilerplate repo)
   - target branch (`main`) up-to-date with `origin/main`
2. Preview upstream delta and build the resolution plan:
   - run `./skills/update-upstream/scripts/preview-upstream-delta.sh`
   - **read every `docs/migration-notes/*.md` newer than the last sync FIRST** —
     each note's per-file policy table is the authoritative classification for
     the files it covers
   - classify every changed file as `auto-accept`, `manual-merge`, or
     `keep-local`: from the covering note when one exists, otherwise from the
     checklist rules + CDT. Files not covered by any note and not decidable by
     the checklist/CDT are the only candidates for human escalation
3. Create a task branch for the sync (for example `TASK-<github-login>-<task-key>-devops`).
4. Apply upstream changes intentionally:
   - merge flow: `git merge --no-ff --no-commit upstream/main` (preserves the
     merge-base so future syncs stay clean — do not cherry-pick by default)
   - resolve conflicts file-by-file **autonomously** from the resolution plan
     built in step 2 (covering note → checklist → CDT). Apply each file's policy
     directly; do not stop to ask when the plan already decides it
5. Preserve project-specific artifacts and decisions:
   - keep local product semantics in project docs
   - adopt upstream governance/process improvements when compatible
6. Finalize merge commit with clear scope.
7. Apply every post-merge step prescribed by the migration notes that came
   in the delta (regenerations, dependency installs, restarts).
   - ALWAYS re-assure inherited telemetry is active and verified, regardless of
     whether a telemetry note was in this delta (DA-zero-toil — this run must
     leave the environment COMPLETELY configured, not depend on operator memory):
     run `./skills/telemetry/scripts/install-hooks.sh` (idempotent, self-healing,
     non-destructive — re-wires the usage tap + governance hooks + the
     SessionStart guard, re-capturing the operator's status line as a delegate)
     and verify with `bash skills/telemetry/scripts/smoke.sh` (ALL PASS). The new
     statusLine loads on the next session.
   - ALWAYS clean up OLD-design telemetry leftovers the derived project may still
     carry in its working tree (untracked `memory-system/telemetry/events.d/*` and
     `memory-system/telemetry/tel-stash-*`): run
     `./skills/telemetry/scripts/migrate-legacy-events.sh`. It is idempotent (no-op
     on a clean repo) and resolves each leftover the same way we do by hand:
     migrate sessions missing from the orphan `telemetry` ref into
     `governance/<session>.ndjson` (it skips sessions already present so lines are
     never duplicated, since append-to-orphan does not dedup), removing each
     fragment only once its session is CONFIRMED in the orphan ref. Fragments whose
     migration cannot be confirmed are KEPT and retried on the next sync (never
     blind-deleted, so no telemetry is lost to a transient git failure). Migrated
     fragments are NEVER committed by design, so removing them is the correct end
     state. Report its summary line.
8. Run governance checks: `./scripts/validate-all.sh`.
9. Run project tests required by task mode/risk.
10. Update task/memory artifacts and report:
    - what came from upstream
    - what was kept local
    - migration notes that were applied (path + step summary)
    - unresolved follow-ups
11. Create delivery semantic validation note from template:
    - `memory-system/templates/delivery-validation-template.md`
    - save under `memory-system/task-docs/` with matching task ID/branch
12. Deliver through normal flow (`skills/delivery/`):
    - run `./skills/delivery/scripts/deliver-to-main.sh --validation-note <path>`
13. Confirm delivery outcome (`PR created/updated`, CI state, merge mode).

## Mandatory Rules
- Never force-push to `upstream`.
- Never rewrite upstream history.
- Never do blanket conflict resolution (`-X ours` / `-X theirs`) for the whole merge.
- Preserve project-specific product decisions: files classified `keep-local`
  (by a covering migration note, or by checklist/CDT as your product truth) are
  kept WITHOUT asking — the classification already protects them. Asking is not
  required to preserve them.
- Resolve conflicts autonomously via the resolution plan (covering note →
  checklist → CDT). Escalate to the human ONLY on the governance triggers
  (contradictory requirements, security/compliance risk, irreversible
  high-blast-radius action, external-dependency deadlock, genuinely insufficient
  criteria) — not merely because a merge has conflicts. Document each autonomous
  resolution as `DA-XXX` in the task artifact.
- Never mark upstream sync task as completed without semantic validation via `skills/delivery/`.
- Delivery validation note is mandatory before running delivery script.
- If delivery semantic gate is `FAIL` or ambiguous, stop and escalate to human.

## Required Output
- Upstream update summary with:
  - upstream commit range integrated
  - files accepted directly
  - files manually merged
  - files intentionally kept local
- Evidence of validation/tests executed.
- Delivery validation note path in `memory-system/task-docs/`.
- Delivery result evidence (`PR number/link`, CI state, merge status).

## Reference Files
- Sync checklist and conflict policy: `references/upstream-sync-checklist.md`
