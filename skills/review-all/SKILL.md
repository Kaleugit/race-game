---
name: review-all
description: Sequential exhaustive review of all project specs. For each spec in dependency order, dispatches a fresh agent to run review-spec, auto-applies corrections, and commits. Retomable across sessions.
user-invocable: true

metadata:
  kind: workflow
---

# Review-All Skill — Sequential Full Review

Reviews all project specification documents in dependency order.
For each spec: review → auto-apply → commit. Fresh agent per document.

Retomable: progress tracked in `docs/reviews/.review-all-progress.json`.

## When To Use
- After bootstrap to validate all specs before epic planning.
- Before `/gohorse` or `/xgh` to ensure full readiness.
- After bulk spec changes to re-validate consistency across all documents.

## Parameter: --include-reviewed

- **Without** (default): skip docs whose latest review in `docs/reviews/` has verdict `PASS` and no changes since review date.
- **With `--include-reviewed`**: review ALL docs regardless of prior review status.

## Inputs To Read
1. `AGENTS.md`
2. `docs/PROJECT_SPECS.md`
3. `BRIEFING.md`
4. `docs/PREREQUISITES.md`
5. `memory-system/1-project-context.md`
6. `memory-system/2-tasks.md` (bootstrap status)
7. All files in `docs/specs/` (spec inventory)
8. `docs/reviews/.review-all-progress.json` (if resuming)

## Decision Rules (auto-approve)

The orchestrator auto-approves review-spec findings using these criteria:

1. **APPROVE** if the correction resolves an inconsistency, broken reference,
   missing propagation, or factual error.
2. **APPROVE** if the correction makes a requirement implementable by agents
   without changing scope or intended behavior.
3. **APPROVE** if the correction makes an acceptance criterion machine-verifiable
   without changing what it tests.
4. **REJECT** if the correction is cosmetic and does not change agent behavior.
5. **REJECT** if the correction inflates the spec without demonstrated need.
6. **ESCALATE** (mark pending for human) if:
   - The correction changes system architecture or scope.
   - There is a genuine trade-off not resolvable by Section 10 criteria.
   - The correction affects product direction (BRIEFING-level decisions).

## Review Order

Follow the spec dependency DAG — upstream first:

```
1. BRIEFING.md                    (foundation — project description)
2. docs/PROJECT_SPECS.md          (depends on BRIEFING)
3. docs/PREREQUISITES.md          (depends on PROJECT_SPECS)
4. docs/specs/* in alpha order    (domain specs — depend on PROJECT_SPECS)
5. memory-system/1-project-context.md  (aggregates all)
```

If `docs/specs/` contains docs with explicit dependency declarations
(e.g., referencing each other), respect that order within step 4.

## Workflow Per Spec

### Step 1: Check Progress and Skip Conditions

1. Read `docs/reviews/.review-all-progress.json`. If this spec is `done` in
   current round, skip.
2. If `--include-reviewed` is NOT set: check if `docs/reviews/REVIEW_<DOC>.md`
   exists with verdict `PASS` and the spec has no git changes since the review
   date. If so, register `{ "status": "skipped", "reason": "no_changes" }` and skip.

### Step 2: Review

Dispatch a fresh Agent (subagent_type: general-purpose) with this prompt:

```
Run /review-spec <SPEC_PATH>
Read skills/review-spec/SKILL.md and skills/review-spec/references/validation-dimensions.md for complete rules.
Do NOT read prior review reports (docs/reviews/REVIEW_*.md) — analyze from zero.
Mark ALL findings with a decision using these rules:
[copy DECISION RULES section above]
Do NOT leave findings undecided except for ESCALATE cases.
Return: review file path, finding counts (auto-fixed, rejected, escalated).
```

The subagent generates `docs/reviews/REVIEW_<DOC>.md` with decided findings
and applies auto-corrections to the spec.

### Step 3: Commit

If the subagent applied auto-corrections:

```
git add <changed spec files> docs/reviews/REVIEW_<DOC>.md
git commit -m "review(<doc>): apply N auto-corrections, M rejected, K escalated"
```

If no corrections (clean review): commit only the review file.

### Step 4: Update Progress

```json
{
  "round": 1,
  "started_at": "YYYY-MM-DD",
  "specs": {
    "BRIEFING.md": { "status": "done", "findings": 5, "applied": 3, "rejected": 1, "escalated": 1 },
    "docs/PROJECT_SPECS.md": { "status": "pending" }
  }
}
```

### Step 5: Next Spec

Repeat steps 1-4 for the next spec in order.

## Retomability

If the session is interrupted:
1. User runs `/review-all` again.
2. Orchestrator reads `docs/reviews/.review-all-progress.json`.
3. Skips specs with `status: "done"`.
4. Resumes from first `"pending"` or `"in_progress"` spec.
5. If a spec was `in_progress`, check if review file exists:
   - Review exists: check if corrections were applied and committed.
   - No review: re-run from scratch for that spec.

## End of Round

When all specs are `done`:
1. List any `ESCALATE` findings across all specs — present to human.
2. Check for propagation cascades: if a correction in spec A affects spec B,
   flag spec B for re-review in a potential next round.
3. Update progress: `"round_complete": true`.
4. Generate final summary:

```markdown
# Review-All Summary — Round N
Date: YYYY-MM-DD

## Results
| Spec | Findings | Applied | Rejected | Escalated | Verdict |
|---|---|---|---|---|---|
| BRIEFING.md | 3 | 2 | 1 | 0 | PASS |
| ... |

## Overall Verdict: READY | NOT_READY
Blocking: N specs with HUMAN_REQUIRED findings

## Escalated Items (for human)
1. [spec] — [finding] — [proposed action]

## Propagation Risks
- [spec A correction] may affect [spec B] — consider re-review
```

Save to `docs/reviews/REVIEW-ALL-SUMMARY.md`.

## Mandatory Rules
1. **Sequential, not parallel** — one spec at a time, in DAG order.
2. **Fresh agent per spec** — each review uses Agent tool with isolated context.
3. **Commit per spec** — progress saved in git after each spec.
4. **Auto-decide** — agent decides findings using decision rules above. Human only for ESCALATE.
5. **Retomable** — progress in JSON on disk. Session can restart at any time.
6. **Do not inflate** — cosmetic findings are rejected.
7. **`docs/reviews/.review-all-progress.json` is ephemeral** — add to `.gitignore`.

## Required Outputs
- `docs/reviews/REVIEW_<DOC>.md` per spec (generated by review-spec subagent).
- `docs/reviews/REVIEW-ALL-SUMMARY.md` at end of round.
- `docs/reviews/.review-all-progress.json` (ephemeral progress tracker).
- Commits with auto-applied corrections per spec.

## Reference Files
- Single-doc review: `skills/review-spec/SKILL.md`
- Validation dimensions: `skills/review-spec/references/validation-dimensions.md`
