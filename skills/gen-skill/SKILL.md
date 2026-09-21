---
name: gen-skill
description: Use this skill to create or update one project skill per run from a brief human description, including taxonomy classification, SKILL.md authoring, resource scaffolding, documentation updates, and validation.

metadata:
  kind: workflow
---

# Gen Skill Workflow

This skill turns a short request into one production-ready skill for this boilerplate.

## When To Use
- Human asks to create a new skill from a brief description.
- Human asks to update an existing skill while preserving taxonomy and provider compatibility.
- A new skill must be added to inventory/workstream mapping documentation.

## Inputs To Read
1. `skills/gen-skill/references/interoperable-skills-model.md` (mandatory)
2. `AGENTS.md` (mandatory)
3. `docs/language-policy.md` (mandatory)
4. `memory-system/workstreams/aliases.conf` (mandatory)
5. Existing target skill folder (`skills/<name>/`) when updating
6. Canonical skill docs:
   - Agent-facing: `AGENTS.md`
   - Human-facing: `boilerplate-docs/README.md`
   - Human-facing: `boilerplate-docs/GUIA-COMPLETO-BOILERPLATE.md`
7. Additional docs only when required to fix direct broken references after rename/move

## Workflow
1. Parse the brief description into:
   - target outcomes
   - likely trigger phrases
   - expected side effects (if any)
2. Enforce one-skill scope:
   - if the brief mixes multiple skills, split candidates and proceed with exactly one skill per run
   - ask the human to confirm which skill to execute when ambiguity remains
3. Normalize the skill name (lowercase, hyphen-case, max 64 chars).
4. Classify taxonomy:
   - use `persona` for judgment-heavy expertise
   - use `workflow` for deterministic operational flow
5. Plan the minimum skill folder contents:
   - always `SKILL.md`
   - add `references/` only for deep, on-demand guidance
   - add `scripts/` only for deterministic repeated actions
   - add `assets/` only for output resources
6. Create or update `skills/<name>/SKILL.md` with valid frontmatter:
   - required: `name`, `description`, `metadata.kind`
   - `persona` must set `user-invocable: false`
   - do not use `disable-model-invocation` (it blocks slash command invocation in Claude Code)
7. Apply provider adapter rules:
   - `persona`: create/update `.claude/agents/<name>.md` thin adapter with `skills: [<name>]`
   - `workflow`: do not create `.claude/agents/<name>.md`
8. Add optional `skills/<name>/agents/openai.yaml` metadata when it improves skill discoverability.
9. Update only necessary docs and mappings in the same change:
   - `AGENTS.md` (agent-facing skill list/rules when impacted)
   - `boilerplate-docs/README.md` and `boilerplate-docs/GUIA-COMPLETO-BOILERPLATE.md` (human-facing inventory/examples when impacted)
   - workstream alias mapping (`aliases.conf`) or new workstream directory
   - avoid `README.md` root edits for skill inventory/detail unless explicitly requested by a human
10. Validate changes:
   - `./scripts/validate-skill-taxonomy.sh`
   - `./scripts/validate-links.sh`
   - `./scripts/validate-placeholders.sh`
   - `./scripts/validate-conventions.sh`
11. Report changed files and PASS/FAIL evidence.

## Mandatory Rules
- Keep AI-facing operational artifacts in English.
- Keep human/product-facing docs in the project language.
- Execute exactly one target skill per run.
- Do not create hybrid skills.
- Keep behavioral rules in `skills/<name>/SKILL.md` (no adapter duplication).
- Never add files under `.claude/commands/`.
- Keep edits minimal and scoped to the requested skill outcome.
- Do not spread detailed skill documentation outside canonical docs unless explicitly requested.

## Required Output
- New or updated files under `skills/<name>/`.
- Updated canonical skill docs/mappings only when impacted.
- Validation evidence with executed checks.

## Reference Files
- `references/skill-creation-checklist.md`
- `references/interoperable-skills-model.md`
