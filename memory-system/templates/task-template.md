# TASK-<github-login>-<task-key> - Brief task description

- Status: PENDING
- Priority: 1
- Description: Short task description
- Depends On: None (or TASK-<github-login>-<task-key>)
- Blocked By: None
- Branch: TASK-<github-login>-<task-key>-<role|workstream>
- Workstreams: [backend, testing] (or None)
- Execution Mode: Quick | Standard | Critical
- Last Updated: YYYY-MM-DD HH:MM

## Optional Fields By State
- Started: YYYY-MM-DD HH:MM
- Completed: YYYY-MM-DD HH:MM
<!-- Planning/Report: a FILE PATH (relative, into memory-system/...) OR absent where the
     mode allows. Inline prose is never valid — the delivery gate resolves these as
     artifact paths and inline text breaks it. -->
- Planning: TASK-<github-login>-<task-key>-<role|workstream>-planning-[YYYY-MM-DD].md (Standard/Critical)
- Report: TASK-<github-login>-<task-key>-<role|workstream>-report-[YYYY-MM-DD].md (Standard/Critical when COMPLETED)
- prior-art: <file>:<line> — short description (one line per finding) OR `prior-art: none`. Single-line field, not a heading. Required when COMPLETED (any mode); records the search-before-create gate result (see `AGENTS.md` §Before Implementing).
- Evidence: PASS/FAIL + command/check output summary (Quick when COMPLETED).
  Format: single-line field in the metadata block at the top of the file, e.g. `- Evidence: AC-01 PASS (validate-all.sh); AC-02 PASS (manual check)`. Do NOT use `## Evidence` as a markdown heading — both `scripts/validate-conventions.sh` and the `finalize-task-metadata` Action require the `- Evidence: <content>` field-line format.
- tests_runtime: <integer seconds> (record when the task ran an automated test suite; omit for doc-only tasks)
- Delivery Handoff: PENDING|DONE (owner: human/supervisor|skills/delivery)
- Delivery PR: #<number>
- Delivery Status: PR_OPEN_AUTO_MERGE | PR_OPEN_MANUAL_MERGE | MERGED
- Delivery Merged At: YYYY-MM-DD HH:MM
