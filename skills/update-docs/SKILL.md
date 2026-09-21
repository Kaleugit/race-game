---
name: update-docs
description: Use this skill to semantically update existing project documentation from PROJECT_SPECS and BRIEFING with precise edits, never full-file overwrites.

metadata:
  kind: workflow
---

# Update Docs Skill

This skill updates documentation that can be reliably inferred from `docs/PROJECT_SPECS.md` and `BRIEFING.md`.
It is edit-first and non-destructive: update only the needed sections after semantic analysis.

## When To Use
- Human asks to align docs with current project intent.
- `PROJECT_SPECS` and `BRIEFING` contain information that is missing or stale in other docs.
- Bootstrap artifacts need safe refinement without template regeneration.

## Inputs To Read
1. `docs/PROJECT_SPECS.md` (mandatory)
2. `BRIEFING.md` (mandatory)
3. `docs/language-policy.md` (mandatory)
4. `README.md` (root, mandatory when bootstrap already generated project template)
5. Target docs requested by the human (mandatory)
6. Other impacted docs only when needed (`docs/**`, `memory-system/**`)

## Workflow
1. Extract facts from `PROJECT_SPECS` and `BRIEFING` into a fact list with confidence (`high`, `medium`, `low`).
2. Discard placeholder-like values (`[Item]`, `YYYY-MM-DD`, empty labels) as non-facts.
3. Build a doc impact map (`fact -> target file/section`) and choose only high-confidence updates.
4. Run a documentation footprint pass for requested scope:
   - suggest docs to keep now (`mandatory`, `high-value optional`)
   - suggest docs that can be removed/merged for small projects
5. Prioritize root `README.md` updates when it is a bootstrap-generated project template:
   - update summary, scope, and current state from high-confidence facts.
   - keep placeholders that still depend on human confirmation.
6. Apply minimal section-level edits; preserve surrounding content and history.
7. If a file is removed/renamed by explicit human approval, update references in remaining docs/memory files in the same change.
8. If a conflict or ambiguity appears, stop and ask the human before changing that section.
9. Report what changed, which facts were used, what was suggested for keep/remove, and what remains unresolved.

## Mandatory Rules
- Never overwrite an entire file.
- Never regenerate a document from scratch when it already exists.
- Never delete human decisions unless the human explicitly requests replacement.
- Never remove documentation files without explicit human approval.
- Prefer additive or surgical edits anchored to existing headings/sections.
- Keep language per file policy (`skills/**` in English, human docs in project language).
- When confidence is not high, ask instead of guessing.

## Required Output
- Edited files with concise rationale per file.
- Traceability: `source fact -> updated section`.
- Explicit list of deferred items that need human confirmation.

## Reference Files
- Confidence and edit guardrails: `references/deduction-confidence-rules.md`
