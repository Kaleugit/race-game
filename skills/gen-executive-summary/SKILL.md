---
name: gen-executive-summary
description: Use this skill to create or update docs/RESUMO-EXECUTIVO.md as a human-facing executive evaluation document derived from PROJECT_SPECS, EPICOS, and supporting architecture docs. Use when epics are proposed or approved and stakeholders need a concise macro view of scope, roadmap, milestones, risks, and go/no-go conditions.

metadata:
  kind: workflow
---

# Gen Executive Summary Skill

This skill creates or refreshes a human-facing executive summary for project evaluation.
It is a derived document: canonical sources remain `docs/PROJECT_SPECS.md`,
`docs/EPICOS.md`, and supporting technical docs.

## When To Use
- Human asks for an executive summary to evaluate the project after epic proposal.
- `docs/EPICOS.md` exists and stakeholders need a macro roadmap with milestones and risks.
- Scope or epic sequencing changed and `docs/RESUMO-EXECUTIVO.md` became stale.

## Additional Inputs To Read
Assume baseline context from `AGENTS.md` is already loaded.

1. `docs/PROJECT_SPECS.md` (mandatory)
2. `docs/EPICOS.md` (mandatory)
3. `memory-system/1-project-context.md` (mandatory)
4. `memory-system/2-tasks.md` (mandatory for bootstrap/approval status)
5. `docs/architecture.md` (if present)
6. `docs/api-contracts.md` (if present)
7. `docs/decisions.md` (if present)
8. `docs/language-policy.md` (mandatory)
9. `memory-system/workstreams/architect/notes.md` (mandatory if exists)

## Workflow
1. Confirm `docs/EPICOS.md` exists. If not, stop and ask the human to run
   `gen-epics` first.
2. Extract high-confidence facts only from canonical sources; ignore placeholders
   and speculative details.
3. Reuse exact epic IDs, titles, dependency notes, and order from
   `docs/EPICOS.md`.
4. Create or update `docs/RESUMO-EXECUTIVO.md` using
   `references/executive-summary-template.md`.
5. Derive the macro roadmap, milestones, and delivery signals from epic-level
   information without decomposing work into task-level detail.
6. If a needed fact is missing, record it under executive pending decisions or
   attention points instead of inventing it.
7. Set summary status conservatively:
   - `EM_REVISAO` by default
   - `APROVADO` only after explicit human approval
   - `SUPERSEDIDO` when a newer approved summary replaces the previous one
8. Keep the document concise and decision-oriented for humans:
   - 1-3 pages when possible
   - macro chronology only
   - no task-level implementation detail
9. After human approval, commit the docs-only change directly to `main` when
   allowed by policy.

## Mandatory Rules
- Treat `docs/RESUMO-EXECUTIVO.md` as a derived human-facing summary, not a
  source of truth.
- On conflict, prefer `docs/PROJECT_SPECS.md`, `docs/EPICOS.md`,
  `docs/architecture.md`, `docs/api-contracts.md`, and `docs/decisions.md`.
- Never invent exact dates, budgets, or commitments that are not explicitly
  supported by source docs or the human.
- Keep epic order and IDs stable; do not rename or renumber epics in the
  summary.
- Do not update bootstrap gate status in this skill.
- Write the summary in the project language (PT-BR by default).
- Use docs-only delivery rules if committing directly to `main`.
- Do not create filename variants like `RESUMO-EXECUTIVO-v2.md`.

## Required Output
- `docs/RESUMO-EXECUTIVO.md` created or updated.
- Explicit note of source docs used and unresolved executive decisions.
- A docs-only commit on `main` after human approval, when requested and
  allowed.

## Reference Files
- `references/executive-summary-template.md`
- `references/executive-summary-checklist.md`
