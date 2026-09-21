---
version: 3.1
inherits: AGENTS.md
provider: claude
---

# CLAUDE.md

Single source of rules and workflow: `AGENTS.md`.

## Claude-Specific Overrides
1. Read `AGENTS.md` before starting any task.
2. Use `CLAUDE.md` only for provider differences; do not duplicate core rules.
3. If this file conflicts with `AGENTS.md`, `AGENTS.md` takes precedence.
4. Honor skill taxonomy declared in `skills/*/SKILL.md` (see `skills/gen-skill/references/interoperable-skills-model.md`):
   - `metadata.kind: persona` -> use `.claude/agents/<skill>.md` subagent adapter.
   - `metadata.kind: workflow` -> no adapter needed. `.claude/skills` symlink handles discovery.
   - `.claude/commands/` is deprecated and must not contain files.
5. `.claude/agents/*.md` are thin provider adapters for persona skills only.
   - Keep them minimal (1-3 lines of markdown body).
   - Do not duplicate behavioral rules from `skills/*/SKILL.md`.
   - Use valid YAML frontmatter with `skills: [<skill>]` preloading.
   - If adapter and skill conflict, `skills/*/SKILL.md` is the source of truth.

## References
- Core multi-AI workflow: `AGENTS.md`
- Integrity: `INTEGRITY-RULES.md`
- Orchestration: `skills/implement/SKILL.md`
