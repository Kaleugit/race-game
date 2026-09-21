# Validation Dimensions

This document defines the six validation dimensions used by the `ep-check`
skill. Each dimension maps to a persona skill that provides expert judgment.

## Dimension Overview

| # | Dimension | Persona Skill | Focus Area |
|---|-----------|---------------|------------|
| 1 | Backend | `backend` | APIs, business logic, data, server config |
| 2 | Frontend | `frontend` | UI, accessibility, responsiveness, API integration |
| 3 | Testing | `testing` | Test suite health, coverage, traceability |
| 4 | Security | `security` | Vulnerabilities, auth, secrets, dependencies |
| 5 | DevOps | `devops` | CI/CD, deployment, observability, health checks |
| 6 | Code Review | `review` | Code quality, architecture compliance, regression |

## Dimensions vs. Human Gates

The six dimensions above are **agent-performed**. They are distinct from the two
**human gates** in Phase 4 of the skill, which an agent must never pronounce on:

- The Frontend dimension validates UX **functional wiring** (e2e flows, rendered
  states, a11y/responsiveness checks) — it never declares the UX acceptable.
- The **UX verdict** is the human's, via the Phase 4.2 Manual UX Test.
- The **architecture-awareness acknowledgement** is the human's, via the Phase 4.1
  Architecture Delta Briefing.

On a Re-check (incremental) run, dimensions clean at the baseline whose scope did
not change are carried forward and not re-delegated (see SKILL.md § Re-check Mode).

## When a Dimension is N/A

A dimension may be marked N/A when the epic did not touch that area at all.
Examples:
- Frontend N/A: epic was purely backend/infrastructure.
- Backend N/A: epic was purely frontend/UI.
- DevOps N/A: epic did not change deployment, CI, or infrastructure.

Rules:
- N/A must include explicit justification (e.g., "No frontend files changed").
- N/A does not count as a finding — it neither blocks nor supports the verdict.
- At least 3 of 6 dimensions must be actively assessed (not N/A).
- The Testing and Code Review dimensions are always mandatory — never N/A.

## Delegation Prompt Structure

Each delegation should provide the persona skill with:

1. **Epic context**: ID, name, scope, objectives.
2. **Changed files**: list of all files changed by the epic.
3. **Contracts**: relevant sections from `api-contracts.md`, `architecture.md`.
4. **Acceptance criteria**: RF-xxx and CA-xxx from PROJECT_SPECS relevant to the epic.
5. **Specific assessment request**: what to evaluate (per dimension checklist).
6. **Expected return format**: findings list with severity + summary.

## Per-Dimension Checklists

### Backend
- [ ] All backend tests pass (unit + integration)
- [ ] API endpoints match contracts in `docs/api-contracts.md`
- [ ] Database migrations are clean and reversible
- [ ] Server configuration is correct (env vars, ports, middleware)
- [ ] Business logic matches functional requirements (RF-xxx)
- [ ] Error handling covers edge cases
- [ ] External service integrations work correctly
- [ ] No N+1 queries or performance regressions

### Frontend
- [ ] All frontend tests pass (unit + component + e2e)
- [ ] UI matches functional requirements and acceptance criteria
- [ ] Accessibility compliance (WCAG, keyboard nav, screen reader)
- [ ] Responsive across defined breakpoints
- [ ] API integration correct (endpoints, error handling, loading states)
- [ ] Client state management consistent
- [ ] No console errors in normal flows
- [ ] Assets optimized (images, bundles)

### Testing
- [ ] Full test suite passes (all levels)
- [ ] Test coverage meets project threshold for changed modules
- [ ] Every RF-xxx touched by epic has corresponding test
- [ ] Every CA-xxx touched by epic has PASS evidence
- [ ] No test manipulation or workarounds detected
- [ ] Tests run in normal production flow (no special flags)
- [ ] No flaky tests introduced
- [ ] Requirement-to-test traceability is complete
- [ ] Production wiring reachability: every new capability has a REAL caller traced
      from the production entrypoint (not just a passing unit test calling it
      directly) — a module with no production caller is a finding (issue #60)
- [ ] Render/visual/output gesture: features that emit produced output (frames,
      canvas, audio, lighting/DMX/Art-Net, device bytes, files) have captured REAL
      emitted output with the gesture asserted on it + a no-op control proving the
      lever is live — unit-mask green alone is a finding (issue #61)

### Security
- [ ] No OWASP top 10 vulnerabilities in changed code
- [ ] Auth/authz flows correct (if touched)
- [ ] No hardcoded secrets or credentials
- [ ] Dependencies free of known vulnerabilities
- [ ] Input validation at system boundaries
- [ ] Security headers correct (CORS, CSP, etc.)
- [ ] Sensitive data handling follows patterns
- [ ] No information leakage in error responses

### DevOps
- [ ] CI/CD pipeline passes for current state
- [ ] Deployment configuration correct and up to date
- [ ] Health check endpoints functional (if applicable)
- [ ] Environment variables documented
- [ ] Logging and observability in place
- [ ] Build artifacts correct
- [ ] No deployment blockers
- [ ] Rollback path exists

### Code Review
- [ ] Architecture compliant with `docs/architecture.md`
- [ ] Code patterns follow `docs/patterns.md`
- [ ] DRY, KISS, YAGNI principles respected
- [ ] Naming conventions consistent
- [ ] No regression vectors identified
- [ ] Backward compatibility preserved where required
- [ ] No unnecessary technical debt introduced
- [ ] All changed files reviewed
