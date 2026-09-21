---
name: xgh
description: Use this workflow skill to deliver an automated MVP from BRIEFING.md by orchestrating bootstrap, epic generation, task decomposition, and gohorse execution across all approved epics.

metadata:
  kind: workflow
---

# Xgh Skill

This workflow is an autonomy-first MVP factory.
It starts from `BRIEFING.md`, prepares repository remotes, plans epics, and
executes all epics with minimal human interaction.

## When To Use
- Human asks for end-to-end MVP delivery from `BRIEFING.md`.
- Project should run with near-zero human checkpoints.
- You need deterministic orchestration across planning and execution skills.

## Inputs To Read
1. `BRIEFING.md` (mandatory)
2. `AGENTS.md`
3. `memory-system/2-tasks.md`
4. `docs/PROJECT_SPECS.md`
5. `memory-system/1-project-context.md`
6. `skills/bootstrap/SKILL.md`
7. `skills/gen-epics/SKILL.md`
8. `skills/gen-tasks/SKILL.md`
9. `skills/gohorse/SKILL.md`
10. `skills/delivery/SKILL.md`
11. `skills/review-all/SKILL.md`
12. `docs/PREREQUISITES.md` (if exists)
13. `docs/specs/*.md` (if present)

## Autonomy Contract
- Do not wait for routine approvals.
- Canonical decision precedence: `AGENTS.md` "Autonomous Decision-Making" section.
- Resolve ambiguities using this specialization:
  1. Explicit human decision (overrides everything).
  2. Explicit `BRIEFING.md` statements.
  3. `docs/PROJECT_SPECS.md` Section 10 criteria (project-specific first, then defaults).
  4. Existing project contracts (task docs, epic docs).
  5. Existing repository conventions and prior task evidence.
  6. Lowest-risk assumption that preserves delivery reversibility, documented in output artifact.
- Escalate to human only when Mandatory Escalation Conditions (`AGENTS.md`) apply:
  - contradictory goals with no safe tie-breaker
  - compliance/security/legal risk
  - destructive irreversible operation with high blast radius
  - external dependency deadlock requiring product decision

## Workflow
1. Bootstrap preflight from `BRIEFING.md`.
   - Validate `BRIEFING.md` is project-specific (not placeholder).
   - Set run objective as "MVP-ready delivery with full traceability".
2. Enforce private remote repository naming policy.
   - Compute `project_name` as basename of current directory.
   - Ensure target private remote repository name equals `project_name`.
   - If repository does not exist, create it as private with `gh repo create`.
   - If repository exists with a different name, stop and escalate.
3. Execute `bootstrap` with autonomy override.
   - Fill mandatory bootstrap artifacts without waiting for routine handoff.
   - Keep unresolved items only when they are truly high-uncertainty.
4. Execute `review-all` to validate specifications.
   - Run `/review-all` to validate all spec documents (BRIEFING, PROJECT_SPECS, PREREQUISITES, and any `docs/specs/*`).
   - Auto-apply safe corrections. Report blocking items to human.
   - If blocking items remain, pause and escalate before epic generation.
5. Verify prerequisites readiness.
   - Read `docs/PREREQUISITES.md`. If blocking items are unchecked, warn human.
   - Continue if human acknowledges or all blocking items are resolved.
6. Execute `gen-epics`.
   - Generate and refine `docs/EPICOS.md` autonomously from bootstrap outputs.
   - Mark bootstrap gate to `READY_FOR_EXECUTION` when epic set is coherent.
7. Resolve GitHub login for task IDs.
   - Derive from `gh api user --jq '.login'` or `git config user.name`.
   - Pass to `gen-tasks` for task ID generation.
8. Build executable plan for all approved epics.
   - Parse `docs/EPICOS.md` and enumerate all epic IDs in order.
   - For each epic, execute `gen-tasks` to produce `docs/EPICO-<ID>-<slug>-TASKS.md`.
9. Execute implementation for all epics.
   - For each epic in order, invoke `gohorse`.
   - `gohorse` handles per-task `implement` + `delivery` loops.
   - Epic closing is NOT unattended: each epic ends at `ep-check`, whose two
     blocking human gates (architecture-delta acknowledgement + manual UX test)
     must pass before the epic is marked `DONE`. The MVP is complete only after
     every epic reaches `ep-check`'s final `GO`. Surface these as the minimal
     required human touchpoints.
10. Track blockers and continue.
   - If one epic blocks, continue remaining independent epics when safe.
   - Record blocked items with explicit reason and required human decision.
11. Final MVP closure.
   - Produce final summary with:
     - completed epics and delivered tasks
     - delivery evidence pointers
     - residual risks and deferred scope
     - minimal human decisions still required (if any)

## Human Interaction Policy
- Minimal interaction is the default behavior.
- Send concise progress reports at phase boundaries only.
- Ask human questions only for high-uncertainty conflicts from the Autonomy Contract.

## Mandatory Rules
1. Repository remote must be private and match current directory name.
2. Never bypass `delivery` semantic validation on task shipping.
3. Never modify tests to force passing results.
4. Keep scope focused on MVP outcomes derivable from `BRIEFING.md`.
5. If `BRIEFING.md` is insufficient for a safe MVP boundary, ask once with a single consolidated question set.

## Required Outputs
- Updated bootstrap artifacts (`PROJECT_SPECS`, project context, task board state).
- Approved epic roadmap (`docs/EPICOS.md`) and per-epic task docs.
- Delivery evidence for executed tasks/epics.
- Final MVP execution report with blockers, risks, and next actions.

## Reference Skills
- `skills/bootstrap/SKILL.md`
- `skills/gen-epics/SKILL.md`
- `skills/gen-tasks/SKILL.md`
- `skills/gohorse/SKILL.md`
- `skills/delivery/SKILL.md`
