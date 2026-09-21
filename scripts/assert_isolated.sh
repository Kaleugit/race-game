#!/usr/bin/env bash
# assert_isolated.sh
#
# Worktree-isolation guard. Compensates for confirmed upstream Claude Code bugs
# where `isolation: worktree` is silently dropped/contaminated
# (anthropics/claude-code #33045 team_name no-op, #51596 stale-worktree reuse).
#
# AIDEV-NOTE: NEVER discover sibling worktrees by enumeration. Guessing a
# sibling from such a listing is exactly the bleed (INC-2026-06-14). This script
# only reads its OWN resolved state and compares against caller-supplied values.
#
# Two modes:
#   (default) cooperative pre-write check — call before the first write:
#     assert_isolated.sh --expected-branch <branch> [--expected-worktree <path>]
#                        [--primary-repo <path>] [--require-clean]
#     Verifies: current worktree toplevel != primary repo root AND current
#     branch == expected-branch (and optional path/clean checks).
#
#   --pre-commit  enforcement check for a git pre-commit hook (no expected
#     branch known): blocks a commit on a TASK-* branch made from the PRIMARY
#     worktree (the dominant team_name/ad-hoc bleed signature). Commits on
#     non-task branches from primary (docs/human flow) are allowed.
#
# Usage:
#   assert_isolated.sh --expected-branch TASK-foo-20260101000000-implement
#   assert_isolated.sh --expected-branch <b> --expected-worktree <path> --require-clean
#   assert_isolated.sh --pre-commit
#
# Exit codes:
#   0  isolation confirmed (or pre-commit check passed)
#   1  usage/input error, not a git repo, or bare repo
#   2  isolation FAILED — ABORT and report; never guess a worktree
set -euo pipefail

# Resolve the repo from the filesystem (CWD), not from possibly-spoofed env.
unset GIT_DIR GIT_WORK_TREE 2>/dev/null || true

MODE="cooperative"
EXPECTED_BRANCH=""
EXPECTED_WORKTREE=""
PRIMARY_REPO=""
REQUIRE_CLEAN=0
BRANCH_RE='^[A-Za-z0-9][A-Za-z0-9._/-]*$'

usage() {
  cat <<'USAGE'
Usage:
  assert_isolated.sh --expected-branch <branch> [--expected-worktree <path>] [--primary-repo <path>] [--require-clean]
  assert_isolated.sh --pre-commit

Exit codes:
  0 isolation confirmed / pre-commit check passed
  1 usage/input error, not a git repo, or bare repo
  2 isolation FAILED (ABORT; never guess a worktree)
USAGE
}

err() { echo "ERROR: $*" >&2; }
fail_isolation() { echo "ISOLATION-FAIL: $*" >&2; exit 2; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --pre-commit) MODE="pre-commit"; shift ;;
    --expected-branch) EXPECTED_BRANCH="${2:-}"; shift 2 ;;
    --expected-worktree) EXPECTED_WORKTREE="${2:-}"; shift 2 ;;
    --primary-repo) PRIMARY_REPO="${2:-}"; shift 2 ;;
    --require-clean) REQUIRE_CLEAN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) err "unknown option '$1'"; usage; exit 1 ;;
  esac
done

# Canonicalize an existing directory path to its physical absolute form.
# Always returns 0 (empty output on a non-existent path) so `set -e` does not
# abort the caller's command substitution — callers handle the empty case.
canon() { ( cd "$1" 2>/dev/null && pwd -P ) || true; }

# --- Task-branch registry check (AGENTS.md:313) ---
#
# AGENTS.md:313 requires each task to own its branch
# (TASK-<github-login>-<task-key>-[role|workstream]); the only sanctioned
# exception is bootstrap when agreed. INC-2026-08-17 (see ADR-015) shipped 23
# task files whose `Branch:` field pointed at a shared/never-created branch,
# because nothing verified the field against reality until validate-all.sh ran
# weeks later, in bulk.
#
# This check moves that verification to before the first write / at commit time:
#   CHECK-A  >=2 task files declare the current branch -> consolidation -> FAIL
#   CHECK-B  exactly 1 declares it, but the branch does not derive from that
#            task id (^<task-id>-[a-z0-9-]+$, same rule as
#            scripts/validate-conventions.sh:344) -> FAIL
#
# ZERO declarers is always a PASS. That is the normal path, not an edge case: a
# worktree is branched from main before its task file exists there. The guard
# VERIFIES a declaration when one exists; it never REQUIRES one. Registry
# completeness belongs to validate-conventions.sh. This also keeps the script
# working in repos with no memory-system/ layout (derived boilerplate projects)
# and on non-task branches (main, fix/*, feat/*).
#
# Hermetic by design (see AIDEV-NOTE above): reads ONLY this worktree's task
# files. Never fetches, never reads another ref, never enumerates worktrees. A
# stale corpus therefore under-detects; it never false-positives — the correct
# failure direction for a guard that runs before every write.
check_branch_registry() {
  local branch="$1" tasks_dir declarers n task_id
  tasks_dir="$(git rev-parse --show-toplevel 2>/dev/null || true)/memory-system/tasks"
  [[ -d "$tasks_dir" ]] || return 0

  # One awk pass over the corpus (not one grep per file: that is 200+ process
  # spawns on every commit, which is seconds on Git Bash/Windows).
  # Compares as a STRING, never as a regex, so branch names containing '/' or
  # '.' cannot be reinterpreted as patterns. Mirrors extract_field: first
  # occurrence per file wins.
  declarers="$(awk -v b="$branch" '
      FNR==1 { seen=0 }
      seen   { next }
      /^- Branch:/ {
        v=$0; sub(/^- Branch:[ \t]*/,"",v); sub(/[ \t]+$/,"",v)
        seen=1; if (v==b) print FILENAME
      }' "$tasks_dir"/TASK-*.md 2>/dev/null || true)"

  [[ -n "$declarers" ]] || return 0
  n="$(printf '%s\n' "$declarers" | wc -l | tr -d '[:space:]')"

  if [[ "$n" -ge 2 ]]; then
    fail_isolation "branch '$branch' is declared by $n task files:
$(printf '%s\n' "$declarers" | while read -r f; do echo "  - $(basename "$f")"; done)
AGENTS.md:313 requires each task to have its OWN branch
(TASK-<github-login>-<task-key>-[role|workstream]); the only sanctioned
exception is bootstrap when agreed. Consolidating several tasks into one
branch/PR violates that rule and is what produced INC-2026-08-17 (ADR-015).
STOP and tell the human — do not proceed silently."
  fi

  task_id="$(basename "$declarers" .md)"
  if [[ ! "$branch" =~ ^${task_id}-[a-z0-9-]+$ ]]; then
    fail_isolation "branch '$branch' is declared by task '$task_id' but does not derive from it (expected ^${task_id}-[a-z0-9-]+\$, the same rule as scripts/validate-conventions.sh:344 / AGENTS.md:313). The Branch: field must record the branch that actually exists, not the one planning suggested."
  fi
}

# --- Common git-context checks (both modes) ---
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  err "not inside a git repository"
  exit 1
fi
if [[ "$(git rev-parse --is-bare-repository 2>/dev/null)" == "true" ]]; then
  err "bare repository has no working tree to isolate"
  exit 1
fi

GIT_DIR_ABS="$(canon "$(git rev-parse --git-dir)")"
COMMON_DIR_ABS="$(canon "$(git rev-parse --git-common-dir)")"
# Primary worktree root = parent of the shared .git common dir.
COMPUTED_PRIMARY="$(canon "$(dirname "$COMMON_DIR_ABS")")"
BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo HEAD)"

if [[ "$MODE" == "pre-commit" ]]; then
  # Block task-branch commits from the PRIMARY worktree.
  if [[ "$GIT_DIR_ABS" == "$COMMON_DIR_ABS" && "$BRANCH" == TASK-* ]]; then
    fail_isolation "refusing commit: task branch '$BRANCH' is being committed from the PRIMARY repository worktree ($COMPUTED_PRIMARY). Task work must run in a dedicated linked worktree (./scripts/create-worktree.sh). If you are an agent that was not given an isolated worktree, ABORT and report — never commit here, never 'cd' into another session's worktree."
  fi
  # Commit time is where consolidation actually becomes observable: the second
  # task's file has been written by now, so >=2 declarers is detectable here
  # even when the cooperative check ran before that write (ADR-015, DA-001).
  # It is also the only point covering manual/ad-hoc flows that never call the
  # cooperative mode at all.
  check_branch_registry "$BRANCH"
  exit 0
fi

# --- Cooperative mode ---
if [[ -z "$EXPECTED_BRANCH" ]]; then
  err "--expected-branch is required (or use --pre-commit)"
  usage
  exit 1
fi
if [[ ! "$EXPECTED_BRANCH" =~ $BRANCH_RE ]]; then
  err "invalid --expected-branch '$EXPECTED_BRANCH'"
  exit 1
fi

PRIMARY_ROOT="$COMPUTED_PRIMARY"
if [[ -n "$PRIMARY_REPO" ]]; then
  PRIMARY_ROOT="$(canon "$PRIMARY_REPO")"
  if [[ -z "$PRIMARY_ROOT" ]]; then err "--primary-repo path does not exist"; exit 1; fi
fi

TOPLEVEL="$(canon "$(git rev-parse --show-toplevel)")"

# Detached HEAD cannot confirm isolation.
if [[ "$BRANCH" == "HEAD" ]]; then
  fail_isolation "detached HEAD; cannot confirm isolation (expected branch '$EXPECTED_BRANCH')"
fi
# Must not be the primary repo root.
if [[ "$TOPLEVEL" == "$PRIMARY_ROOT" ]]; then
  fail_isolation "current worktree is the primary repo root ($PRIMARY_ROOT); not isolated"
fi
# Must be on the expected branch.
if [[ "$BRANCH" != "$EXPECTED_BRANCH" ]]; then
  fail_isolation "on branch '$BRANCH' but expected '$EXPECTED_BRANCH'"
fi
# Optional: worktree path must match.
if [[ -n "$EXPECTED_WORKTREE" ]]; then
  EXP_WT_ABS="$(canon "$EXPECTED_WORKTREE")"
  if [[ -z "$EXP_WT_ABS" || "$EXP_WT_ABS" != "$TOPLEVEL" ]]; then
    fail_isolation "worktree '$TOPLEVEL' != expected '$EXPECTED_WORKTREE'"
  fi
fi
# Task-branch registry (AGENTS.md:313). Best-effort here — the task file may not
# exist in this worktree yet at first-write time; --pre-commit is the enforcing
# point (ADR-015, DA-001).
check_branch_registry "$BRANCH"
# Optional: detect #51596 stale/contaminated reuse via a dirty tree at first write.
if [[ "$REQUIRE_CLEAN" -eq 1 ]]; then
  if [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
    fail_isolation "worktree is not clean (possible stale/contaminated reuse — anthropics/claude-code #51596)"
  fi
fi

echo "OK: isolated worktree confirmed (branch '$BRANCH' at '$TOPLEVEL')"
exit 0
