# EPICOS.md Template

Use this template to create `docs/EPICOS.md` after human approval.
Render final content in the project language.

```md
# EPICOS

## Metadata
- Last Updated: YYYY-MM-DD
- Owner: Architect
- Status: ACTIVE

## Rules
- Canonical file: this document.
- Epic IDs are stable and never reused.
- File-level versioning is done by Git history.

## Epic List

### EP-001 - [Epic title]
- Status: PLANNED | IN_PROGRESS | DONE | CANCELED
- Domain: [single bounded context this epic belongs to]
- Objective: [one sentence, no ambiguity]
- Scope In:
  - [explicit item 1]
  - [explicit item 2]
- Scope Out:
  - [explicit exclusion 1]
- Dependencies: None | EP-XXX
- Completion Signal:
  [observable, machine-verifiable outcome]
- Escalation Triggers:
  - [condition under which agent must stop and ask human/orchestrator]
- Change Log:
  - YYYY-MM-DD - [change summary]

### EP-002 - [Epic title]
- Status: PLANNED | IN_PROGRESS | DONE | CANCELED
- Domain:
- Objective:
- Scope In:
- Scope Out:
- Dependencies:
- Completion Signal:
- Escalation Triggers:
- Change Log:
  - YYYY-MM-DD - [change summary]

## Decisoes Autonomas
- DA-001: [decisao] — Criterio: [CDC-xxx ou padrao] — Racional: [justificativa]
```
