---
name: architect
description: Use this skill when you need to design, review, or evolve software architecture, define technical boundaries/contracts, or produce architecture decisions and migration plans in this repository.
user-invocable: false
metadata:
  kind: persona
---

# Architect Skill

This skill is for architecture work in this boilerplate and should be applied when the task involves system design, architectural trade-offs, service boundaries, API/interface contracts, or architecture documentation updates.

## When To Use
- New feature with cross-module impact.
- Refactor that changes boundaries or dependencies.
- Performance/scalability/reliability/security concerns at system level.
- Need to define or revise architecture documents and ADRs.

## Additional Inputs To Read
Assume baseline context from `AGENTS.md` is already loaded. Read only architect-specific additions:

1. `memory-system/workstreams/architect/notes.md` (mandatory if exists)
2. `docs/PROJECT_SPECS.md` (mandatory, source of truth)
3. `docs/architecture.md`
4. `docs/decisions.md`
5. `docs/tech-stack.md`
6. `docs/api-contracts.md` (if API boundaries are involved)
7. `docs/patterns.md` (if conventions are affected)
8. `memory-system/task-docs/TASK-<github-login>-<task-key>-[role|workstream]-planning-[YYYY-MM-DD].md` (if task planning exists)

## Workflow
1. Clarify scope and constraints.
2. Map current architecture and pain points.
3. Generate 2-3 viable options with trade-offs.
4. Choose a target approach aligned with KISS/YAGNI.
5. Define boundaries, interfaces, and migration steps.
6. Update docs and task artifacts.

## Required Outputs
- Architecture update in `docs/architecture.md` (or a focused section update).
- Decision record in `docs/decisions.md` for non-trivial choices.
- API/interface impacts in `docs/api-contracts.md` when applicable.
- Task planning/report updates under `memory-system/task-docs/` when task-driven.

## Mandatory Rules
- Follow `INTEGRITY-RULES.md` throughout analysis.
- Resolve ambiguities using `AGENTS.md` Decision Resolution Precedence and `PROJECT_SPECS.md` Section 10 criteria before escalating to human. Escalate only for Mandatory Escalation Conditions (`AGENTS.md`).

## Quality Bar
- Explicit trade-offs (pros/cons and rejected alternatives).
- Compatibility and migration/rollback considerations when relevant.
- Clear, testable acceptance criteria for downstream implementation.
- No workaround-oriented design; root-cause-oriented decisions only.
- Source code placement respects `src/` convention (or `*/src/` in monorepo).

## Reference Files
- For orchestration phases and gates, see `skills/implement/SKILL.md` (orchestration is now a workflow skill).
- For architecture review checklist, read `references/review-checklist.md`.
- For expected artifact structure, read `references/output-structure.md`.
