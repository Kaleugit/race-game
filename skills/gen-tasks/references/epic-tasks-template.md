# Epic Tasks Document Template

Use this template to create `docs/EPICO-<ID>-<slug>-TASKS.md` after human approval.
Render final content in the project language.

```md
# EPICO-<ID>-<slug>-TASKS

## Metadata
- Epic ID: EP-XXX
- Epic Title: [title]
- Last Updated: YYYY-MM-DD
- Owner: Architect
- Status: APPROVED

## Epic Context
- Objective:
- Scope Boundaries:
- Key Dependencies:

## Approved Task List

### Task 01 - [Task title]
- Task ID: TASK-<github-login>-EP-XXX-01
- Status: PENDING
- Priority: 1-5
- Execution Mode: Quick | Standard | Critical
- Domain: [single bounded context]
- Description:
  [structured: what to do, not how — use bullet list, file paths, function signatures]
- Depends On: None | TASK-<github-login>-EP-XXX-YY
- Canonical File: memory-system/tasks/TASK-<github-login>-EP-XXX-01.md
- Suggested Branch: TASK-<github-login>-EP-XXX-01-implement
- Input Context (max 5 files):
  - [file path the agent must read to execute]
- Done Criteria:
  - [machine-verifiable condition, e.g., "tests pass", "file exists", "endpoint returns 200"]
- Escalation Conditions:
  - To human: [e.g., "ambiguous requirement in X", "security decision needed"]
  - To orchestrator: [e.g., "blocked by TASK-YY", "scope exceeds N files"]

### Task 02 - [Task title]
- Task ID: TASK-<github-login>-EP-XXX-02
- Status: PENDING
- Priority: 1-5
- Execution Mode: Quick | Standard | Critical
- Domain:
- Description:
- Depends On:
- Canonical File:
- Suggested Branch:
- Input Context (max 5 files):
- Done Criteria:
- Escalation Conditions:

## Planning Notes
- Default policy: create `planning/report` on demand as tasks move to execution.
- Each task must be self-contained: the canonical task file + listed input context must be sufficient for execution without implicit knowledge from prior tasks.

## Decisoes Autonomas
- DA-001: [decisao] — Criterio: [CDC-xxx ou padrao] — Racional: [justificativa]
```
