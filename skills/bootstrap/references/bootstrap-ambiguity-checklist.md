# Bootstrap Ambiguity Checklist

Use this checklist before setting bootstrap status to `COMPLETE`.

## Product Framing
- Is product name clearly defined?
- Is main objective explicit and testable?
- Is target audience explicit?

## Scope
- Is there at least one in-scope item?
- Is there at least one out-of-scope item?

## Requirements
- Is at least one functional requirement explicit?
- Is at least one acceptance criterion measurable (`PASS`/`FAIL`)?

## Context
- Is project type explicit?
- Is project status explicit?
- Is at least one active development area explicit?

## AI Agent Readiness
- Are domain boundaries identified (bounded contexts)?
- Are acceptance criteria machine-verifiable (`PASS`/`FAIL`), not subjective?
- Are ambiguous fields marked as `TBD` or `NEEDS_HUMAN` instead of filled with vague prose?
- Is each concern localized to one artifact (no scattered context)?
- Are escalation markers (`NEEDS_HUMAN: <question>`) recorded for unresolved decisions?
- Are autonomous resolutions marked as `RESOLVED_BY_CRITERIA: CDC-xxx — <decision>`?

## Decision Criteria Readiness
- Are default criteria present in PROJECT_SPECS Section 10?
- Are project-specific criteria extracted from BRIEFING (if any)?
- Are criteria structured as CDC-xxx entries with source references?

## Decision Rule
If any answer is "no", first attempt resolution using PROJECT_SPECS Section 10 criteria. If criteria are insufficient, ask the human before marking bootstrap `COMPLETE`.
`READY_FOR_EXECUTION` is a later state, after epic approval in `docs/EPICOS.md`.
