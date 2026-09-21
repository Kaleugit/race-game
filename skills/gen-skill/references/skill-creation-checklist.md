# Skill Creation Checklist

Use this checklist when creating or updating a skill from a brief request.

## 1. Scope and Trigger
- [ ] Brief description is clear enough to derive the target workflow/persona.
- [ ] Skill name is normalized (`lowercase-hyphen-case`, <= 64 chars).
- [ ] Trigger context is explicit in `description` frontmatter.

## 2. Taxonomy and Structure
- [ ] `metadata.kind` is set to `persona` or `workflow`.
- [ ] `workflow` does not include `disable-model-invocation` (deprecated).
- [ ] `persona` includes `user-invocable: false`.
- [ ] Folder uses canonical structure (`SKILL.md`, optional `references/`, `scripts/`, `assets/`).

## 3. Provider Compatibility
- [ ] `persona` has thin adapter at `.claude/agents/<name>.md` with `skills: [<name>]`.
- [ ] `workflow` does not have `.claude/agents/<name>.md`.
- [ ] No files exist under `.claude/commands/`.

## 4. Documentation and Memory Mapping
- [ ] Skill appears in canonical docs only when applicable:
  - `AGENTS.md` (agent-facing)
  - `boilerplate-docs/README.md` (human-facing)
  - `boilerplate-docs/GUIA-COMPLETO-BOILERPLATE.md` (human-facing)
- [ ] Workstream mapping is defined (default directory or alias in `aliases.conf`).
- [ ] Root `README.md` is not updated for skill inventory/detail unless explicitly requested.
- [ ] Cross-doc references are updated only when files are added/renamed.

## 5. Validation
- [ ] `./scripts/validate-skill-taxonomy.sh` passes.
- [ ] `./scripts/validate-links.sh` passes.
- [ ] `./scripts/validate-placeholders.sh` passes.
- [ ] `./scripts/validate-conventions.sh` passes.
