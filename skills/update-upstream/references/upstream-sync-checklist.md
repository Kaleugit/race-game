# Upstream Sync Checklist

Use this checklist when merging boilerplate upstream updates into a derived project.

## Preconditions
- `git remote -v` shows `origin` (derived project) and `upstream` (boilerplate).
- Working tree is clean before starting.
- Sync branch was created from latest `origin/main`.

## Delta Analysis
- Capture ahead/behind counts between `main` and `upstream/main`.
- Review upstream commit list before merging.
- Review changed file list and classify:
  - `auto-accept`: process/framework updates compatible with local repo
  - `manual-merge`: files with local modifications and upstream changes
  - `keep-local`: files that are intentionally project-specific
- **Check `docs/migration-notes/` in the upstream delta.** Each file there
  is a version-specific upgrade guide for a substantive boilerplate change
  (e.g. new directories, new hooks, new mandatory steps). Read every
  migration note newer than your last sync before merging — they often
  prescribe post-merge steps (`auto-accept` plus a regeneration command,
  manual edit, environment dependency, etc.).

## Conflict Resolution Priorities
0. **A covering migration note is authoritative.** When a `docs/migration-notes/*.md`
   in the delta prescribes a per-file policy, apply it directly — it is explicit
   upstream guidance and resolves the file without human input.
1. Keep local product truth in human-facing project docs.
2. Keep upstream governance automation/scripts when they do not break local flow.
3. Preserve task/memory integrity rules from local repository.
4. For files not covered by a note: decide with the CDT. Escalate to the human
   ONLY on a governance trigger (contradictory requirements, security/compliance
   risk, irreversible high-blast-radius action, external-dependency deadlock, or
   genuinely insufficient criteria) — not merely because two options both seem
   valid. Pick the reversible, conservative option and record it as a `DA-XXX`.

## Post-merge steps from migration notes
- Apply every step prescribed by the migration notes that came in the
  delta. Common patterns:
  - run a generator skill to refresh auto-derived artifacts from local
    sources (e.g. `/gen-governance-core` after touching `.governance/`)
  - install or check system dependencies declared by the note
  - restart the Claude Code session when new hooks were introduced
- If a migration note prescribes a regeneration, run it BEFORE the
  validation block below — generated artifacts must reflect the local
  project's sources, not the upstream snapshot that was merged in.

## Validation
- Run `./scripts/validate-all.sh`.
- Run project tests selected by task execution mode.
- Ensure no broken local markdown links after merge.

## Semantic Delivery Gate (Mandatory)
- Create a delivery validation note from:
  `memory-system/templates/delivery-validation-template.md`
- Ensure note Task ID/Branch matches the upstream sync task branch.
- Run delivery with explicit note:
  `./skills/delivery/scripts/deliver-to-main.sh --validation-note <path>`
- If semantic gate is `FAIL` or ambiguous, stop and escalate to human.

## Reporting
- Record upstream range integrated (`old..new`).
- Record manual conflict decisions (file + rationale).
- Record deferred follow-ups that were intentionally out of scope.
- Record delivery validation note path.
- Record delivery result (`PR`, CI status, merge mode).
