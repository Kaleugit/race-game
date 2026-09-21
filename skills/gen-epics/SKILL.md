---
name: gen-epics
description: Use this skill after bootstrap to propose, refine with a human, and finalize an ordered epic roadmap. Use when transforming PROJECT_SPECS/context into approved epics documented in docs/EPICOS.md and committing that document to main.

metadata:
  kind: workflow
---

# Gen Epics Skill

This skill creates a lightweight epic roadmap with autonomous intermediate
decisions and human approval of the final list.

## Additional Inputs To Read
Assume baseline context from `AGENTS.md` is already loaded.

1. `docs/PROJECT_SPECS.md` (mandatory)
2. `memory-system/1-project-context.md` (mandatory)
3. `memory-system/2-tasks.md` (mandatory, bootstrap gate awareness)
4. `docs/specs/*.md` (if present — domain specs contain boundaries critical for epic decomposition)
5. `docs/architecture.md` (if present)
6. `docs/decisions.md` (if present)
7. `memory-system/workstreams/architect/notes.md` (mandatory if exists)

## Workflow
1. Confirm bootstrap status in `memory-system/2-tasks.md`.
2. If bootstrap status is `PRE_BOOTSTRAP` or `INCOMPLETE`, explicitly warn about risk and continue only with human awareness.
3. If bootstrap status is `COMPLETE` or `READY_FOR_EXECUTION`, proceed normally.
4. Extract scope, requirements, constraints, and risks from project docs.
5. Propose an ordered epic sequence, each with:
   - title
   - objective (one sentence, no ambiguity)
   - scope boundaries (explicit in/out lists; no prose)
   - dependency notes (epic IDs or `None`)
   - completion signal (observable, machine-verifiable where possible)
   - escalation triggers (conditions under which the executing agent must stop and ask human/orchestrator)
6. Present the epic list to the human for final approval. Intermediate decisions (epic ordering, scope boundary placement, dependency structure) are resolved autonomously using `PROJECT_SPECS.md` Section 10 criteria. Document autonomous decisions in the "Decisoes Autonomas" section of the output artifact.
7. Create or update `docs/EPICOS.md` using the template in `references/epicos-template.md`.
8. Validate internal consistency:
   - no duplicated scope across epics
   - order/dependencies are coherent
   - epic IDs are stable and never reused (see "Epic ID Allocation Protocol")
   - `scripts/validate-epic-ids.sh` passes (it also runs in the pre-commit hook)
9. After human approval of `docs/EPICOS.md`, automatically update bootstrap gate in `memory-system/2-tasks.md` to `READY_FOR_EXECUTION`.
10. Commit approved epic documentation directly to `main`, replacing each reservation stub with its approved entry.

## Epic ID Allocation Protocol (multi-developer)

More than one person (and more than one agent) registers epics in this repository.
Epic IDs are allocated by reading `docs/EPICOS.md`, so two people who branch in
parallel take the same "next free" number and the collision only surfaces as a
text conflict at merge — where it can be resolved silently and partially. That
already happened: EP-027 was registered twice (Kaleu's `6f1dbed27` on a branch and
Leonardo's `c07fe95e1` on main) and a merge bot renumbered one of them to EP-028
without updating 35 filenames and ~100 files of content. Recorded as
INC-2026-08-17 in `docs/decisions.md` ADR-015.

Rules, in order:

1. **Reserve on `main` before branching.** Commit the `### EP-NNN - <title>` entry
   directly to `main` and push it, THEN create the working branch. The entry on
   `main` is what makes the number yours. The minimum that satisfies this is a
   reservation stub — heading plus the two fields that carry meaning, and no field
   the canonical template does not define:

   ```markdown
   ### EP-0NN - RESERVADO (em elaboração)
   - Status: PLANNED
   - Objective: número reservado em YYYY-MM-DD para <tema>; conteúdo completo chega pelo PR da branch <branch>.
   ```

   `Status` is `PLANNED` because that is the only value for a not-yet-started epic
   in the enum at `references/epicos-template.md`. Do NOT invent a `RESERVED`
   status, and do NOT add `Reserved By`/`Reserved At`: the commit author and date
   already are that record. The stub is replaced by the full entry at workflow
   step 10, and `git log` keeps the audit trail.
2. **Never pick a number from a branch.** Always read `docs/EPICOS.md` at
   `origin/main` — `git fetch origin && git show origin/main:docs/EPICOS.md` — not
   the local working copy, which may be stale or already carry someone else's
   unpushed reservation.
3. **Ask the human about still-local epics, and wait for the answer.**
   `origin/main` cannot show an epic another dev is authoring locally and has not
   pushed — git has no visibility into it at all. Before allocating, ask: *"Does
   any other dev have an epic being created that is still local (not yet pushed to
   `main`)?"* Do not proceed on silence. If the answer is yes, STOP: they push
   their reservation stub first, then re-read `origin/main` and allocate after it.
   This is the residual net for what rules 1-2 cannot see, never a substitute for
   them.
4. **First to land on `main` keeps the number.** If your reservation push is
   rejected because someone else took the ID, take the next free one before doing
   any other work. Do not negotiate at merge time.
5. **Never renumber silently while resolving a conflict.** A renumber is a repo-wide
   rename: `docs/EPICOS.md`, `docs/EPICO-EP-NNN-*-TASKS.md`, `docs/reviews/EPIC-EP-NNN-*`,
   `memory-system/{tasks,task-docs,session-log.d,workstreams/*/notes.d}/*`,
   `tests/unit/epNNN-*` and every in-code doc comment.
   **Renaming files is not enough: the renumber must propagate to every internal
   VALUE too** — task file IDs and their `Status`, the `Branch:` fields, the epic's
   `TASKS.md`, and any commit-message convention already in use. INC-2026-08-17
   renamed at the file level and left the internal values pointing at the old
   number, which is why the registry stopped describing reality. If a conflict
   requires a renumber, say so explicitly to the human and do the full rename in
   one commit. Prefer reserving correctly (rules 1-3) so renumbering never becomes
   necessary.
6. **IDs are never reused.** A burned ID (allocated then abandoned) stays burned;
   record why in "Decisoes Autonomas" and skip it. `EP-016` is such a gap (DA-035).
7. `scripts/validate-epic-ids.sh` enforces 1-6 mechanically at commit time. It FAILS
   on duplicate IDs, malformed headings, more than one `## Decisoes Autonomas`
   section, and any `EP-NNN` appearing in a tracked filename without a matching
   entry in `docs/EPICOS.md`.

Note on DA IDs: `DA-NNN` numbers are **epic-scoped**, not globally unique — 61 of
them are currently defined in more than one epic document. Always cite a DA together
with its epic (`DA-308 (EP-026)`), never bare. The validator warns on this but does
not fail.

## AI Agent Execution Principles
Epics will be decomposed into tasks executed by AI agents. Design them accordingly:

- **One domain per epic**: do not mix bounded contexts in a single epic. If an epic spans multiple domains, split it. Cross-domain coordination belongs in dependency notes, not in scope.
- **Precision over completude**: use structured fields (lists, enums). Prose descriptions generate ambiguity that agents cannot resolve without escalation. An undefined scope item (`TBD`) is better than a vague sentence.
- **Observable completion signals**: prefer signals that an agent can verify programmatically (e.g., "all endpoints in `docs/api-contracts.md` have corresponding handlers", "test suite passes with 0 failures"). Avoid subjective signals (e.g., "works well", "is complete").
- **Explicit escalation triggers**: each epic should declare conditions under which the executing agent must stop and escalate (e.g., "if schema migration affects >2 tables, escalate to architect", "if external API contract is ambiguous, escalate to human").
- **Minimal context**: an epic description should be self-contained. The agent should need only the epic entry + `PROJECT_SPECS.md` to understand scope. Do not require reading the full `EPICOS.md` to understand one epic. If more files are needed then escalate.

## Autonomy Policy
- Resolve epic structuring decisions autonomously using `PROJECT_SPECS.md` Section 10 criteria.
- Organize epics to optimize AI agent execution success (one domain per epic, clear boundaries, minimal cross-domain coordination).
- Escalate to human only for Mandatory Escalation Conditions (`AGENTS.md`).
- Document all autonomous decisions in the "Decisoes Autonomas" section of `EPICOS.md`.
- Final epic list approval by human remains mandatory.

## Mandatory Rules
- Keep a single canonical epic file: `docs/EPICOS.md`.
- Do not create filename versions (for example, `EPICOS-v2.md`).
- Use Git history for versioning decisions.
- Keep completed epics immutable in scope; only append clarifications when needed.
- Write `docs/EPICOS.md` in the project language (PT-BR by default).
- Do not use scripts for this workflow.
- If branch protection blocks direct `main` commit, stop and ask the human.
- Do not set bootstrap to `READY_FOR_EXECUTION` without explicit human approval of `docs/EPICOS.md`.

## Required Output
- Updated `docs/EPICOS.md` with approved epics and detailed descriptions.
- Updated bootstrap gate (`memory-system/2-tasks.md`) to `READY_FOR_EXECUTION` after epic approval.
- A commit on `main` containing the approved epic documentation.

## Reference Files
- Epic document template: `references/epicos-template.md`
- Epic quality checklist: `references/epic-quality-checklist.md`
