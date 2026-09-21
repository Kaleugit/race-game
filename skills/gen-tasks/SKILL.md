---
name: gen-tasks
description: Use this skill to break an approved epic into a prioritized task list, refine it with a human, and finalize docs/EPICO-<ID>-<slug>-TASKS.md with commit to main. Use when an epic is selected for execution planning.

metadata:
  kind: workflow
---

# Gen Tasks Skill

This skill decomposes one approved epic into executable tasks with human approval.

## Additional Inputs To Read
Assume baseline context from `AGENTS.md` is already loaded.

1. `docs/EPICOS.md` (mandatory)
2. `docs/PROJECT_SPECS.md` (mandatory)
3. `memory-system/2-tasks.md` (mandatory for mode/task governance)
4. `docs/specs/*.md` (if present — domain specs contain constraints for task decomposition)
5. `docs/architecture.md` (if technical boundaries matter)
6. `docs/api-contracts.md` (if contract/API impacts exist)
7. `memory-system/workstreams/architect/notes.md` (mandatory if exists)

## Workflow
1. Receive target epic ID/name and the GitHub login to use in task IDs from the human.
2. Validate that the epic exists and is suitable for breakdown.
3. Propose a task list for that epic, with for each task:
   - task ID
   - title
   - domain (single bounded context)
   - description (structured: bullet list, file paths, signatures — no narrative prose)
   - priority (`1` to `5`)
   - execution mode (`Quick | Standard | Critical`)
   - dependency notes
   - input context (max 5 files the agent must read, escalate if more)
   - done criteria (machine-verifiable conditions)
   - escalation conditions (to human and to orchestrator)
4. Prefer `Standard` mode by default.
5. Use `Quick` only for clearly low-risk and small-scope work.
6. Use `Critical` only when security/data migration/breaking contract/high regression risk applies.
7. Present the task list to the human for final approval. Intermediate decisions (task granularity, mode selection, priority ordering, dependency structure) are resolved autonomously using `PROJECT_SPECS.md` Section 10 criteria. Document autonomous decisions in the "Decisoes Autonomas" section of the output artifact.
8. Create or update `docs/EPICO-<ID>-<slug>-TASKS.md` using `references/epic-tasks-template.md`.
9. Create or update one canonical task file per approved task in `memory-system/tasks/` using `memory-system/templates/task-template.md`.
   - initialize `Status: PENDING`
   - set `Priority`, `Description`, `Depends On`, `Blocked By`, `Execution Mode`, and `Last Updated`
   - default `Branch` to `TASK-<github-login>-<epic-id>-<task-number>-implement`
   - default `Workstreams` to `None` until execution starts
10. For epic-linked tasks, use IDs in the form `TASK-<github-login>-<epic-id>-<task-number>`.
11. Keep planning/report creation on demand when each task moves to `IN_PROGRESS`.
    The `Planning` and `Report` metadata fields are a **binary contract: a file
    path** (relative, pointing into `memory-system/...`) **OR absent** where the
    mode allows (Quick does not require them). **Inline prose is never valid in
    any mode** — the delivery gate resolves these fields as artifact paths, so
    inline text breaks the gate. Emit them as paths from generation; never write a
    sentence into `Planning`/`Report`.
12. Commit approved task breakdown documentation directly to `main`.

## AI Agent Execution Principles
Tasks are the unit of work executed by AI agents. Design them for autonomous execution:

- **Single domain, single concern**: each task must touch one bounded context. If a task requires changes across domains (e.g., API + frontend + database), split it into coordinated tasks with explicit dependencies.
- **Contract-consumer coupling**: when a task changes a cross-boundary contract (WebSocket message shape, REST payload, broadcast field, shared type, event name), enumerate **its consumers** and either pull them into the same task's scope or create an explicit dependent task that updates them. Include **untyped** consumers (e.g. plain-JS frontend): a type checker (`tsc`) only catches the typed producer side, so an untyped consumer drifts **silently** and the suite stays green. File-disjoint decomposition (which parallel executors optimize for) prevents write *contention*, not contract *coupling* — a renamed field held by producer and consumer in different tasks breaks at runtime, not at compile time.
- **Wiring/entrypoint ownership**: file-disjoint decomposition optimizes for one owner per *hot file*, but the production **entrypoint/integration file** (the tick loop, the router/registration call, the `index.*` that actually invokes the new modules) can end up owned by **no task at all**. Each module is then built and unit-green while **nothing calls it in the running pipeline** — a dead feature with a green suite masking the hole. So: explicitly assign ownership of the production entrypoint/wiring file(s) to a task, OR create a **dedicated integration task** gated *after* the module tasks. Treat "wiring" as a first-class deliverable with a named owner — never let it fall in the gap between module tasks. Its "Expected Output" must name the real call site (e.g. "`src/index.ts` calls `resolveSceneChange()` inside the 50Hz tick"), not just the module's existence.
- **Precision over prose**: description must use structured fields. Avoid narrative paragraphs. Prefer checklists, file paths, function signatures, and enum values. An undefined field (`TBD`) is better than an ambiguous sentence that the agent will misinterpret.
- **Done criteria, not done description**: every task must have a machine-verifiable "Expected Output" (e.g., "file `src/handlers/auth.ts` exports `loginHandler`", "tests in `tests/auth/` pass", "`GET /api/health` returns 200"). Avoid subjective criteria.
- **Escalation conditions**: each task must declare when the agent should stop and escalate:
  - To human: ambiguous requirements, security decisions, breaking changes not covered in spec.
  - To orchestrator: blocked dependency, scope creep detected, >N files affected beyond estimate.
- **Minimal context envelope**: list exactly which files the agent must read to execute the task (if >5 escalate). Do not assume the agent has full repo context. The canonical task file + listed inputs should be sufficient.
- **No implicit knowledge**: do not assume the agent remembers prior tasks. Each task file must be self-contained.

## Autonomy Policy
- Resolve task decomposition decisions autonomously using `PROJECT_SPECS.md` Section 10 criteria.
- Organize tasks to optimize AI agent execution success (self-contained, clear context envelope, single domain per task).
- Mode selection: apply `references/mode-selection-rules.md` augmented by `PROJECT_SPECS.md` criteria.
- Escalate to human only for Mandatory Escalation Conditions (`AGENTS.md`).
- Document all autonomous decisions in the "Decisoes Autonomas" section of the tasks document.
- Final task list approval by human remains mandatory.

## Mandatory Rules
- Break down only one epic per run unless the human asks otherwise.
- Keep tasks independent and testable whenever possible.
- For any task that changes a cross-boundary contract, the task list must cover every consumer (typed and untyped) in scope or via an explicit dependent task; never rely on `tsc` to catch untyped-consumer drift.
- Prefer mode `Standard` when uncertain.
- Do not invent the GitHub login for task IDs; use the human-provided login.
- Generate the canonical task file for every approved task.
- Do not pre-create planning/report docs by default.
- Write `docs/EPICO-<ID>-<slug>-TASKS.md` in the project language (PT-BR by default).
- Do not use scripts for this workflow.
- If direct commit to `main` is blocked by policy, stop and ask the human.
- Do not update bootstrap gate status in this skill.

## Required Output
- Updated `docs/EPICO-<ID>-<slug>-TASKS.md` with approved tasks.
- Canonical task files in `memory-system/tasks/` for the approved tasks.
- A commit on `main` containing the approved epic task breakdown.

## Reference Files
- Epic task document template: `references/epic-tasks-template.md`
- Mode selection rules: `references/mode-selection-rules.md`
