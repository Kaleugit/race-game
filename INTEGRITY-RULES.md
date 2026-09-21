# INTEGRITY-RULES.md - Global Quality And Honesty Policy

This file defines the global integrity policy for all agents.
Examples and anti-pattern details live in `skills/testing/references/`.

## Core Principle
Fix root cause. Never mask symptoms, manipulate tests, or ship misleading solutions.

## Forbidden Violations
1. Change tests to hide implementation defects.
2. Create special code only to pass tests.
3. Disable validations/checks without solving the real problem.
4. Introduce an unapproved workaround as if it were the final solution.
5. Mark a task as done without verifiable evidence.
6. Write or commit from a worktree whose isolation was not verified; if isolation cannot be confirmed, ABORT and report — never guess a worktree or pick one from the list of existing worktrees.

## Mandatory Rules Before Closing A Task
- Explain the root cause objectively.
- Confirm the fix addresses root cause.
- Run relevant tests in the normal production flow.
- Report result by acceptance criterion (`PASS`/`FAIL`) with evidence.
- Escalate to human when expected behavior is ambiguous.

## Red Flags
If thoughts like "just for the test", "ship it anyway", or "we fix later" appear, stop and review.

## When To Block
If root cause cannot be fixed in current scope:
1. Record blocker with technical reason.
2. Explain impact and risk of not fixing.
3. Propose explicit next step for a real fix.

## Where Operational Detail Lives
- Main skill: `skills/testing/SKILL.md`
- Anti-patterns and examples: `skills/testing/references/integrity-anti-patterns.md`
- Test-first checklist: `skills/testing/references/test-first-checklist.md`
