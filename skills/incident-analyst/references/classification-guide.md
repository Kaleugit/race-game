# Classification Guide

Use this guide to pick exactly one of the four categories for an
incident. Boundaries between categories are the hardest part of the
analysis; the examples below resolve the common cases.

## Decision tree

```
Was an existing rule in .governance/CORE.md directly violated?
├── YES → governance-drift
│         (no source-doc change needed; reinforcement only)
└── NO → Would a new rule have prevented this incident?
        ├── NO → not an incident; close as "no governance action"
        └── YES → Is the missing rule project-specific or generic?
                  ├── PROJECT  → governance-gap
                  ├── GENERIC  → boilerplate-level
                  └── PERSONAL → personal-preference
```

## Category definitions and examples

### 1. `governance-drift`

The agent broke a rule that already exists in `.governance/CORE.md`.

**Test:** find a rule whose `action` text describes (close enough) the
behavior the agent should have followed. If you can name the ID, it is
drift.

**Examples:**

- *Agent edited consolidated `session-log.md` directly in a branch.*
  → Drift of GOV-013 (edit only append-only fragments in branches).
- *Agent marked a task DONE without running tests.*
  → Drift of NN-008 (never mark a task as done without verifiable
  evidence) and GOV-006 (report PASS/FAIL evidence per acceptance
  criterion).
- *Agent implemented a feature immediately when the human asked
  "could we expose more confidence info?" — without exploring the
  question first.*
  → Drift of NN-004 (no code without planning) and NN-002 (YAGNI).

**Action for drift:** no source-doc change required. Record the
incident in `memory-system/workstreams/architect/notes.d/governance-incidents-YYYY-MM-DD.md`
with the violated rule IDs. If the same rule drifts repeatedly across
sessions, propose elevating its visibility (future work: an
`attention_priority` field on rules that promotes them into L1
regardless of trigger).

### 2. `governance-gap`

A rule should exist in this project's governance to prevent the
incident, but no such rule is currently in `.governance/CORE.md` or
any source document.

**Test:** the rule applies to ANY task in this project, not just one
human's preference, and is not generic enough for the boilerplate.

**Examples:**

- *Agent ran a 30-minute Modal job without persisting the output, then
  had to re-run it after the human asked for follow-up analysis.*
  → Gap. No rule covers "persist expensive computed artifacts so they
  survive re-runs." This applies to this project (heavy ML
  experimentation) but is not universal boilerplate behavior.
  Proposed rule body:
  ```yaml
  - id: GOV-XXX
    priority: high
    trigger: before_declaring_done
    action: persist expensive computed artifacts (model outputs, dataset features, Modal job results) under a stable path; never discard data that took more than a minute to produce
    rationale: avoids costly recomputation when the human follows up
    source: AGENTS.md#standard-workflow
  ```
  Target source: `AGENTS.md`.

- *Agent treated `docs/specs/*.md` files as advisory and skipped them on
  a task that touched the domain.*
  → If no rule exists requiring spec reading, gap. (In our case GOV-003
  already covers this, so this would actually be drift.)

**Action for gap:** draft the YAML rule body. Identify the source
document where the rule belongs (typically `AGENTS.md` for procedural,
`INTEGRITY-RULES.md` for integrity, `docs/PROJECT_SPECS.md` for CDT).
Remind the human that after editing the source, they must run
`/gen-governance-core` to refresh `.governance/`.

### 3. `personal-preference`

The human has a preference about how the agent should behave, but the
preference is not generalizable to other developers using this
boilerplate. It is scoped to this one human, or to one project context.

**Test:** would another developer using `eduoda/agents` benefit from
this rule? If no, it is preference, not governance.

**Examples:**

- *"Don't explain at length; I prefer terse answers"* — preference,
  not governance. Save as feedback memory.
- *"Always ask before running long-running shell commands"* — could be
  preference (some devs want autonomy, others want gates).
- *"When my context says I'm tired, switch to simpler language"* —
  clearly personal.

**Action for preference:** propose a snippet for one of:
- A `feedback`-type memory file under `~/.claude/projects/-home-oda-agents/memory/`
  if the preference applies whenever the human collaborates with Claude
  Code on any project.
- A block in `~/.claude/CLAUDE.md` if the preference is about Claude
  Code behavior at the global level.
- A block in this project's `CLAUDE.md` (project root) if the
  preference is scoped to this project but is genuinely personal (not
  governance for collaborators).

Be explicit in the report: "this is your preference, not a project
rule". Do not push preferences into project governance.

### 4. `boilerplate-level`

A rule should exist, applies generically to AI-agent development under
this boilerplate, and would benefit downstream projects derived from
`eduoda/agents`.

**Test:** does the rule express a general principle about how AI agents
should collaborate with humans on software projects? If yes, and the
boilerplate does not yet codify it, this is boilerplate-level.

**Examples:**

- *"After heavy exploration, the agent should summarize and re-confirm
  before implementing"* — generic. Belongs upstream.
- *"Persona skills must never edit governance artifacts they consume"*
  — generic interoperable-skills concern. Belongs upstream.
- *"Always cite source line numbers when proposing a rule extracted
  from prose"* — generic governance-tooling rule.

**Action for boilerplate-level:** generate a full GitHub issue draft
using the template in `references/issue-template.md`. Include the
proposed rule body, motivation, and the originating incident as
evidence (with citation when transcript is available). Provide the
exact `gh issue create --repo eduoda/agents --title ... --body ...`
command. Wait for the human to say "abra a issue" before executing.

## Boundary resolution

### Gap vs preference
Ask: would another developer also be hurt by the absence of this rule?
- Yes → gap.
- No → preference.

### Gap vs boilerplate-level
Ask: is the rule specific to this project's domain, or generic to
AI-agent collaboration?
- Domain-specific (this project's ML experiments, this project's
  delivery flow, etc.) → gap.
- Generic (how agents should plan, how agents should cite, how
  subagents should pass context) → boilerplate-level.

### Drift vs gap
Ask: is there an existing rule whose action describes (close enough)
the correct behavior?
- Yes → drift (don't add a new rule; reinforce the existing one).
- No → gap (draft a new rule).

If a rule exists but is too vague to have prevented the incident,
that is still drift, with the additional note "rule wording too weak;
recommend tightening". Tightening is a separate action from drafting a
new rule.

## Multi-cause incidents

When an incident violates multiple rules or has mixed causes:
- Pick the dominant category (the one with most leverage to prevent
  recurrence).
- List the secondary causes in the report under "Notas adicionais".
- Do not blur the chosen category in the structured action.

If the dominant cause is genuinely ambiguous, escalate to the human:
"Esta classificação não é evidente — gostaria de orientação?" Do not
force-fit.
