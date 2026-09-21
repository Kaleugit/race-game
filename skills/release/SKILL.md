---
name: release
description: Use this workflow skill to run controlled software releases with versioning, changelog, tag creation, post-deploy smoke checks, and rollback gate decisions.

metadata:
  kind: workflow
---

# Release Skill

This skill standardizes a safe release flow for derived projects.
It is focused on traceability and controlled operational risk.

## When To Use
- Human requests a new release to an environment.
- A release candidate needs version/changelog/tag traceability.
- Deployment requires smoke checks before being considered complete.

## Inputs To Read
1. `AGENTS.md`
2. `docs/PROJECT_SPECS.md`
3. `memory-system/2-tasks.md`
4. `memory-system/tasks/` (active task)
5. Release notes file (`CHANGELOG.md` or project equivalent)
6. Deployment runbook/pipeline for the target environment

## Workflow
1. Confirm release scope:
   - target environment
   - release owner
   - expected version bump (`major`, `minor`, or `patch`)
2. Prepare versioning:
   - update canonical version file(s)
   - ensure the target version is unique and semver-compliant
3. Update changelog:
   - append the new release entry to the active unreleased/release section
   - summarize features, fixes, and notable risks
   - include release date and version heading
4. Create release commit with only release artifacts.
5. Create annotated tag:
   - default format `v<version>` unless project says otherwise
   - tag message must reference the changelog section/version
6. Execute deployment using the approved project path.
7. Run post-deploy smoke checks:
   - health endpoint
   - at least one critical user path
8. Evaluate rollback gate:
   - if smoke checks fail, stop release completion and execute rollback runbook
   - if rollback is unclear or unsafe, escalate immediately to human
9. Publish release summary with evidence links.

## Mandatory Rules
- Never skip versioning, changelog, tag, or smoke checks.
- Treat changelog as an incremental history, not as a narrative report rewritten retroactively.
- Never mark release as successful when smoke checks fail.
- Never use lightweight tags for production releases.
- Never continue when versioning/tagging conventions are unclear; ask the human.
- Keep release edits minimal, explicit, and reversible.

## Required Output
- Release version and commit SHA.
- Annotated tag name and target SHA.
- Changelog section reference.
- Smoke check evidence (`PASS` or `FAIL` with executed checks).
- Rollback gate decision (`NOT_NEEDED`, `EXECUTED`, or `ESCALATED`).

## Reference Files
- `../testing/SKILL.md`
