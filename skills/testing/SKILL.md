---
name: testing
description: Use this skill when you need to define, prioritize, or execute a pragmatic test strategy for a task, map requirements to tests, enforce acceptance criteria, and verify quality gates before completion.
user-invocable: false
metadata:
  kind: persona
---

# Testing Skill

This skill provides pragmatic test-first guidance for this boilerplate.
It is not strict TDD for every case; it is risk-based and focused on confidence.

## When To Use
- Before implementation to define what will be tested.
- When fixing bugs (reproduce first, then fix).
- Before marking a task as completed.
- When acceptance criteria are ambiguous or not measurable.

## Additional Inputs To Read
Assume baseline context from `AGENTS.md` is already loaded.

1. `memory-system/workstreams/testing/notes.md` (mandatory if exists)
2. `INTEGRITY-RULES.md` (mandatory for anti-workaround/anti-test-manipulation rules)
3. `docs/PROJECT_SPECS.md`
4. `memory-system/task-docs/TASK-<github-login>-<task-key>-[role|workstream]-planning-[YYYY-MM-DD].md` (if exists)
5. `memory-system/templates/planning-template.md`
6. `memory-system/templates/report-template.md`

## Workflow
1. Extract requirements and acceptance criteria.
2. Map each requirement to one or more tests.
3. Choose test levels by risk (unit/integration/e2e/manual). For frontend/UI behavior, e2e is mandatory — see § Frontend e2e.
4. Define minimal test set required before coding starts.
5. Execute tests and collect evidence. **Capture wall-clock duration** of the suite (most runners print it; otherwise wrap with `time`). When the task ran an automated suite, record `tests_runtime: <integer seconds>` on the task file (see `memory-system/templates/task-template.md`). Doc-only tasks omit the field.
6. Report pass/fail status by acceptance criterion.

## Escalation Rule (Mandatory)
If there is no clear, testable **definition** of expected behavior:
1. Stop implementation.
2. Ask the human for clarification.
3. Resume only after criteria are explicit and testable.

This rule is about *defining* expected behavior, not *executing* tests. Once criteria are
explicit, verification (including e2e) is the agent's responsibility and must NOT be
delegated to the human (`AGENTS.md` § Non-Escalable: verification of non-UX behavior).

## Frontend e2e (Mandatory)
Any change to frontend/UI behavior requires end-to-end tests that exercise the real
functional wiring (navigation, forms, API calls, state transitions, error paths) — not
only unit/component tests. This is the agent's responsibility, never the human's.

- **Preferred tool: Playwright MCP** (provisioned in the agent execution environment —
  see `docs/PREREQUISITES.md`). Discover its tools at runtime and drive real user flows.
- **Fallback: claude-in-chrome** when Playwright MCP is unavailable.
- If NEITHER is available: the frontend acceptance criteria are marked `FAIL` (blocked on
  the e2e prerequisite). Do NOT hand functional verification to the human and do NOT mark
  `PASS` without e2e evidence.
- The human validates **UX only** (visual quality, feel, interaction polish). Functional/
  wiring correctness is verified by the agent via e2e.

e2e evidence (tool used, flows covered, `PASS/FAIL` per flow) is part of the acceptance
evidence for any frontend task.

## Render/visual/output e2e (Mandatory when applicable)
Applies to any feature whose deliverable is **produced output**: rendered frames, a
canvas/image buffer, audio, a lighting/DMX/Art-Net stream, device protocol bytes, a
generated file — anything where "correct" means the *emitted artifact* has the right
shape, not merely that a function returns.

For these, a green **unit test of the producer** (the mask/renderer/encoder called
directly) does NOT prove the feature works. Two gaps survive unit-green AND the
`ep-check` wiring-reachability check (which only proves a call site *exists* — see
`skills/ep-check`, issue #60):
- **wiring-WRONG**: the producer IS called from production, but with wrong/incomplete
  arguments (phase, geometry, mode, channel) — the gesture is silently degraded.
- **emergent output**: the bug only appears in the real emitted artifact, not in any
  single unit.

So a render/visual/output acceptance criterion requires, as agent-owned evidence:
1. **Capture the REAL emitted output** end-to-end (the actual frame buffer / DMX-Art-Net
   trace / audio samples / rendered file), produced through the production path — not a
   unit harness that calls the producer directly.
2. **Assert the gesture on the captured output**: the properties that define correctness
   (geometry, phase/direction, mode, timing, channel mapping), frame-by-frame where the
   output is temporal.
3. **A no-op control that proves the lever is live**: with the feature disabled/zeroed,
   the same capture MUST differ (the assertion must FAIL without the lever). A test that
   would pass even with the producer unwired is vacuously green and does not count.

If the capture tooling for the output medium is unavailable, the criterion is `FAIL`
(blocked on the capture prerequisite) — same posture as Frontend e2e: never hand
functional verification to the human, never `PASS` without captured-output evidence.
The human still validates only subjective quality. Reference implementation pattern:
the artboss Art-Net listener + colour-tagged frame trace + filmstrip (a derived-project
example of capture → assert-gesture → no-op-control).

## Mandatory Rules
- Resolve ambiguities using `AGENTS.md` Decision Resolution Precedence and `PROJECT_SPECS.md` Section 10 criteria before escalating to human. Escalate only for Mandatory Escalation Conditions (`AGENTS.md`).

## Required Outputs
- Requirement-to-test mapping in planning/report artifacts.
- Explicit test level coverage per critical requirement.
- Acceptance criteria status with evidence (`PASS`/`FAIL`).

## Test-Suite Runtime Threshold
- Default threshold: **180 seconds**. Projects override via a single integer on the first line of `.governance/test-runtime-threshold`.
- When `tests_runtime` (see Workflow step 5) is at or above the threshold, append a `## Performance Warning` section to the task report (Standard/Critical) or include a one-line note in `Evidence` (Quick) with:
  - the measured `tests_runtime`,
  - the effective threshold,
  - at least one concrete suggestion (e.g. run in parallel, split the suite by module, move slow tests to a nightly job).
- The warning is informational and does not block delivery.

## Quality Bar
- No “test after guess” on critical behavior.
- Bugfixes must include a failing test scenario first.
- Acceptance criteria must be measurable, observable, and binary.
- No test manipulation to force green results.
- Integrity rules from `INTEGRITY-RULES.md` are non-negotiable.
- Source-layout convention is respected for changed application code (`src/` or `*/src/` in monorepo).
- Integration/e2e tests exercise the **production layout and code path**, not a convenience shortcut. A test that bypasses the real wiring (e.g. pointing the workspace directly at a source dir instead of cloning the bare repo the way production does) can pass while production is broken — the gate goes vacuously green. When the production path and the test path diverge, the test MUST follow the production path.

## Reference Files
- Integrity anti-patterns and corrective approach: `references/integrity-anti-patterns.md`
- Testing levels and selection rules: `references/testing-levels.md`
- Acceptance criteria rules: `references/acceptance-criteria-rules.md`
- Test-first checklist: `references/test-first-checklist.md`
