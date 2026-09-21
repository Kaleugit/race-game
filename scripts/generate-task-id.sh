#!/usr/bin/env bash
set -euo pipefail

LOGIN=""
TIMESTAMP=""
EPIC_ID=""
TASK_NUMBER=""

usage() {
  cat <<'USAGE'
Usage:
  generate-task-id.sh --login <github-login> [--timestamp YYYYMMDDHHMMSS]
  generate-task-id.sh --login <github-login> --epic-id EP-001 --task-number 01

Examples:
  generate-task-id.sh --login oda
  generate-task-id.sh --login oda --timestamp 20260224153000
  generate-task-id.sh --login oda --epic-id EP-001 --task-number 01
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --login)
      LOGIN="${2:-}"
      shift 2
      ;;
    --timestamp)
      TIMESTAMP="${2:-}"
      shift 2
      ;;
    --epic-id)
      EPIC_ID="${2:-}"
      shift 2
      ;;
    --task-number)
      TASK_NUMBER="${2:-}"
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

if [[ -z "$LOGIN" ]]; then
  echo "ERROR: --login is required"
  usage
  exit 1
fi

if [[ ! "$LOGIN" =~ ^[a-z0-9][a-z0-9-]{0,37}$ ]]; then
  echo "ERROR: invalid --login '$LOGIN' (use lowercase github login format)"
  exit 1
fi

if [[ -n "$EPIC_ID" || -n "$TASK_NUMBER" ]]; then
  if [[ -z "$EPIC_ID" || -z "$TASK_NUMBER" ]]; then
    echo "ERROR: --epic-id and --task-number must be provided together"
    exit 1
  fi

  if [[ ! "$EPIC_ID" =~ ^EP-[0-9]{3,}$ ]]; then
    echo "ERROR: invalid --epic-id '$EPIC_ID' (expected EP-<nnn>)"
    exit 1
  fi

  if [[ ! "$TASK_NUMBER" =~ ^[0-9]{2,}$ ]]; then
    echo "ERROR: invalid --task-number '$TASK_NUMBER' (expected at least two digits)"
    exit 1
  fi

  echo "TASK-${LOGIN}-${EPIC_ID}-${TASK_NUMBER}"
  exit 0
fi

if [[ -z "$TIMESTAMP" ]]; then
  TIMESTAMP="$(date -u +%Y%m%d%H%M%S)"
fi

if [[ ! "$TIMESTAMP" =~ ^[0-9]{14}$ ]]; then
  echo "ERROR: invalid --timestamp '$TIMESTAMP' (expected YYYYMMDDHHMMSS)"
  exit 1
fi

echo "TASK-${LOGIN}-${TIMESTAMP}"
