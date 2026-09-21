# Severity Classification Guide

Findings from epic validation are classified into four severity levels.
This guide defines each level and provides examples specific to epic
validation context.

## Severity Levels

### Critical (must block — NO-GO)

Findings that indicate broken functionality, data risk, or security
vulnerabilities. The epic cannot be considered complete with these present.

Examples:
- Test suite failures (unit, integration, or e2e)
- API endpoint returns incorrect data or wrong status codes
- Security vulnerability (SQL injection, XSS, auth bypass)
- Data loss or corruption risk
- Breaking API contract not documented in `api-contracts.md`
- Missing database migration or migration that loses data
- Hardcoded secrets or credentials in source code
- Race condition in concurrent operations

### High (must block — NO-GO; never deferrable)

Findings that indicate significant quality or reliability concerns. Under the
zero-leftover policy these are **never deferrable** — they must be resolved
before a final GO, exactly like Critical.

Examples:
- Test coverage gap on critical business logic
- Regression in existing functionality
- Missing error handling on external API calls
- Performance degradation measurable in benchmarks
- Acceptance criterion (CA-xxx) without corresponding test
- API contract drift (implementation differs from docs)
- Missing input validation at system boundary
- Accessibility violation on primary user flow

### Medium (must fix, or proceed only with an approved deferral)

Findings that indicate quality debt but do not risk functionality. Under the
zero-leftover policy nothing is left behind: resolve it, or proceed only with a
deferral that is the human's decision alone, carries a recorded mandatory reason,
and is tracked as a tech-debt/issue item.

Examples:
- Code duplication across modules
- Missing documentation for new API endpoint
- Inconsistent naming convention
- Minor accessibility issue on secondary flow
- Missing observability for new feature
- Test that verifies behavior but has weak assertions
- Pattern inconsistency with established conventions
- Incomplete error messages (functional but unhelpful)

### Low (must fix, or proceed only with an approved deferral)

Findings that would improve quality but have no functional impact. Zero-leftover
applies even here: not even Low is left behind silently — resolve it, or proceed
only with a human-approved, recorded, tracked deferral (same rule as Medium).

Examples:
- Style inconsistency (formatting, whitespace)
- Minor optimization opportunity
- TODO comment without tracking issue
- Test readability improvement
- Alternative implementation suggestion
- Unused import or variable
- Comment could be clearer
- Log message could be more descriptive

## Verdict Decision Matrix (technical verdict — zero-leftover)

| Open Critical/High | Open Medium/Low | Verdict |
|--------------------|-----------------|---------|
| Any (never deferrable) | — | NO-GO |
| None | Any without an approved deferral | NO-GO |
| None | All carry a human-approved, recorded, tracked deferral | CONDITIONAL GO |
| None | None | GO |

Additional rules:
- Critical and High are never deferrable; they must be resolved.
- Test passage alone never overrides an open finding of any severity.
- This is the **technical** verdict only. The **final** verdict additionally
  requires both human gates (Phase 4): architecture-delta acknowledged and manual
  UX PASS or justified N/A. A technical GO with a pending gate is
  `AWAITING HUMAN VALIDATION`, not GO.

## Aggregation Rules

- Findings from different dimensions with the same root cause should be
  deduplicated and attributed to the most relevant dimension.
- If the same issue appears as different severities in different dimensions,
  use the highest severity.
- Count unique findings, not occurrences (one broken pattern in 5 files
  is 1 finding, not 5).
