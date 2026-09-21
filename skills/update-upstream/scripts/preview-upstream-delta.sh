#!/usr/bin/env bash
set -euo pipefail

BASE_BRANCH="${1:-main}"
UPSTREAM_REMOTE="${UPSTREAM_REMOTE:-upstream}"
UPSTREAM_BRANCH="${UPSTREAM_BRANCH:-main}"
LOG_LIMIT="${LOG_LIMIT:-30}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ERROR: run inside a git repository."
  exit 1
fi

if ! git remote get-url "$UPSTREAM_REMOTE" >/dev/null 2>&1; then
  echo "ERROR: remote '$UPSTREAM_REMOTE' not found."
  exit 1
fi

git fetch "$UPSTREAM_REMOTE" "$UPSTREAM_BRANCH" --quiet

UPSTREAM_REF="${UPSTREAM_REMOTE}/${UPSTREAM_BRANCH}"

if ! git rev-parse --verify "$BASE_BRANCH" >/dev/null 2>&1; then
  echo "ERROR: base branch '$BASE_BRANCH' not found."
  exit 1
fi

read -r BEHIND AHEAD < <(git rev-list --left-right --count "${BASE_BRANCH}...${UPSTREAM_REF}")

echo "== Upstream Delta Summary =="
echo "Base branch:      ${BASE_BRANCH}"
echo "Upstream ref:     ${UPSTREAM_REF}"
echo "Behind upstream:  ${BEHIND} commit(s)"
echo "Ahead upstream:   ${AHEAD} commit(s)"
echo

echo "== Commits in upstream not in ${BASE_BRANCH} (latest ${LOG_LIMIT}) =="
git log --oneline --no-merges "${BASE_BRANCH}..${UPSTREAM_REF}" | head -n "${LOG_LIMIT}" || true
echo

echo "== Changed files (name-status) =="
git diff --name-status "${BASE_BRANCH}..${UPSTREAM_REF}" || true
