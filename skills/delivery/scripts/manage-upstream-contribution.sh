#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SOURCE_BRANCH=""
UPSTREAM_REMOTE="${UPSTREAM_REMOTE:-upstream}"
UPSTREAM_BRANCH="${UPSTREAM_BRANCH:-main}"
CREATE_PR=0
CREATE_ISSUE=0
PR_TITLE=""
PR_BODY=""
ISSUE_TITLE=""
ISSUE_BODY=""

usage() {
  cat <<'USAGE'
Usage:
  manage-upstream-contribution.sh --source-branch <branch> [options]

Options:
  --upstream-remote <name>   Upstream remote name (default: upstream)
  --upstream-branch <name>   Upstream base branch for PR (default: main)
  --create-pr                Open/update PR in upstream after push
  --pr-title "<title>"       PR title (optional)
  --pr-body "<body>"         PR body (optional)
  --create-issue             Create issue in upstream after push
  --issue-title "<title>"    Issue title (required with --create-issue)
  --issue-body "<body>"      Issue body (optional)

Examples:
  manage-upstream-contribution.sh --source-branch TASK-oda-20260224123000-devops
  manage-upstream-contribution.sh --source-branch TASK-oda-20260224123000-devops --create-pr
  manage-upstream-contribution.sh --source-branch TASK-oda-20260224123000-devops --create-pr --create-issue --issue-title "Align delivery rule upstream"
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source-branch)
      SOURCE_BRANCH="${2:-}"
      shift 2
      ;;
    --upstream-remote)
      UPSTREAM_REMOTE="${2:-}"
      shift 2
      ;;
    --upstream-branch)
      UPSTREAM_BRANCH="${2:-}"
      shift 2
      ;;
    --create-pr)
      CREATE_PR=1
      shift
      ;;
    --pr-title)
      PR_TITLE="${2:-}"
      shift 2
      ;;
    --pr-body)
      PR_BODY="${2:-}"
      shift 2
      ;;
    --create-issue)
      CREATE_ISSUE=1
      shift
      ;;
    --issue-title)
      ISSUE_TITLE="${2:-}"
      shift 2
      ;;
    --issue-body)
      ISSUE_BODY="${2:-}"
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

if [[ -z "$SOURCE_BRANCH" ]]; then
  echo "ERROR: --source-branch is required"
  usage
  exit 1
fi

if [[ "$CREATE_ISSUE" -eq 1 && -z "$ISSUE_TITLE" ]]; then
  echo "ERROR: --issue-title is required when --create-issue is used"
  exit 1
fi

if ! git -C "$ROOT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ERROR: not a git repository: $ROOT_DIR"
  exit 1
fi

if ! git -C "$ROOT_DIR" show-ref --verify --quiet "refs/heads/$SOURCE_BRANCH"; then
  echo "ERROR: source branch not found locally: $SOURCE_BRANCH"
  exit 1
fi

if ! git -C "$ROOT_DIR" remote get-url "$UPSTREAM_REMOTE" >/dev/null 2>&1; then
  echo "ERROR: upstream remote not found: $UPSTREAM_REMOTE"
  exit 1
fi

extract_github_repo() {
  local url="$1"
  local repo=""
  url="${url%.git}"

  if [[ "$url" =~ ^git@github\.com:([^/]+/[^/]+)$ ]]; then
    repo="${BASH_REMATCH[1]}"
  elif [[ "$url" =~ ^https://github\.com/([^/]+/[^/]+)$ ]]; then
    repo="${BASH_REMATCH[1]}"
  elif [[ "$url" =~ ^ssh://git@github\.com/([^/]+/[^/]+)$ ]]; then
    repo="${BASH_REMATCH[1]}"
  fi

  [[ -n "$repo" ]] && echo "$repo"
}

UPSTREAM_FETCH_URL="$(git -C "$ROOT_DIR" remote get-url "$UPSTREAM_REMOTE")"
UPSTREAM_PUSH_URL_ORIGINAL="$(git -C "$ROOT_DIR" remote get-url --push "$UPSTREAM_REMOTE" 2>/dev/null || true)"

if [[ -z "$UPSTREAM_PUSH_URL_ORIGINAL" ]]; then
  echo "ERROR: could not resolve original push URL for remote '$UPSTREAM_REMOTE'"
  exit 1
fi

restore_push_url() {
  git -C "$ROOT_DIR" remote set-url --push "$UPSTREAM_REMOTE" "$UPSTREAM_PUSH_URL_ORIGINAL" >/dev/null 2>&1 || true
}

trap restore_push_url EXIT

git -C "$ROOT_DIR" remote set-url --push "$UPSTREAM_REMOTE" "$UPSTREAM_FETCH_URL"
echo "Temporarily enabled push on remote '$UPSTREAM_REMOTE'."

git -C "$ROOT_DIR" push "$UPSTREAM_REMOTE" "${SOURCE_BRANCH}:${SOURCE_BRANCH}"
echo "Branch pushed to ${UPSTREAM_REMOTE}/${SOURCE_BRANCH}."

if [[ "$CREATE_PR" -eq 0 && "$CREATE_ISSUE" -eq 0 ]]; then
  echo "No PR/issue requested. Push URL will be restored automatically."
  exit 0
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "ERROR: GitHub CLI (gh) is required to create upstream PR/issue."
  exit 1
fi

UPSTREAM_REPO="$(extract_github_repo "$UPSTREAM_FETCH_URL" || true)"
if [[ -z "$UPSTREAM_REPO" ]]; then
  echo "ERROR: could not parse GitHub repository from upstream URL: $UPSTREAM_FETCH_URL"
  exit 1
fi

if [[ "$CREATE_ISSUE" -eq 1 ]]; then
  if [[ -z "$ISSUE_BODY" ]]; then
    ISSUE_BODY="Boilerplate-protected change detected during derived project delivery."
  fi
  issue_url="$(gh issue create --repo "$UPSTREAM_REPO" --title "$ISSUE_TITLE" --body "$ISSUE_BODY")"
  echo "Issue created: $issue_url"
fi

if [[ "$CREATE_PR" -eq 1 ]]; then
  if [[ -z "$PR_TITLE" ]]; then
    PR_TITLE="chore: upstream contribution from ${SOURCE_BRANCH}"
  fi
  if [[ -z "$PR_BODY" ]]; then
    PR_BODY="Boilerplate contribution proposed from derived project delivery flow."
  fi

  pr_number="$(gh pr list --repo "$UPSTREAM_REPO" --head "$SOURCE_BRANCH" --base "$UPSTREAM_BRANCH" --state open --json number --jq '.[0].number' 2>/dev/null || true)"

  if [[ -z "$pr_number" || "$pr_number" == "null" ]]; then
    gh pr create \
      --repo "$UPSTREAM_REPO" \
      --base "$UPSTREAM_BRANCH" \
      --head "$SOURCE_BRANCH" \
      --title "$PR_TITLE" \
      --body "$PR_BODY" >/dev/null
    pr_number="$(gh pr list --repo "$UPSTREAM_REPO" --head "$SOURCE_BRANCH" --base "$UPSTREAM_BRANCH" --state open --json number --jq '.[0].number')"
    echo "Upstream PR created: #$pr_number"
  else
    echo "Using existing upstream PR: #$pr_number"
  fi
fi
