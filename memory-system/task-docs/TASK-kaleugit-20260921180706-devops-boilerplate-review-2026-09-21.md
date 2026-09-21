# Boilerplate Change Review Note

## Metadata
- Date: 2026-09-21 18:05
- Task ID: TASK-kaleugit-20260921180706
- Branch: TASK-kaleugit-20260921180706-devops
- Requested by Skill: delivery

## Protected Changes Detected
- Files: `.github/workflows/governance.yml` (one step gets `bash scripts/setup-links.sh` before `validate-all.sh`); mode change 100644 -> 100755 with no content change on `scripts/reconcile-session-log.sh`, `scripts/reconcile-task-index.sh`, `scripts/reconcile-workstream-notes.sh`, `scripts/run-tests.sh`, `scripts/validate-all.sh`, `scripts/validate-changed.sh`, `scripts/validate-conventions.sh`, `scripts/validate-dates.sh`, `scripts/validate-docs-only-scope.sh`, `scripts/validate-epic-ids.sh`, `scripts/validate-links.sh`, `scripts/validate-placeholders.sh`, `scripts/validate-skill-taxonomy.sh`.
- Why protected: CI workflow and governance validation/reconcile scripts come from the boilerplate and control the delivery gate. The project manager authorized the changes (ADR-016) on 2026-09-21, and the task planning doc records that approval.

## Architect Assessment
- Architect review completed: YES
- Decision summary: APPROVE. This fixes the root cause. `.claude/skills` and `.agents/skills` are deliberately left out of git (`.gitignore` lines 16-19; they are Windows junctions), so no clean checkout has them, and Rule 9 of `validate-skill-taxonomy.sh` always failed with "missing symlink" in CI. On the Ubuntu runner, `setup-links.sh` takes the non-MINGW branch and runs `ln -s ../skills`. `readlink` returns exactly `../skills`, which is the value Rule 9 expects. The script is safe there. It runs under `set -eu` and checks for `skills/` first. On a fresh checkout both paths are missing, so it goes straight to `ln -s` and never reaches the `rm -rf` branch, which only fires when a real directory sits at the link path. It exits non-zero if the links do not resolve. Inside the step this failure is not covered by the advisory `|| echo` on main, so a broken `skills/` tree still fails CI. Nothing is hidden. The fix masks no real failure. Rule 9 on CI now checks that the link setup works, while Rules 1-8 still validate the real `skills/*/SKILL.md` content through the link. Rule 9 still matters locally, where missing links are a real developer-environment problem. Reconcile step on main: no effect. The links are gitignored, and the step stages only the named `memory-system/` paths, so the links cannot enter the bot commit. `git diff --quiet` is limited to those paths too. The +x restore fixes lost metadata only. The workflow already runs `chmod +x scripts/*.sh`, so CI behavior does not change, but local and hook runs that call `./scripts/*.sh` directly work again. Trade-off: I rejected versioning the symlinks. On Windows, git would traverse the junctions and triple-index the skills, and real symlinks need Developer Mode or admin rights. I also rejected skipping Rule 9 when `CI` is set, because that weakens the validator instead of fixing the environment.
- Upstream action: NONE
- Rationale for upstream action: The breakage comes from a decision this project made (ADR-016 / `scripts/setup-links.sh`: keep the links out of git for Windows). The boilerplate may version the symlinks itself, and then its CI never meets this condition. The mode bits were lost when the boilerplate was imported on Windows in this repo, not in the boilerplate source. There is no boilerplate defect to report. If the boilerplate is later confirmed not to version the links, raise a separate ISSUE there. No upstream remote is configured, so nothing is opened.

## Upstream Execution Plan
- Issue command/check: N/A (Upstream action NONE; no upstream remote configured — `git remote -v` lists only origin Kaleugit/race-game).
- PR command/check: N/A (Upstream action NONE).

## Delivery Gate
- Delivery unblock: YES
- If NO, blocked by: N/A
- Follow-up owner: devops (confirm on the PR run that Rule 9 passes and that the setup-links output shows "criado ... (symlink)" for both paths). On the next `update-upstream`, keep the `setup-links.sh` step and the 100755 modes when resolving any conflict.
