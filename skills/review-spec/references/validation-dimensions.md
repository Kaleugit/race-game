# Validation Dimensions and Subagent Templates

Reference for the review-spec orchestrator. Contains dimension definitions,
subagent prompt templates, anti-inflation filter, and finding format.

## Dimensions

### V1 — Completeness
Every mandatory field in every spec document has a real, non-placeholder value.
No critical field contains `TBD`, `YYYY-MM-DD`, `[Item]`, or empty content
when bootstrap status is `COMPLETE` or beyond.

Scope: BRIEFING.md, PROJECT_SPECS.md, PREREQUISITES.md, 1-project-context.md.

### V2 — Consistency
All spec documents tell the same story. No contradictions between documents.
Changes in one document are propagated to dependent documents.

Checks:
- Features in BRIEFING have corresponding RF-xxx in PROJECT_SPECS.
- Technology in BRIEFING matches PROJECT_SPECS constraints.
- Scope in PROJECT_SPECS matches BRIEFING intent.
- CDC-xxx entries trace to BRIEFING sources.
- 1-project-context.md aligns with PROJECT_SPECS (name, type, goals).
- Additional spec docs do not contradict base specs.
- Cross-spec interfaces are symmetrical (what one doc exports, consumers import correctly).

### V3 — Implementability
An AI agent can translate each requirement into code without guessing or
requiring human clarification mid-implementation.

Checks:
- Each RF-xxx describes observable behavior (not intent or wish).
- Technology stack is explicitly chosen OR Section 10 criteria are sufficient to choose.
- External APIs have: endpoint pattern, auth method, data format — or are listed as prerequisites.
- Core data entities and relationships are at least sketched.
- No circular dependencies between requirements.
- Domain boundaries are clear (bounded contexts for future epics).

### V4 — Testability
Every acceptance criterion can be evaluated by running a command, checking
an API response, or verifying a UI state. No subjective criteria.

Checks:
- Each CA-xxx has a binary PASS/FAIL evaluation method.
- Test approach is identifiable for each requirement (unit, integration, e2e, manual).
- Edge cases and error scenarios are described.
- No criteria require human judgment to evaluate ("should feel fast", "intuitive UI").

### V5 — Decision Criteria Coverage
Section 10 criteria are sufficient for agents to make autonomous decisions
during implementation without escalating to human.

Checks:
- All 6 default criteria present.
- Project-specific criteria (CDC-xxx) extracted from BRIEFING.
- Criteria cover expected trade-offs: library vs custom, SQL vs NoSQL, monolith vs services, client vs server rendering, caching strategy, etc.
- No `NEEDS_HUMAN` markers remain unresolved.
- Decision precedence is clear and referenced.

### V6 — Prerequisites
All items required for automated execution are resolved.

Checks:
- `docs/PREREQUISITES.md` exists and has project-specific content.
- All categories reviewed (checked, N/A with justification, or pending).
- Items that block automated execution are completed.
- Required credentials are documented (which ones, where to configure — not values).
- Required runtime and tools are specified with versions.

---

## Subagent Prompt Templates

### Universal Rules (copy LITERALLY into every subagent prompt)

```
UNIVERSAL RULES FOR REVIEW-SPEC SUBAGENTS:
1. Read ALL spec documents listed below via Read tool. Do NOT skip any document or section.
2. Produce findings ONLY for your assigned dimension. Ignore issues outside your scope.
3. For each finding: cite document path, section, and exact text that evidences the gap.
4. Propose a specific correction (exact replacement text, not "improve X").
5. Do NOT apply corrections. The orchestrator handles that.
6. Do NOT read prior review reports (docs/REVIEW-SPEC-REPORT.md). Analyze from zero.
7. Do NOT inflate findings. If unsure whether something is a real gap, skip it.
8. Use this finding format for each issue:

   | ID | Document | Section | Finding | Proposed Correction | Severity |
   |---|---|---|---|---|---|
   | V[N]-[NNN] | path | section | specific gap description | exact fix text | BLOCKING / WARNING |

9. At the end, output a coverage summary: how many items you verified vs found issues.
10. If you find zero issues for your dimension, explicitly state "No findings for V[N]."
```

### COMPLETENESS Subagent (V1)

```
You are the COMPLETENESS subagent for review-spec.
Your dimension: V1 — Completeness.

Task: Verify every mandatory field in every spec document has a real,
non-placeholder value. Check the bootstrap minimum criteria from AGENTS.md.

Documents to read:
{DOC_PATHS}

Specific checks:
- BRIEFING.md: has project-specific content (not template).
- PROJECT_SPECS.md: product name, objective, problem, audience, scope (included + excluded),
  at least one RF-xxx, at least one CA-xxx, real date in "Ultima atualizacao",
  Section 10 with default criteria.
- 1-project-context.md: Name, Type, Status, Last Updated filled. At least one goal.
  At least one active development area.
- PREREQUISITES.md: exists, has project-specific content, categories reviewed.
- Additional spec docs: no placeholder sections, no empty required fields.

{UNIVERSAL_RULES}
```

### CONSISTENCY Subagent (V2)

```
You are the CONSISTENCY subagent for review-spec.
Your dimension: V2 — Consistency.

Task: Cross-reference ALL spec documents and verify they tell the same story.
Look for contradictions, missing propagation, and misaligned references.

Documents to read:
{DOC_PATHS}

Specific checks:
- Every major feature in BRIEFING has a corresponding RF-xxx in PROJECT_SPECS.
- Technology mentioned in BRIEFING matches PROJECT_SPECS constraints and Section 10.
- Scope in PROJECT_SPECS matches BRIEFING intent (nothing silently added or dropped).
- CDC-xxx entries trace back to BRIEFING sources.
- 1-project-context.md aligns with PROJECT_SPECS (name, type, goals).
- If additional spec docs exist: interfaces exported by one doc are correctly
  consumed by dependent docs. Changes in upstream docs are reflected downstream.
- No contradictory statements across any pair of documents.

Build a reference graph (which doc references which) and check every edge.

{UNIVERSAL_RULES}
```

### IMPLEMENTABILITY Subagent (V3)

```
You are the IMPLEMENTABILITY subagent for review-spec.
Your dimension: V3 — Implementability.

Task: Evaluate whether an AI agent can implement each requirement without
guessing or requiring human clarification.

Documents to read:
{DOC_PATHS}

Specific checks:
- Each RF-xxx describes observable behavior, not just intent.
  Bad: "RF-001: User authentication". Good: "RF-001: Users authenticate via email+password,
  receiving a JWT valid for 24h. Failed login returns 401 with error message."
- Technology stack is defined or Section 10 criteria suffice to choose.
- External API integrations have endpoint patterns, auth methods, data formats.
  Or are listed as prerequisites for human to provide.
- Core data entities and relationships are identifiable from requirements.
- No circular requirement dependencies.
- Domain boundaries (bounded contexts) are clear for epic decomposition.

For each vague requirement, propose a specific rewrite that an agent could implement.

{UNIVERSAL_RULES}
```

### TESTABILITY Subagent (V4)

```
You are the TESTABILITY subagent for review-spec.
Your dimension: V4 — Testability.

Task: Verify every acceptance criterion can be evaluated programmatically
or via a deterministic manual check. No subjective criteria.

Documents to read:
{DOC_PATHS}

Specific checks:
- Each CA-xxx has a binary PASS/FAIL evaluation method.
- For each CA-xxx, identify: what to run/check, expected result, failure condition.
- Flag subjective criteria: "should feel fast", "intuitive", "user-friendly",
  "reasonable performance". Propose measurable replacements.
- Edge cases and error scenarios are documented (at least for critical paths).
- Test approach is identifiable per requirement (unit, integration, e2e, manual).

{UNIVERSAL_RULES}
```

### CRITERIA Subagent (V5)

```
You are the CRITERIA subagent for review-spec.
Your dimension: V5 — Decision Criteria Coverage.

Task: Verify that PROJECT_SPECS Section 10 criteria are sufficient for
agents to make autonomous decisions during the entire implementation
lifecycle without escalating to human.

Documents to read:
{DOC_PATHS}

Specific checks:
- All 6 default criteria present in Section 10.
- Project-specific CDC-xxx entries extracted from BRIEFING (if BRIEFING has
  extractable constraints). Each CDC-xxx has a source reference.
- Criteria cover likely implementation trade-offs:
  - Library vs custom implementation
  - SQL vs NoSQL (or specific DB choice)
  - Monolith vs microservices
  - Client-side vs server-side rendering
  - Caching strategy
  - Authentication approach
  - Error handling strategy
  - Logging/observability approach
- No unresolved NEEDS_HUMAN markers in any spec document.
- Decision precedence in Section 10 matches AGENTS.md canonical precedence.
- For each trade-off NOT covered by criteria: flag as a potential mid-execution escalation.

{UNIVERSAL_RULES}
```

### PREREQUISITES Subagent (V6)

```
You are the PREREQUISITES subagent for review-spec.
Your dimension: V6 — Prerequisites.

Task: Verify all items required for automated development execution
are resolved or explicitly documented.

Documents to read:
{DOC_PATHS}

Specific checks:
- docs/PREREQUISITES.md exists and has been reviewed (not template-only).
- All categories evaluated (Environment, Accounts, Infrastructure,
  External Dependencies, Design Assets, Domain Knowledge).
- Items that block automated execution are checked (done) or have clear
  timeline/owner for resolution.
- Required credentials are listed by name and env var (not values).
- Required runtime, tools, and versions are specified.
- N/A items have brief justification.
- No implicit prerequisites discoverable from BRIEFING/PROJECT_SPECS
  that are missing from PREREQUISITES.md.

Cross-check: scan RF-xxx and BRIEFING for mentions of external services,
APIs, platforms, or tools. Each one should appear in PREREQUISITES.md
or be documented as not requiring pre-setup.

{UNIVERSAL_RULES}
```

---

## Anti-Inflation Filter

Applied by the orchestrator to all subagent findings BEFORE classification.

For EACH finding, apply three tests in order:

### Test 1: Implementor Test
> Would this gap actually block or mislead an agent during implementation?
If NO → discard. The finding is cosmetic or theoretical.

### Test 2: Inference Test
> Can an agent safely infer the correct information from surrounding context,
> code conventions, or Section 10 criteria?
If YES → discard. The agent will figure it out.

### Test 3: Impact Test
> Does fixing this change system behavior, agent decisions, or project scope?
If NO → discard. The fix is cosmetic.

A finding must PASS all three tests (i.e., it WOULD block, CANNOT be inferred,
and DOES change behavior) to survive.

---

## Finding Classification

After anti-inflation, classify each surviving finding:

| Classification | Criteria | Action |
|---|---|---|
| `AUTO_FIX` | Factual/structural fix. No behavior or scope change. Correction is unambiguous. Section 10 criteria support it. | Orchestrator applies correction, records DA-xxx. |
| `HUMAN_REQUIRED` | Fix changes behavior, scope, or involves trade-off. Criteria cannot safely resolve. | Orchestrator reports to human with proposed action. |
| `WARNING` | Non-blocking but increases risk of escalation during execution. | Orchestrator includes in report. No action needed. |

---

## Finding Format

Subagents produce findings in this table format:

```
| ID | Document | Section | Finding | Proposed Correction | Severity |
|---|---|---|---|---|---|
| V1-001 | docs/PROJECT_SPECS.md | 1. Visao do Produto | "Nome do produto" is empty placeholder | Fill with "[project name from BRIEFING]" | BLOCKING |
| V2-001 | docs/PROJECT_SPECS.md | 3. Requisitos | RF-003 mentions "real-time sync" but BRIEFING says "batch processing" | Align with BRIEFING: change to batch | BLOCKING |
```

The orchestrator renumbers findings sequentially as F-001, F-002, etc. in the final report.
