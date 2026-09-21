# Extraction Protocol

This is the canonical procedure for distilling governance source documents
into the runtime payload required by the `.governance/` artifacts.

## Guiding spirit (read this first)

The goal is **not** to inventory every prescriptive sentence in the source
documents. The goal is to capture the **operating philosophy** of the
project in the smallest faithful form an AI agent needs to behave correctly.

A project's governance is a hierarchy, not a flat list:

1. **Foundational principles** (small set, often explicitly labeled
   "Golden Rules", "Core Principle", "Regras de Ouro"). These ARE the
   project's spirit.
2. **Integrity safeguards** (e.g. forbidden violations). Concreteness
   around the foundational principles.
3. **Operational scaffolding** (mandatory readings, branch conventions,
   execution modes). Useful but secondary.
4. **Conventions** (encoding, language split, source layout). House style.
5. **Decision criteria** (CDT/CDC). Tie-breakers for trade-offs.

> Heuristic: if a project's governance fits in 7 lines of prose at the
> top of a document, your extracted core should fit in roughly 7
> INTEGRITY bullets plus 10-15 BLOCKING/HIGH bullets. If you produce
> 30+ bullets you are atomizing prose, not extracting philosophy.

## Output format (prose payload, NOT YAML)

The runtime payload (`CORE.md`, `MINI.md`, `SUBAGENT.md`) is injected
into the model context every session, prompt, and subagent launch. It
must read like a short imperative briefing, not a rules database.

- **Imperative one-liner per rule.** No IDs, no source anchors, no
  priority/trigger/category fields, no rationale blocks.
- **Grouped by visual priority**, in this fixed order:
  `INTEGRITY` → `BLOCKING — <trigger>` → `HIGH — <trigger>` → `DECISION CRITERIA`.
- **Trigger labels** (used as section suffix): `before task start`,
  `before declaring done`, `always`, `on compaction`.
- **One sentence per bullet**, period at the end. If a rule needs a
  qualifier, attach it as a short clause; never split into two bullets.
- Embed the WHY only when it is needed to judge an edge case
  (one short clause inside the sentence, not a separate `rationale:` block).

Rule traceability (which source document/anchor, original ID, original
priority/trigger/category) is recoverable from the source documents
plus `.governance/meta.yaml`. The injected payload does not carry it.

## Inputs
- All governance source documents listed in `SKILL.md` (read all that exist).
- The current `.governance/CORE.md` if it exists (used only to confirm
  no behavioral rule is dropped during regeneration).
- `references/template.yaml` (templates and section order).

## Step 1 — Foundational principles → INTEGRITY

Locate the explicitly-labeled top-of-document rule lists:

- `AGENTS.md` → section titled "Golden Rules" (or the project's equivalent).
- `INTEGRITY-RULES.md` → section titled "Core Principle".
- `CLAUDE.md` → claude-specific overrides that ARE provider rules (rare).

Each item becomes one bullet under `INTEGRITY (NEVER violate):`.

Preserve wording as close to the source as practical. Light edits are
acceptable for English-only enforcement, concision (under 110 chars),
and ending in a period. Do NOT paraphrase or split a Golden Rule into
multiple bullets. One Golden Rule = one INTEGRITY bullet.

## Step 2 — Integrity safeguards (only if they add information)

Scan `INTEGRITY-RULES.md` for items NOT already covered by Step 1:

- `Forbidden Violations` items that name a specific anti-pattern beyond
  what a Golden Rule already implies → add as INTEGRITY bullet.
- `Mandatory Rules Before Closing A Task` → these are procedural rules,
  not non-negotiables. Place them under `BLOCKING — before declaring done:`.

Skip anything that is just a rewording of a Golden Rule.

## Step 3 — Operational scaffolding → BLOCKING / HIGH

For each operational rule in the source documents, ask:

1. Is this derivable from a Golden Rule or an existing INTEGRITY bullet?
   → **drop it**.
2. Is this a project-specific procedure an agent needs to follow that
   would not occur from common sense + the Golden Rules? → **keep it**.

Classify by:
- **Priority section**: `BLOCKING` (must do; violation aborts) or
  `HIGH` (strong default; deviation requires recorded justification).
- **Trigger subsection**: `before task start`, `before declaring done`,
  `always`, `on compaction`.

Examples of what to keep (BLOCKING/HIGH):
- "Create or use a task-specific worktree and branch before coding."
- "Report PASS/FAIL evidence per acceptance criterion."
- "Deliver to main only via skills/delivery with passing CI."
- "Edit only append-only fragments on branches."
- "Subagents receive isolated context; the orchestrator passes context explicitly."

Examples of what to drop:
- "Do not commit broken code" (derivable from Fix Root Cause).
- "Prefer skills for repetitive tasks" (derivable from DRY/KISS).

## Step 4 — Conventions → HIGH always (not INTEGRITY)

House-style conventions (language split, UTF-8 encoding, `src/` layout)
are NOT non-negotiables. Place them as bullets under `HIGH — always:`.

## Step 5 — Decision criteria → DECISION CRITERIA

Extract from `docs/PROJECT_SPECS.md` Section 10 (or project's equivalent).
Format each bullet as `<criterion name> — <imperative preferred direction>.`

Drop the `apply_when:` field — at runtime the agent infers when a
criterion applies from the criterion name itself. Preserve project
overrides (e.g. `CDC-xxx`) by name when present; do not invent CDC IDs.

## Step 6 — Section order and labels (exact)

Use these exact headers and order in `CORE.md`:

```
INTEGRITY (NEVER violate):
BLOCKING — before task start:
BLOCKING — before declaring done:
BLOCKING — always:
BLOCKING — on compaction:
HIGH — before task start:
HIGH — before declaring done:
HIGH — always:
DECISION CRITERIA (CDT — apply when criteria from PROJECT_SPECS.md §10 are silent):
```

Omit a section entirely when it has no bullets.

## Step 7 — Emit four files

**File A — `.governance/CORE.md`** (L2, full reference, every section above).

**File B — `.governance/MINI.md`** (L1, attention amplifier). Keep only
`INTEGRITY`, `BLOCKING — before declaring done`, and `BLOCKING — always`.
Drop every other section. Target ≤ 1500 bytes.

**File C — `.governance/SUBAGENT.md`** (L3, subagent subset). Same
structure as CORE.md but drop the `before task start` and `on compaction`
sections — subagents do not select tasks and are not subject to context
compaction.

**File D — `.governance/meta.yaml`** (audit sidecar, NOT injected):

```yaml
generated_at: <ISO 8601 UTC>
generator: gen-governance-core
sources:
  - path: AGENTS.md
    sha256: <hex>
  # ... one entry per source actually read
sources_missing:
  - <optional path>
```

The sidecar keeps full source provenance and SHA-256 fingerprints for
audit/diff. It is plain YAML, no markdown wrapper, English only.

## Step 8 — Concrete example (do not copy literally)

Input fragment (`AGENTS.md#golden-rules`):
```
1. KISS: prefer simple solutions.
2. YAGNI: do not implement what was not requested.
```

Output fragment (`CORE.md`):
```
INTEGRITY (NEVER violate):
- KISS — prefer the simplest solution that works.
- YAGNI — do not implement what was not requested.
```

Input fragment (`AGENTS.md#mandatory-reading-at-task-start`):
```
1. docs/PROJECT_SPECS.md
2. memory-system/1-project-context.md
3. memory-system/2-tasks.md
4. Latest entries in memory-system/session-log.md ...
```

Output fragment (`CORE.md`):
```
BLOCKING — before task start:
- Read docs/PROJECT_SPECS.md, memory-system/1-project-context.md, memory-system/2-tasks.md, and the latest session-log and workstream-notes fragments.
```

## Step 9 — Quality bar

Before returning, verify:

- `INTEGRITY` covers EVERY item from the source's foundational-principle
  list (Golden Rules / Core Principle).
- No `INTEGRITY` bullet is a paraphrase of another.
- No `INTEGRITY` bullet is a convention (UTF-8, language, layout) —
  conventions live under `HIGH — always`.
- Every `BLOCKING`/`HIGH` bullet is NOT derivable from an INTEGRITY rule.
- Every existing rule from the previous `CORE.md` still appears in the
  new payload as one bullet (count parity, semantic parity).
- Section order matches Step 6 exactly.
- Output language is English only.
- Each generated `.md` body fits under the size budget when wrapped by
  `skills/gen-governance-core/hooks/inject-level.sh` (run
  `bash skills/gen-governance-core/scripts/validate-size.sh` to confirm; cap is 10,000 chars).

If the result has more than ~20 bullets across BLOCKING + HIGH, you are
likely atomizing prose. Re-read Step 3 and prune.
