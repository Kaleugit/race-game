# Interoperable Skills Model

This document defines the skill architecture for multi-AI interoperability.
It is the authoritative reference for how skills are structured, discovered,
and consumed by different AI agent providers (Claude Code, Codex, and any
agentskills.io-compatible tool).

## Design Principles

1. **Single canonical source**: `skills/<name>/SKILL.md` is the only place
   where behavioral rules live. No duplication in provider adapters.
2. **agentskills.io compliance**: all SKILL.md files follow the open standard
   at https://agentskills.io/specification.
3. **Provider extensions via frontmatter**: Claude Code and Codex extensions
   are added as extra frontmatter fields. Non-supporting tools ignore them.
4. **Direction 2 for persona consumption**: persona skills are consumed
   by provider-specific subagents that preload the skill as knowledge.
   Skills never declare `context: fork` or `agent` in frontmatter.
   Workflow skills may instruct the executing agent to delegate judgment
   to persona skills — this is orchestration, not Direction 1 spawning.
5. **No adapter duplication**: provider adapters (e.g. `.claude/agents/`)
   are thin delegation files. They contain zero behavioral rules.

## Skill Taxonomy

Every skill declares its kind in `metadata.kind`:

| Kind       | Purpose                                      | Invocation model             |
|------------|----------------------------------------------|------------------------------|
| `persona`  | Judgment-oriented: analysis, design, review  | Via provider subagent        |
| `workflow`  | Execution-oriented: repeatable steps, delivery | Directly as user command    |

Rules:
- Do not create hybrid skills. Split into two and orchestrate if needed.
- `persona` skills provide expertise; they do not define execution steps.
- `workflow` skills define step-by-step flows; they do not make design judgment.
- `workflow` skills may delegate judgment to `persona` skills during execution.
  The workflow defines when and why to delegate; the persona provides the expertise.

## Canonical Skill Structure

```
skills/<name>/
├── SKILL.md              # Required. Entry point and instructions.
├── references/           # Optional. Detailed docs loaded on demand.
├── scripts/              # Optional. Executable automation.
└── assets/               # Optional. Templates, schemas, static resources.
```

### SKILL.md Format

Every SKILL.md must have YAML frontmatter followed by Markdown content.

#### Required fields (agentskills.io standard)

| Field         | Constraint                                                    |
|---------------|---------------------------------------------------------------|
| `name`        | 1-64 chars, lowercase alphanumeric + hyphens, matches directory name |
| `description` | 1-1024 chars, describes what the skill does and when to use it |

#### Recommended fields

| Field      | Purpose                                         |
|------------|-------------------------------------------------|
| `metadata` | Arbitrary key-value map. Must include `kind`.    |

#### Provider extension fields (optional)

These are Claude Code extensions. Other tools ignore them silently.

| Field                      | Used by      | Purpose                                          |
|----------------------------|-------------|--------------------------------------------------|
| `user-invocable`           | Claude Code | `false` hides from `/` menu. Use for personas.   |
| `disable-model-invocation` | Claude Code | **Deprecated.** Blocks both auto-activation and slash command invocation. Do not use. |
| `allowed-tools`            | Claude Code, agentskills.io (experimental) | Space-delimited tool allowlist. |

#### Non-standard fields that MUST NOT appear

| Field    | Reason                                          | Migration                |
|----------|------------------------------------------------|--------------------------|
| `kind`   | Not in agentskills.io spec                     | Move to `metadata.kind`  |
| `context`| Direction 1 pattern (skill spawns subagent)    | Remove. Use subagent instead. |
| `agent`  | Direction 1 pattern                            | Remove. Use subagent instead. |
| `model`  | Model selection belongs to the subagent        | Remove from skill. Set in subagent adapter. |

### Persona Skill Template

```yaml
---
name: <skill-name>
description: >
  Use this skill when you need to <capability description>.
user-invocable: false
metadata:
  kind: persona
---

# <Skill Name> Skill

<Behavioral instructions, workflow, quality bar, reference links.>
```

Key points:
- `user-invocable: false` because users interact via the provider subagent,
  not by typing `/<skill-name>`.
- No `disable-model-invocation`. Claude may preload this skill into a
  subagent context autonomously when it recognizes the need.

### Workflow Skill Template

```yaml
---
name: <skill-name>
description: >
  Use this skill to <action description>.
metadata:
  kind: workflow
---

# <Skill Name> Skill

<Step-by-step workflow, inputs, outputs, scripts, validation rules.>
```

Key points:
- No `disable-model-invocation` (deprecated — it blocks slash command invocation).
- No `user-invocable` restriction. The skill appears in the `/` menu.

## Provider Discovery

Skills live in `skills/` at repository root. Providers discover them
via symlinks:

```
.claude/skills -> ../skills       # Claude Code discovery
.agents/skills -> ../skills       # Codex discovery
```

Both symlinks point to the same canonical directory. This guarantees
all providers see identical skill definitions.

### What each provider sees

| Provider    | Discovery path          | Reads                        |
|-------------|------------------------|------------------------------|
| Claude Code | `.claude/skills/*/SKILL.md` | Standard + Claude extensions |
| Codex       | `.agents/skills/*/SKILL.md` | Standard fields only          |
| Other       | Depends on tool config  | Standard fields only          |

## Provider Adapters

### Claude Code

Claude Code uses two mechanisms:

**For workflow skills**: no adapter needed. The symlink at `.claude/skills`
makes them available as `/skill-name` commands automatically.

**For persona skills**: a thin subagent file in `.claude/agents/<name>.md`
that preloads the canonical skill.

#### Subagent adapter format

```yaml
---
name: <skill-name>
description: <Role description for Claude's delegation decisions.>
model: inherit
skills:
  - <skill-name>
---

Use the preloaded `<skill-name>` skill as the canonical source of behavior.
<One-line role summary.>
```

Rules for subagent adapters:
- The `skills` field preloads the full SKILL.md content into the subagent context.
- The Markdown body must be minimal (1-3 lines). All behavioral rules live in SKILL.md.
- `model: inherit` unless there is an explicit reason to override.
- If the adapter and SKILL.md conflict, SKILL.md wins.
- Optional fields: `tools`, `permissionMode`, `hooks`, `memory`, `maxTurns`.

#### What Claude Code does NOT need

- **`.claude/commands/`**: eliminated. Skills replace slash commands entirely.
  The `.claude/skills` symlink handles discovery.

### Codex

Codex reads `skills/*/SKILL.md` directly via the `.agents/skills` symlink.
No additional adapter is needed for basic skill consumption.

Optional Codex-specific configuration can be placed in:
```
skills/<name>/agents/openai.yaml
```

This file is Codex-specific and ignored by other providers.

### Other agentskills.io tools

Any tool following the agentskills.io standard can consume skills from
`skills/*/SKILL.md`. Provider-specific frontmatter extensions are ignored.

## Validation

The `scripts/validate-skill-taxonomy.sh` script must enforce:

1. Every `skills/*/SKILL.md` has valid `name` and `description` in frontmatter.
2. `name` matches the parent directory name.
3. `metadata.kind` is `persona` or `workflow`.
4. Persona skills have `user-invocable: false` in frontmatter.
5. Persona skills have a matching `.claude/agents/<name>.md` subagent adapter.
6. Subagent adapters have `skills: [<name>]` in frontmatter.
7. Workflow skills do NOT have a subagent adapter.
8. No files exist in `.claude/commands/` (deprecated).
9. Symlinks `.claude/skills` and `.agents/skills` exist and point to `../skills`.
10. No SKILL.md uses forbidden fields: `kind` (top-level), `context`, `agent`.
11. Workflow skills do not use `disable-model-invocation` (deprecated).

## Migration Checklist

For existing boilerplate projects:

- [ ] Move `kind` from top-level frontmatter to `metadata.kind` in every SKILL.md.
- [ ] Remove top-level `kind` field from every SKILL.md.
- [ ] Add `user-invocable: false` to every persona SKILL.md.
- [ ] Remove `disable-model-invocation` from every workflow SKILL.md (deprecated).
- [ ] Remove `context` and `agent` fields if present in any SKILL.md.
- [ ] Remove `model` field from SKILL.md (set it in subagent adapter instead).
- [ ] Delete all files in `.claude/commands/`.
- [ ] Verify `.claude/skills -> ../skills` symlink exists.
- [ ] Create `.agents/skills -> ../skills` symlink.
- [ ] Verify `.claude/agents/*.md` files use `skills: [<name>]` preloading.
- [ ] Slim down subagent adapter Markdown bodies to 1-3 lines.
- [ ] Update `validate-skill-taxonomy.sh` to match new rules.
- [ ] Update `AGENTS.md` Skill Taxonomy section to reference this document.
- [ ] Update `CLAUDE.md` to remove references to `.claude/commands/`.

## Boilerplate Skills Inventory

### Persona Skills

| Skill       | Subagent adapter              | Purpose                                    |
|-------------|-------------------------------|--------------------------------------------|
| `architect` | `.claude/agents/architect.md` | System design, boundaries, ADRs            |
| `backend`   | `.claude/agents/backend.md`   | APIs, business logic, data access          |
| `frontend`  | `.claude/agents/frontend.md`  | UI architecture, accessibility, state      |
| `testing`   | `.claude/agents/testing.md`   | Test strategy, acceptance criteria         |
| `security`  | `.claude/agents/security.md`  | Threat modeling, hardening, compliance     |
| `devops`    | `.claude/agents/devops.md`    | CI/CD, deployment, observability           |
| `review`    | `.claude/agents/review.md`    | Technical review and regression risk ranking |

### Workflow Skills

| Skill            | Invocation          | Purpose                                   |
|------------------|---------------------|-------------------------------------------|
| `bootstrap`      | `/bootstrap`        | Initialize project from BRIEFING.md       |
| `delivery`       | `/delivery`         | Semantic validation + PR to main          |
| `release`        | `/release`          | Run versioning, changelog, tag, smoke checks, and rollback gate |
| `housekeeping`   | `/housekeeping`     | Safe repository cleanup                   |
| `implement`      | `/implement`        | Orchestrate end-to-end task implementation |
| `gen-epics`      | `/gen-epics`        | Transform specs into epic roadmap         |
| `gen-skill`     | `/gen-skill`       | Create or update one skill per run from a brief description |
| `gen-tasks`      | `/gen-tasks`        | Break epic into task list                 |
| `gohorse`        | `/gohorse`          | Default epic autopilot (Workflow parallel + claim-on-first-touch) |
| `gohorse-light`  | `/gohorse-light`    | Sequential, dependency-free fallback for `gohorse` |
| `xgh`            | `/xgh`              | Full MVP autopilot from BRIEFING.md       |
| `parallel`       | `/parallel`         | Parallel epic execution via tmux workers  |
| `solve-issues`   | `/solve-issues`     | Analyze issues/PRs and orchestrate fixes  |
| `update-docs`    | `/update-docs`      | Semantic documentation updates            |
| `update-upstream`| `/update-upstream`  | Sync with boilerplate upstream            |
| `gen-executive-summary` | `/gen-executive-summary` | Creates executive evaluation document from canonical project docs |
| `review-spec`    | `/review-spec`      | Exhaustive review of one spec document via parallel subagents |
| `review-all`     | `/review-all`       | Sequential review of all specs in dependency order |
| `smoke-claude-tmux` | `/smoke-claude-tmux` | Smoke-test Claude Code in tmux session |

## Skill-to-Workstream Mapping

Skills produce operational memory (notes, decisions, context) that is stored
in workstreams. The mapping between skills and workstreams is many-to-one:
multiple skills can share the same workstream when their knowledge domain
overlaps.

### Default rule

Every skill maps to a workstream directory with the same name:

```
skills/<name>/  →  memory-system/workstreams/<name>/
```

### Aliases

When a skill's operational memory belongs to an existing workstream,
declare an alias in `memory-system/workstreams/aliases.conf`:

```conf
# Format: skill=workstream
bootstrap=architect
delivery=devops
release=devops
gen-executive-summary=architect
gen-epics=architect
gen-tasks=architect
gen-skill=architect
gohorse=development
implement=development
solve-issues=development
xgh=development
parallel=development
update-docs=architect
update-upstream=devops
review-spec=architect
review-all=architect
smoke-claude-tmux=devops
```

Aliases avoid creating empty workstream directories. The aliased skill
writes its notes to the target workstream.

### Boilerplate workstream map

| Workstream     | Own skills (persona)          | Aliased skills (workflow)                      |
|----------------|-------------------------------|------------------------------------------------|
| `architect`    | `architect`                   | `bootstrap`, `gen-epics`, `gen-executive-summary`, `gen-skill`, `gen-tasks`, `update-docs`, `review-spec`, `review-all` |
| `backend`      | `backend`                     | —                                              |
| `frontend`     | `frontend`                    | —                                              |
| `testing`      | `testing`                     | —                                              |
| `security`     | `security`                    | —                                              |
| `devops`       | `devops`                      | `delivery`, `release`, `update-upstream`, `smoke-claude-tmux` |
| `development`  | —                             | `implement`, `gohorse`, `xgh`, `parallel`, `solve-issues` |
| `review`       | `review`                      | —                                              |
| `housekeeping` | —                             | `housekeeping` (own workstream, no alias)      |

### Workstream directory structure

```
memory-system/workstreams/<workstream>/
├── notes.md          # Consolidated notes (auto-generated from fragments)
├── notes.d/          # Append-only fragments per task/worktree
│   └── <fragment>.md
└── history.md        # Optional. Long-term evolution log.
```

Rules:
- `notes.d/*.md` are append-only. Never edit existing fragments.
- `notes.md` is auto-reconciled from `notes.d/` fragments by CI.
- Files are optional. Create only when they provide memory value.
- Fragment naming should include task ID or date for traceability.

### Adding custom skills

When creating a new skill, choose one of:
1. **Reuse** an existing workstream via alias in `aliases.conf`.
2. **Create** a new workstream directory at `memory-system/workstreams/<name>/`.

Workstream validation in CI is syntactic (presence/format).
Semantic validation of workstream content is human/architect responsibility.

### Workstream independence from taxonomy

Workstream mapping is independent from skill taxonomy (`metadata.kind`).
Both persona and workflow skills follow the same default/alias mapping rules.
A persona skill and its aliased workflow skills share the same workstream
memory, enabling knowledge continuity across judgment and execution phases.

## Interaction Between Skills

Skills may reference other skills during execution:
- `bootstrap` calls `delivery` for final commit to main.
- `delivery` may call `housekeeping` for post-delivery cleanup.
- Workflow skills may invoke persona subagents for judgment (e.g. `delivery`
  may delegate architecture review to the `architect` subagent).
- `implement` orchestrates task execution by delegating analysis to
  `architect`, `testing`, and `security` persona skills at defined phases.

This is orchestration, not dependency. Each skill remains self-contained
and can be invoked independently.

Orchestration pattern: a workflow skill may instruct the executing agent to
delegate to persona skills for judgment. The delegation mechanism is
provider-specific (Claude Code uses subagent adapters; Codex applies the
persona SKILL.md as inline context). The workflow SKILL.md must describe
WHAT to delegate and WHEN, not HOW the provider dispatches it.

## Progressive Disclosure

Following agentskills.io recommendations:

1. **Discovery** (~100 tokens): `name` + `description` loaded at startup for all skills.
2. **Activation** (<5000 tokens recommended): full SKILL.md body loaded when skill is invoked.
3. **Deep reference** (on demand): files in `references/`, `scripts/`, `assets/` loaded only when needed.

Keep SKILL.md under 500 lines. Move detailed content to `references/`.
