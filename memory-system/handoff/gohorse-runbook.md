# gohorse-light runbook (race-game, Windows 11 ARM64 / Git Bash)

Primary repo: /c/Users/kaleu/dev/race-game. Never write in the primary checkout; work only in your own worktree.

## Read first
AGENTS.md, docs/PROJECT_SPECS.md, your task file, your epic task list, memory-system/1-project-context.md,
memory-system/workstreams/aliases.conf, docs/decisions.md (ADR-019, ADR-020), skills/gohorse/references/subagent-prompt-template.md (phases 0-5),
and the accumulated context file: memory-system/handoff/gohorse-context.md

## Environment (verified)
- Worktree: from the primary repo run `./scripts/create-worktree.sh --task <TASK_ID> --suffix implement`; cd in; `./scripts/assert_isolated.sh --expected-branch <TASK_ID>-implement --require-clean` (non-zero -> return BLOCKED). Then `npm install`.
- `./scripts/validate-all.sh` cannot pass on this Windows machine (TD-001, TD-002, unrelated). Use `./scripts/validate-changed.sh` + `npm run test:sim` + `npm test`. Report validate-all as "N/A locally (TD-001/TD-002); CI runs it". CI on the PR is the authoritative gate.
- CI rules: every changed `src/**/*.js` needs `@module <name> — <purpose>` in its first 8 lines and `@summary` before each public export; regenerate docs/INDEX-API.md with `./skills/gen-api-index/scripts/gen-api-index.sh` and commit it. Task files in IN_PROGRESS/COMPLETED need `Workstreams: [development]`. Completion preflight needs a `- prior-art:` line. Sim tests are `tests/sim/*.test.js` (`npm run test:sim`); e2e are `tests/e2e/*.spec.js` (`npm test`, build+preview on 4173).
- Persona delegation: at most 2 lightweight consults (architect, testing); may skip for Quick. User wants speed over ceremony.
- Human UX gate (driving feel / visuals) is HUMAN-only: never mark it PASS; write "UX gate: pending human (batched at epic end)"; it does not block delivery/merge.
- Never touch protected paths (skills/delivery/references/protected-boilerplate-paths.txt), .github/, scripts/validate-*. Never --no-verify. Never modify tests to make them pass. Selective git add only.
- Commit format: `<type>(task-kaleugit-EP-XXX-NN[-scope]): <desc>`. Post-commit guard: every FILES_MODIFIED path appears in `git diff --stat origin/main...HEAD`.
- Delivery: validation note (memory-system/templates/delivery-validation-template.md), report (report-template.md; planning-template.md for Standard/Critical), then `./skills/delivery/scripts/deliver-to-main.sh --source-branch <branch> --validation-note <note> --title "<type>(task-kaleugit-EP-XXX-NN): <desc>"`. Poll `gh run list --workflow governance.yml --branch <branch>` until the latest non-skipped run completes; if `cancelled`, `gh run rerun <id>` once; if failed, fix the cause and push.
- VERCEL: automatic deployments are OFF (vercel.json). Never run `vercel` deploy commands.
- MERGE: do NOT run `gh pr merge` yourself. The orchestrator verifies CI and merges. Stop when the PR is ready and the governance check-run on the FINAL head SHA is `success` (verify via `gh api repos/Kaleugit/race-game/commits/<sha>/check-runs`; duplicate `skipped` runs are normal; Vercel rate-limit failures are not a gate). Return DELIVERY_STATUS: PR_OPEN. Keep your worktree.
- Update task file (Status COMPLETED, Delivery PR, Delivery Status), epic task list status, session-log.d fragment, workstreams/development/notes.d fragment.
- If your task is Critical and planning reveals a Mandatory Escalation Condition, stop and return AWAITING_APPROVAL with the planning doc path; otherwise proceed.

## Return protocol (LAST content of your response, exact markers)
--- GOHORSE RETURN START ---
TASK_ID:
STATUS: COMPLETED | BLOCKED | FAILED | AWAITING_APPROVAL
EXECUTION_MODE:
EVIDENCE_SUMMARY:
DELIVERY_STATUS: MERGED | PR_OPEN | FAILED | SKIPPED | NOT_ATTEMPTED
DELIVERY_PR:
BLOCKERS:
- None
AUTONOMOUS_DECISIONS:
- DA-001: ... — Criteria: ... — Rationale: ...
CONTRACTS_CHANGED:
- ...
ARTIFACTS_CREATED:
- ...
FILES_MODIFIED:
- ...
KEY_CONTEXT_FOR_NEXT_TASKS:
- ...
--- GOHORSE RETURN END ---
