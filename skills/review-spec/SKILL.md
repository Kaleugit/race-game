---
name: review-spec
description: Exhaustive review of ONE specification document using parallel subagents for thorough dimensional analysis. Receives a file path, reads cross-spec context, dispatches subagents per validation dimension, consolidates findings, and auto-corrects safe issues.
user-invocable: true

metadata:
  kind: workflow
---

# Review-Spec Skill — Single Document Orchestrator

$ARGUMENTS — path of the spec document to review. If not provided, ask.

Performs an exhaustive review of one specification document by dispatching
parallel subagents — each focused on a specific validation dimension.
This avoids "good enough" early stops and guarantees coverage.

The orchestrator reads cross-spec context (BRIEFING, PROJECT_SPECS, and
sibling specs in `docs/specs/`) but subagents only produce findings for
the target document.

## When To Use
- Review a specific spec document for quality before it drives implementation.
- After editing a spec, to verify consistency with other specs.
- Called by `/review-all` for each document in sequence.

## Inputs To Read
1. Target document: `$ARGUMENTS` (the doc being reviewed)
2. `AGENTS.md` (golden rules, decision precedence)
3. `docs/PROJECT_SPECS.md` (functional source of truth)
4. `BRIEFING.md` (original project description)
5. `docs/PREREQUISITES.md` (if exists)
6. `memory-system/1-project-context.md`
7. Sibling specs in `docs/specs/` that the target doc references or is referenced by
8. `skills/review-spec/references/validation-dimensions.md`

Do NOT read all files in `docs/specs/` upfront. Read only the target doc and
its direct upstream/downstream references (identified in Phase 1).

## Workflow

### Phase 1: Preparation

1. Read the target document fully.
2. Read base context: BRIEFING.md, PROJECT_SPECS.md, 1-project-context.md.
3. Identify the target doc's reference graph:
   - Which docs does it reference? (upstream)
   - Which docs reference it? (downstream — scan headers/links in `docs/specs/`)
   - Read only direct neighbors, not the entire tree.
4. Determine applicable dimensions. Not all V1-V6 apply to every doc:

   | Dimension | Applies when |
   |---|---|
   | V1 Completeness | Always |
   | V2 Consistency | Target references or is referenced by other docs |
   | V3 Implementability | Target defines requirements, contracts, or interfaces |
   | V4 Testability | Target defines acceptance criteria or test contracts |
   | V5 Criteria | Target is PROJECT_SPECS.md or defines domain-specific decisions |
   | V6 Prerequisites | Target is PREREQUISITES.md or references external dependencies |

5. Build the document path list for subagents:
   - Always: target doc + BRIEFING.md + PROJECT_SPECS.md
   - If applicable: upstream/downstream sibling specs
   - Keep the list minimal — only docs needed for cross-reference.

### Phase 2: Parallel Analysis (subagents)

Read `references/validation-dimensions.md` for prompt templates.

For each applicable dimension, build the subagent prompt:
1. Copy UNIVERSAL RULES literally.
2. Insert dimension-specific template.
3. Insert document paths (target + context docs).
4. Append: "Your target document is `{TARGET_PATH}`. Produce findings ONLY for this document. Read context docs for cross-reference only."

Dispatch ALL applicable subagents in PARALLEL (single message, multiple Agent calls).

**Coverage gate**: verify that applicable dimensions are all covered before dispatch.

### Phase 3: Consolidation

1. Collect findings from all subagents.
2. Deduplicate: identical findings → keep one.
3. Apply anti-inflation filter (from `references/validation-dimensions.md`):
   - **Implementor test**: would this gap block an agent? If no → discard.
   - **Inference test**: can an agent infer it safely? If yes → discard.
   - **Impact test**: does fixing it change behavior? If no → discard.
4. Classify surviving findings:
   - `AUTO_FIX`: factual/structural, unambiguous, Section 10 criteria support it.
   - `HUMAN_REQUIRED`: changes behavior/scope, criteria cannot safely resolve.
   - `WARNING`: non-blocking risk.

### Phase 4: Auto-Correction

For each `AUTO_FIX` finding:
1. Apply correction to the target document.
2. Record as `DA-xxx` in `PROJECT_SPECS.md` "Autonomous Decisions" section.
3. Log: finding ID, old value, new value, criterion used.

Do NOT modify `HUMAN_REQUIRED` or `WARNING` items.

### Phase 5: Report

Generate `docs/reviews/REVIEW_<DOC_NAME>.md` (overwrite if exists):

```markdown
# Review — <document name>
Date: YYYY-MM-DD
Target: <path>

## Verdict: PASS | NEEDS_ACTION

## Findings Summary
| Dimension | Findings | Auto-Fixed | Human Required | Warnings |
|---|---|---|---|---|
| V1-V6 rows... |

## Auto-Applied Corrections
| ID | Section | Change | Criterion |
|---|---|---|---|

## Human-Required Actions
| ID | Section | Finding | Action Needed |
|---|---|---|---|

## Warnings
| ID | Section | Finding | Risk |
|---|---|---|---|

## Coverage
| Dimension | Items Checked | Issues Found |
|---|---|---|

## Autonomous Decisions
- DA-xxx: ...
```

### Phase 6: Return

When called standalone: report verdict to human.
When called by `/review-all`: return the review path and finding counts.

## Autonomy Policy
- Auto-corrections use `PROJECT_SPECS.md` Section 10 criteria.
- Anti-inflation filter is aggressive: discard when in doubt.
- Do NOT read prior review reports before completing Phase 3 (anti-contamination).

## Mandatory Rules
1. Dispatch applicable subagents in PARALLEL.
2. Subagents read the target doc fully — do not excerpt.
3. Context docs are for cross-reference only — findings apply to target doc.
4. Anti-inflation filter is orchestrator's job, not subagents'.
5. Every finding cites document, section, and exact text.
6. Every auto-correction references the criterion used.
7. Do NOT read `docs/reviews/REVIEW_*.md` before Phase 3.

## Required Outputs
- `docs/reviews/REVIEW_<DOC_NAME>.md`
- Auto-corrections applied to target document (if any).
- DA-xxx entries for auto-corrections.

## Reference Files
- Validation dimensions: `references/validation-dimensions.md`
