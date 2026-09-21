---
name: frontend
description: Use this skill when implementing or refactoring frontend code (web/mobile) including component architecture, state management, routing, forms, accessibility, responsiveness, UI performance, API integration in the client, and PWA/hybrid concerns. Use for both feature delivery and frontend technical debt reduction.
user-invocable: false
metadata:
  kind: persona
---

# Frontend Skill

This skill standardizes frontend delivery for this boilerplate with a pragmatic quality bar.

## When To Use
- When implementing or refactoring frontend/UI code, components, accessibility, or client integrations.

## Additional Inputs To Read
Assume baseline context from `AGENTS.md` is already loaded.

1. `memory-system/workstreams/frontend/notes.md` (mandatory if exists)
2. `docs/PROJECT_SPECS.md`
3. `docs/tech-stack.md`
4. `docs/patterns.md`
5. `memory-system/task-docs/TASK-<github-login>-<task-key>-[role|workstream]-planning-[YYYY-MM-DD].md` (if exists)

## Workflow
1. Clarify user flow, acceptance criteria, and UI constraints.
2. Define component boundaries and state ownership before coding.
3. Implement minimal UI and interaction path first.
4. Integrate with backend APIs using explicit contracts.
5. Validate accessibility, responsiveness, and performance basics.
6. Run tests/checks according to `skills/testing/` strategy, including **mandatory e2e** that exercises functional wiring (`skills/testing/SKILL.md` § Frontend e2e).
7. Record evidence and update task artifacts.

## Mandatory Rules
- Application source code must stay in `src/` (or `*/src/` in monorepo).
- Prefer simple, maintainable patterns over UI abstraction overload.
- Preserve design-system conventions when they exist.
- If expected **UX** behavior is ambiguous, ask the human before finalizing. UX is the human's only testing responsibility.
- **Functional/wiring correctness is verified by the agent via e2e** (Playwright MCP preferred, claude-in-chrome fallback), never delegated to the human (`skills/testing/SKILL.md` § Frontend e2e; `AGENTS.md` § Non-Escalable: verification of non-UX behavior).
- Resolve ambiguities using `AGENTS.md` Decision Resolution Precedence and `PROJECT_SPECS.md` Section 10 criteria before escalating to human. Escalate only for Mandatory Escalation Conditions (`AGENTS.md`).

## Required Outputs
- Frontend changes implemented under `src/`.
- Acceptance criteria status with evidence (`PASS`/`FAIL`).
- Updated planning/report docs in `memory-system/task-docs/`.

## Quality Bar
- Correct behavior first, then polish.
- Accessible by default (keyboard flow, labels, contrast baseline).
- Responsive on primary breakpoints.
- No fake UI states to hide backend/frontend defects.

## Reference Files
- Frontend delivery checklist: `references/frontend-delivery-checklist.md`
- UI architecture and state rules: `references/ui-architecture-rules.md`
- Client API integration rules: `references/frontend-api-integration.md`
