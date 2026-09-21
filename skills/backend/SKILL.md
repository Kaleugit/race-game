---
name: backend
description: Use this skill when implementing or refactoring backend/server-side systems, including APIs, business logic, data access, migrations, async jobs, external integrations, reliability hardening, and performance tuning. Use for feature delivery, bug fixes, and backend architecture execution.
user-invocable: false
metadata:
  kind: persona
---

# Backend Skill

This skill standardizes backend delivery for this boilerplate with a root-cause and contract-first mindset.

## When To Use
- When implementing or refactoring backend systems, APIs, business logic, or data access.

## Additional Inputs To Read
Assume baseline context from `AGENTS.md` is already loaded.

1. `memory-system/workstreams/backend/notes.md` (mandatory if exists)
2. `docs/PROJECT_SPECS.md`
3. `docs/api-contracts.md` (when API is involved)
4. `docs/architecture.md`
5. `docs/tech-stack.md`
6. `memory-system/task-docs/TASK-<github-login>-<task-key>-[role|workstream]-planning-[YYYY-MM-DD].md` (if exists)

## Workflow
1. Clarify requirements, constraints, and acceptance criteria.
2. Define/confirm contracts and data implications before implementation.
3. Implement business logic with explicit boundaries.
4. Add/update data layer and migrations safely.
5. Integrate external services with retries/timeouts/idempotency where needed.
6. Validate behavior with `skills/testing/` strategy.
7. Record evidence and update task artifacts.

## Mandatory Rules
- Application source code must stay in `src/` (or `*/src/` in monorepo).
- Fix root cause; no workaround as final solution.
- Keep APIs and data contracts explicit and version-aware.
- If expected behavior, contract semantics, or test scope is ambiguous, ask the human.
- Resolve ambiguities using `AGENTS.md` Decision Resolution Precedence and `PROJECT_SPECS.md` Section 10 criteria before escalating to human. Escalate only for Mandatory Escalation Conditions (`AGENTS.md`).

## Required Outputs
- Backend changes implemented under `src/`.
- Contract/data impacts documented when applicable.
- Acceptance criteria status with evidence (`PASS`/`FAIL`).
- Updated planning/report docs in `memory-system/task-docs/`.

## Quality Bar
- Predictable error semantics and observability baseline.
- Safe data changes with rollback awareness.
- No hidden coupling between modules/services.
- No test manipulation to force green results.

## Reference Files
- Backend delivery checklist: `references/backend-delivery-checklist.md`
- API contract rules: `references/api-contract-rules.md`
- Data and migrations guide: `references/data-and-migrations.md`
- Reliability baseline: `references/reliability-baseline.md`
