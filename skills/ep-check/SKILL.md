---
name: ep-check
description: >
  Use this workflow skill to validate a completed epic end-to-end before starting
  the next one. Runs comprehensive checks across server, backend, frontend,
  security, and DevOps dimensions, then enforces two blocking human gates — an
  architecture-delta acknowledgement and a manual UX test — under a zero-leftover
  policy, producing a GO / AWAITING HUMAN VALIDATION / NO-GO verdict with
  actionable findings. An epic is complete only on a final GO.

metadata:
  kind: workflow
---

# Validate Epic (ep-check) Skill

Quality gate between epics. Given an epic whose tasks are all COMPLETED, this
skill orchestrates a comprehensive end-to-end validation — from server
configuration to frontend behavior — ensuring the epic fulfills its contracts
and is free of bugs before the team moves on.

## When To Use
- All tasks of an epic are COMPLETED and delivered.
- Before starting the next epic in the roadmap.
- When human wants a full confidence check on an epic's deliverables.

## Inputs To Read
1. `AGENTS.md` (mandatory context)
2. `docs/EPICOS.md` (epic roadmap and scope)
3. `docs/EPICO-<ID>-<slug>-TASKS.md` (task list for the target epic)
4. `docs/PROJECT_SPECS.md` (functional requirements, acceptance criteria)
5. `docs/architecture.md` (architecture contracts)
6. `docs/api-contracts.md` (API contracts)
7. `docs/tech-stack.md` (technology choices)
8. `docs/patterns.md` (established patterns)
9. Task files in `memory-system/tasks/` for all epic tasks
10. Task reports in `memory-system/task-docs/` for all epic tasks
11. Source code under `src/` (or `*/src/` in monorepo)

## Workflow

### Phase 1: Context Loading and Pre-flight

1. Parse the epic ID from user input (e.g., `EP-001`).
2. Read all inputs listed above.
3. Extract from `docs/EPICOS.md`:
   - Epic scope, objectives, and deliverables.
   - Dependencies on prior epics (if any).
   - Next epic in the roadmap (if any).
4. Read `docs/EPICO-<ID>-<slug>-TASKS.md` and collect all task IDs.
5. For each task, read the task file in `memory-system/tasks/`:
   - Verify status is `COMPLETED`.
   - Verify `Evidence` field has explicit `PASS` for all acceptance criteria.
   - Verify `Delivery Status` is `MERGED`.
   - Collect task reports from `memory-system/task-docs/`.
6. If any task is NOT `COMPLETED` or lacks PASS evidence:
   - Report the gap immediately.
   - Mark the validation as `NO-GO` with pre-flight failure.
   - List incomplete tasks and missing evidence.
   - Stop here — do not proceed to Phase 2.
7. Build the epic change surface:
   - Collect all files changed across all task branches (via git log/diff).
   - Identify affected modules, APIs, and boundaries.
8. Detect the run mode (cost control):
   - **Full** — no prior validation report for this epic, or the previous report
     has no recorded baseline. Run all six dimensions over the whole change surface.
   - **Re-check (incremental)** — a prior `docs/reviews/EPIC-<ID>-validation.md`
     exists with a recorded **baseline** (validated commit SHA + the open-findings
     list). Use the incremental path below instead of a full Phase 2.

### Re-check Mode (incremental) — cost control

Re-running the full six-dimension Phase 2 after every fix is expensive and
wasteful. On a Re-check run, do NOT re-delegate all dimensions blindly. Instead:

1. Diff the working tree against the recorded baseline SHA to get the files
   changed since the last validation.
2. Re-run ONLY:
   - the dimensions whose previously-open findings are being closed, AND
   - any dimension whose scope intersects the changed-since-baseline files,
   - scoped to those files (not the whole epic surface);
   plus the full test suite (tests must always pass end-to-end — this is cheaper
   than re-delegating six persona reviews).
3. For each previously-open finding, verify it is now resolved; carry forward
   unchanged any finding in an area untouched since the last clean pass.
4. A dimension that was clean at the baseline and whose scope did not change is
   carried forward as-is — do not re-delegate it.
5. Update the baseline (new SHA + remaining open findings) when writing the report.

This keeps the findings → fix → re-check loop cheap; the heavy full pass runs once.

### Phase 2: Parallel Validation Delegations

Delegate comprehensive validation to persona skills. All delegations can
run in parallel when the provider supports it.

Each delegation receives: epic scope summary, list of changed files,
relevant contracts, and acceptance criteria from PROJECT_SPECS.

#### 2.1 Backend Validation (delegate to `backend` skill)
Assess the epic's server-side deliverables:
- Run all backend tests (unit + integration).
- Verify API endpoints match `docs/api-contracts.md`.
- Check database migrations are clean and reversible.
- Verify server configuration (env vars, ports, middleware).
- Check business logic correctness against functional requirements.
- Verify error handling and edge cases.
- Check external service integrations.
- Report: findings list with severity, test results, contract compliance.

#### 2.2 Frontend Validation (delegate to `frontend` skill)
Assess the epic's client-side deliverables:
- Run all frontend tests (unit + component + e2e).
- Verify UI matches functional requirements and acceptance criteria.
- Check accessibility (WCAG compliance, screen reader, keyboard nav).
- Check responsiveness across breakpoints.
- Verify API integration (correct endpoints, error handling, loading states).
- Check client-side state management consistency.
- Report: findings list with severity, test results, UX compliance.

> Scope boundary: this dimension validates the *functional wiring* of the UI
> (e2e flows reach the right endpoints, states render, a11y/responsiveness
> checks pass). It does NOT pronounce on subjective UX quality. Per governance
> (`the human's only testing duty is UX`), the UX verdict is reserved for the
> human and is exercised in Phase 4.2 (Manual UX Test). Do not declare UX
> validated here.

#### 2.3 Testing Validation (delegate to `testing` skill)
Assess overall test health for the epic:
- Run the full test suite (unit + integration + e2e).
- Verify test coverage for all changed modules.
- Check requirement-to-test traceability:
  - Every RF-xxx and CA-xxx touched by the epic has corresponding tests.
- Identify any test gaps or weak assertions.
- Verify no test manipulation or workarounds exist.
- Check that tests run in normal production flow (no special flags).
- **Production wiring reachability** — for every feature the epic added, trace a
  REAL caller from the production entrypoint, not just the function's existence.
  Unit tests that call a module directly stay green even when **nothing wires the
  module into the running pipeline** (a dead feature; see issue #60 — module
  unit-green but zero callers because no task owned the entrypoint). For each new
  capability, confirm an actual call site reachable from the production entry
  (tick loop, request handler, registration, `main`), e.g. `grep` the entrypoint
  for the call. A module with no production caller is a **finding**, not a pass —
  unit-green is necessary, not sufficient.
- **Render/visual/output gesture** — for features that emit produced output (rendered
  frames, canvas/image buffer, audio, lighting/DMX/Art-Net, device bytes, generated
  files), reachability (above) proves the call site EXISTS but not that it passes the
  RIGHT arguments (issue #61: wiring-WRONG — wrong phase/geometry/mode/channel silently
  degrades the gesture, invisible to a unit test that calls the producer directly).
  Require captured **real emitted output** with the gesture asserted on it, plus a
  **no-op control** proving the lever is live (see `skills/testing` § Render/visual/
  output e2e). Unit-mask green + existing call site is a **finding**, not a pass, when
  the emitted artifact was never captured and asserted.
- Report: coverage summary, traceability matrix, gap analysis, production-wiring
  reachability per new capability, and captured-output gesture evidence for any
  render/visual/output feature.

#### 2.4 Security Validation (delegate to `security` skill)
Assess security posture after the epic:
- Scan for common vulnerabilities (OWASP top 10).
- Verify auth/authz flows if touched by the epic.
- Check secrets handling (no hardcoded secrets, proper env usage).
- Review dependency vulnerabilities (if new deps added).
- Check input validation at system boundaries.
- Verify CORS, CSP, and security headers if applicable.
- Report: findings list with severity, vulnerability assessment.

#### 2.5 DevOps Validation (delegate to `devops` skill)
Assess operational readiness after the epic:
- Verify CI/CD pipeline passes for the current state.
- Check deployment configuration (Dockerfile, docker-compose, etc.).
- Verify health check endpoints if applicable.
- Check environment variable documentation.
- Verify logging and observability setup.
- Check that build artifacts are correct.
- Report: pipeline status, deployment readiness, operational gaps.

#### 2.6 Code Review (delegate to `review` skill)
Final code quality assessment across the epic's full diff:
- Review all code changes introduced by the epic (cumulative diff).
- Check for regression vectors.
- Verify architecture compliance with `docs/architecture.md`.
- Check code quality: patterns, DRY, KISS, naming conventions.
- Identify any technical debt introduced.
- Verify backward compatibility where required.
- Report: findings ranked by severity (Critical/High/Medium/Low).

### Phase 3: Consolidation and Technical Verdict

1. Collect all delegation reports.
2. Aggregate findings by severity (see `references/severity-guide.md`):
   - **Critical**: Must block; never deferrable. Data loss, security
     vulnerabilities, broken contracts, test failures.
   - **High**: Must block; never deferrable (resolve before GO). Regressions,
     coverage gaps, performance issues.
   - **Medium**: Must fix, or proceed only with a human-approved, recorded,
     tracked deferral. Code quality, missing docs, minor inconsistencies.
   - **Low**: Must fix, or proceed only with a human-approved, recorded, tracked
     deferral (zero-leftover applies even here). Style, optimization, alternatives.
3. Determine the **technical verdict** (provisional — the final verdict is set in
   Phase 4.3 after the human gates). **Zero-leftover policy:** closing an epic
   leaves NOTHING behind — not even Low findings — unless that specific finding
   carries a deferral that is:
   - **the human's decision, and the human's alone** — an agent must NEVER decide
     on its own to leave a finding behind; it may only surface the finding and
     propose a deferral, the human disposes;
   - backed by a **written rationale that is recorded** (the reason is mandatory —
     a deferral without a registered motive is invalid); and
   - **tracked** as a tech-debt item or issue so it is never lost.
   The default is "fix it now"; a deferral is the rare, justified exception the
   human explicitly authorizes, never the convenience path an agent takes.
   - **Technical GO (clean)**: zero open findings of ANY severity (Critical, High,
     Medium, Low) AND all tests pass.
   - **Technical CONDITIONAL GO**: all Critical and High findings RESOLVED, and
     every remaining Medium/Low finding has an explicit human-approved deferral
     recorded as a `DA-xxx` with rationale plus a tracked tech-debt/issue entry.
     All tests pass.
   - **Technical NO-GO**: any open Critical or High finding (these are NEVER
     deferrable — they must be fixed), OR any open Medium/Low without an approved
     deferral, OR any test failure.
   The loop is explicit: findings → fix → re-run `ep-check` → repeat until the
   epic reaches GO or CONDITIONAL GO. Do not advance to the human gates while
   fixable findings remain open.
4. If technical `NO-GO`:
   - List all blocking findings with specific remediation actions.
   - Suggest which tasks need reopening or new tasks to create.
   - Skip the human gates (Phase 4.1/4.2 are wasted effort on a failing epic) and
     go straight to the report with a final verdict of **NO-GO**.
5. If technical `GO`/`CONDITIONAL GO`, proceed to the human gates (Phase 4).

### Phase 4: Human Validation Gates (BLOCKING)

These two gates exist because automation, however thorough, cannot own two things
governance reserves for the human: **awareness of the architecture** and
**judgment of UX**. They run after a technical GO and can only *hold or lower* the
verdict — never raise it. A technical GO is not a final GO until both gates pass.

#### 4.1 Architecture Delta Briefing (awareness gate)

Goal: keep the human continuously conscious of how the system's architecture
evolved, so the autonomous pipeline never silently drifts the structure away from
the human's mental model.

1. From the epic change surface (Phase 1.7) and `docs/architecture.md`, derive a
   human-readable delta **since the previous epic**:
   - New / removed / renamed modules and their responsibility.
   - New or changed boundaries and contracts (APIs, events, schemas).
   - New external dependencies and the reason for each.
   - Notable shifts in data flow or ownership.
2. Render it with `assets/architecture-delta-briefing-template.md` to
   `docs/reviews/EPIC-<ID>-arch-delta.md`, in the project language. Keep it
   skimmable — a human reads it in a couple of minutes.
3. Present it and request explicit acknowledgement ("I have read and understood the
   architectural delta" — this is awareness, not code approval).
4. Record the acknowledgement in the validation report. No acknowledgement →
   gate `PENDING`; the final verdict cannot be GO.

#### 4.2 Manual UX Test (ownership gate)

Goal: the human exercises the real UX by hand and pronounces PASS/FAIL — the one
testing duty governance assigns to the human. Agent e2e (Phase 2.2) proves the
wiring works; this proves the experience is acceptable.

1. **Determine applicability first.** Inspect the epic's tasks for any user-facing
   surface or UX-related acceptance criteria (CA-UX / user-facing RF-xxx). A
   "user-facing surface" is any way a human directly experiences the system — web or
   mobile UI, CLI/TUI, or an API/SDK that IS the product. If there is genuinely none
   (e.g. a backend-only or infra-only epic), mark the UX gate **N/A** with explicit
   justification and skip steps 2–5. The N/A must be consistent with the agent
   dimensions (e.g. Frontend reported N/A); **when in doubt, do NOT mark N/A —
   generate the test.** An agent may propose N/A, but the human may always override
   and require the test.
2. From the UX-related acceptance criteria, generate a step-by-step manual test
   script: each step states the action, the expected observable result, and a
   PASS/FAIL box. Include how to launch the app locally.
3. Render it with `assets/manual-ux-test-plan-template.md` to
   `docs/reviews/EPIC-<ID>-ux-test.md`, in the project language.
4. Hand it to the human to execute and report results per step.
5. Fold the reported results into the validation report:
   - All steps PASS → UX gate **PASS**.
   - Any step FAIL → UX gate **FAIL**; each failure becomes a High finding plus a
     tech-debt/issue entry carrying the reproduction steps.
   - Not yet executed → gate `PENDING`.

#### 4.3 Final Verdict

Combine the technical verdict (Phase 3) with the two gates:
- **GO** — technical GO/CONDITIONAL GO **and** arch delta acknowledged **and** UX
  gate PASS (or N/A).
- **AWAITING HUMAN VALIDATION** — technical GO but a gate is `PENDING` (the human
  has not yet acknowledged the delta or run the UX test). Not a failure; the epic
  is simply not complete until resolved.
- **NO-GO** — technical NO-GO, or UX gate FAIL.

The epic is "complete" only on a final **GO**. Executor skills (e.g. `gohorse`,
`gohorse-light`, `parallel`) must NOT declare the epic done — nor set its status
to `DONE` in `docs/EPICOS.md` — on `AWAITING HUMAN VALIDATION` or `NO-GO`.

### Phase 5: Report Generation

1. Generate the validation report at `docs/reviews/EPIC-<ID>-validation.md`
   using the template from `assets/epic-validation-report-template.md`.
2. The report must include:
   - Epic identification (ID, name, scope).
   - Pre-flight results (task completion status).
   - Per-dimension findings (backend, frontend, testing, security, devops, review).
   - Aggregated findings by severity.
   - Test execution summary.
   - Human gates: architecture delta acknowledgement + manual UX test results.
   - Final verdict: GO / AWAITING HUMAN VALIDATION / NO-GO.
   - Blocking items (if NO-GO) or pending human actions (if AWAITING).
   - **Baseline** for incremental re-check: the validated commit SHA and the list
     of still-open findings (empty on a clean GO).
   - Recommendations and improvements.
   - Specs/contracts that may need updates.
   - Next epic readiness (if GO).
3. Present the final verdict and key findings to the human, including the paths of
   the arch-delta briefing and UX test plan they must act on if `AWAITING HUMAN
   VALIDATION`.

## Mandatory Rules
1. Never issue a final GO with any unresolved finding of any severity. Zero-leftover:
   Critical/High must be fixed; Medium/Low must be fixed OR carry a human-approved,
   recorded, tracked deferral.
2. **Deferrals are the human's decision and the human's alone.** An agent may
   surface a finding and propose deferring it, but must NEVER self-approve leaving
   a finding behind. The deferral motive is mandatory and must be recorded; an
   unregistered reason makes the deferral invalid. Critical/High are never deferrable.
3. Never skip any of the six validation dimensions.
4. Never skip the two human gates (Phase 4) on a technical GO/CONDITIONAL GO; the
   epic is not complete until both pass (or UX is justified N/A).
5. Never downgrade finding severity to avoid NO-GO — escalate instead.
6. All test executions must use normal production flow (no special flags).
7. Follow `INTEGRITY-RULES.md` — no test manipulation, no masking.
8. Agents perform the UX e2e wiring check (Phase 2.2); they never pronounce the UX
   verdict — that is the human's, via Phase 4.2.
9. If a validation dimension cannot be assessed (e.g., no frontend code):
   report as N/A with justification, do not fabricate findings.
10. Pre-flight failure (Phase 1) stops the workflow — do not run Phase 2.
11. Every finding must be actionable: specific file/line, what is wrong, how to fix.
12. Document the validation report before presenting the verdict.
13. If the epic introduced changes to contracts/specs, flag them for review
    even if tests pass — contract drift is a High finding.

## Required Outputs
- Validation report at `docs/reviews/EPIC-<ID>-validation.md`.
- Architecture delta briefing at `docs/reviews/EPIC-<ID>-arch-delta.md` (human gate 4.1).
- Manual UX test plan at `docs/reviews/EPIC-<ID>-ux-test.md` (human gate 4.2),
  unless UX is justified N/A.
- Final verdict: GO / AWAITING HUMAN VALIDATION / NO-GO with justification.
- Findings list by dimension and severity, each either resolved or carrying a
  human-approved, recorded, tracked deferral.
- Recommendations for the next epic (if GO).
- Corrective action list (if NO-GO) or pending human actions (if AWAITING).

## Reference Files
- Report template: `assets/epic-validation-report-template.md`
- Architecture delta briefing template: `assets/architecture-delta-briefing-template.md`
- Manual UX test plan template: `assets/manual-ux-test-plan-template.md`
- Validation dimensions guide: `references/validation-dimensions.md`
- Severity classification: `references/severity-guide.md`
