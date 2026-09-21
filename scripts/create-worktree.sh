#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TASK_ID_RE='^TASK-[a-z0-9][a-z0-9-]*-(EP-[0-9]{3,}-[0-9]{2,}|[0-9]{14})$'

TASK_ID=""
SUFFIX=""
BASE_BRANCH="main"
TARGET_PATH=""

usage() {
  cat <<'USAGE'
Usage:
  create-worktree.sh --task TASK-<github-login>-<task-key> --suffix <role-or-workstream> [--base main] [--path <target-dir>]

Examples:
  create-worktree.sh --task TASK-oda-20260224123000 --suffix backend
  create-worktree.sh --task TASK-oda-EP-001-01 --suffix backend
  create-worktree.sh --task TASK-oda-20260224124500 --suffix architect --path ../wt-architect
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --task)
      TASK_ID="${2:-}"
      shift 2
      ;;
    --suffix)
      SUFFIX="${2:-}"
      shift 2
      ;;
    --base)
      BASE_BRANCH="${2:-}"
      shift 2
      ;;
    --path)
      TARGET_PATH="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "ERROR: unknown option '$1'"
      usage
      exit 1
      ;;
  esac
done

if [[ ! "$TASK_ID" =~ $TASK_ID_RE ]]; then
  echo "ERROR: --task must match TASK-<github-login>-<task-key>"
  exit 1
fi

if [[ ! "$SUFFIX" =~ ^[a-z0-9-]+$ ]]; then
  echo "ERROR: --suffix must use lowercase letters/numbers/dash"
  exit 1
fi

if ! git -C "$ROOT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ERROR: not a git repository: $ROOT_DIR"
  exit 1
fi

BRANCH="${TASK_ID}-${SUFFIX}"
if [[ -z "$TARGET_PATH" ]]; then
  TARGET_PATH="$(dirname "$ROOT_DIR")/wt-${BRANCH}"
fi

if [[ -e "$TARGET_PATH" ]]; then
  echo "ERROR: target path already exists: $TARGET_PATH"
  exit 1
fi

git -C "$ROOT_DIR" fetch --all --prune

if git -C "$ROOT_DIR" show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git -C "$ROOT_DIR" worktree add "$TARGET_PATH" "$BRANCH"
else
  git -C "$ROOT_DIR" worktree add "$TARGET_PATH" -b "$BRANCH" "$BASE_BRANCH"
fi

# LFS materialization: `git worktree add` honors GIT_LFS_SKIP_SMUDGE and may
# leave LFS-tracked files as plain pointer text, causing false test failures
# when downstream code reads them as real binaries. Re-run the smudge filter
# explicitly from the shared .git/lfs/objects/ store. `checkout` (not `pull`)
# uses local objects when available — zero network in the common case.
materialize_lfs_in_worktree() {
  local wt="$1"
  local gitattributes="$wt/.gitattributes"
  local include_file="$wt/.governance/lfs-include"
  local -a paths=()

  # No LFS tracking declared -> no-op.
  [[ -f "$gitattributes" ]] || return 0
  grep -qE 'filter=lfs' "$gitattributes" 2>/dev/null || return 0

  if ! command -v git-lfs >/dev/null 2>&1 && ! git lfs version >/dev/null 2>&1; then
    echo "WARN: repository declares filter=lfs in .gitattributes but 'git lfs' is not installed; LFS-tracked files will remain as pointer text in $wt" >&2
    return 0
  fi

  if [[ -f "$include_file" ]]; then
    while IFS= read -r line; do
      line="${line%%#*}"
      line="${line## }"; line="${line%% }"
      [[ -n "$line" ]] && paths+=("$line")
    done < "$include_file"
  fi

  echo "Running 'git lfs checkout' in $wt to materialize LFS-tracked files"
  if [[ ${#paths[@]} -gt 0 ]]; then
    git -C "$wt" lfs checkout -- "${paths[@]}" 2>/dev/null \
      || echo "WARN: 'git lfs checkout' (scoped) failed in $wt; some LFS files may remain as pointers" >&2
  else
    git -C "$wt" lfs checkout 2>/dev/null \
      || echo "WARN: 'git lfs checkout' failed in $wt; some LFS files may remain as pointers" >&2
  fi
}

materialize_lfs_in_worktree "$TARGET_PATH"

echo "Worktree created"
echo "- Branch: $BRANCH"
echo "- Path: $TARGET_PATH"
