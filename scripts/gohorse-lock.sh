#!/usr/bin/env bash
# gohorse-lock.sh
#
# Allowlistable lock helper for the gohorse claim-on-first-touch coordination
# layer (skills/gohorse/references/ownership-delta.md). Replaces the previous
# inline `mkdir`/`rmdir` on a caller-built variable path, which (a) had no stable
# command prefix so Preflight C2 could not allowlist it, and (b) tripped the
# built-in "dangerous rmdir on a possibly-empty variable path" heuristic — so
# every lock release prompted the human and autonomous runs stalled (Issue #55).
#
# All destructive ops live HERE, on a path THIS script derives from
# `git rev-parse --git-common-dir` (never a caller argument), so a single
# allowlist rule `Bash(./scripts/gohorse-lock.sh:*)` pre-approves the whole
# protocol and no variable-path heuristic fires.
#
# The lock registry is one directory per claimed file under
#   <shared .git>/gohorse-locks/<slug(file)>/
# with an `owner` file holding the claiming task id. `mkdir` is atomic on POSIX
# — the classic zero-dependency lock primitive (CDT: zero deps + minimal
# complexity). One file -> one lock dir -> at most one owner per wave.
#
# Subcommands:
#   wipe                       rm -rf + recreate the registry (wave start)
#   claim <file> <task-id>     atomically claim <file> for <task-id>
#   release-all <task-id>      release every lock owned by <task-id>
#   lockdir                    print the resolved registry path (debug)
#
# Exit codes:
#   0  success (claim: this task now owns the file, or already owned it)
#   1  usage/input error, or not inside a git repository
#   3  claim CONTENDED — the file is already owned by another task (the caller
#      must run the lose protocol: release-all + return DEFERRED)
set -euo pipefail

# Resolve the repo from the filesystem (CWD), not from possibly-spoofed env.
unset GIT_DIR GIT_WORK_TREE 2>/dev/null || true

err() { echo "ERROR: $*" >&2; }

usage() {
  cat <<'USAGE'
Usage:
  gohorse-lock.sh wipe
  gohorse-lock.sh claim <file> <task-id>
  gohorse-lock.sh release-all <task-id>
  gohorse-lock.sh lockdir

Exit codes:
  0 success (claim: owned by this task)
  1 usage/input error or not a git repo
  3 claim CONTENDED (owned by another task — run the lose protocol)
USAGE
}

# Map a file path to a safe, injective directory name by percent-encoding every
# byte outside [A-Za-z0-9._-]. Distinct paths never collide on one lock.
slug() {
  local s="$1" out="" i c
  for (( i = 0; i < ${#s}; i++ )); do
    c="${s:i:1}"
    case "$c" in
      [A-Za-z0-9._-]) out+="$c" ;;
      *) printf -v c '%%%02X' "'$c"; out+="$c" ;;
    esac
  done
  printf '%s' "$out"
}

resolve_lockdir() {
  local common
  if ! common="$(git rev-parse --git-common-dir 2>/dev/null)"; then
    err "not inside a git repository"
    exit 1
  fi
  # git-common-dir may be relative (e.g. ".git"); canonicalize to physical abs.
  local abs
  if ! abs="$(cd "$common" 2>/dev/null && pwd -P)"; then
    err "could not resolve git-common-dir '$common'"
    exit 1
  fi
  LOCKDIR="$abs/gohorse-locks"
  # Defense-in-depth: never operate on a path that is not our registry.
  case "$LOCKDIR" in
    */gohorse-locks) ;;
    *) err "refusing to operate on unexpected path '$LOCKDIR'"; exit 1 ;;
  esac
}

cmd_wipe() {
  resolve_lockdir
  rm -rf "$LOCKDIR"
  mkdir -p "$LOCKDIR"
}

cmd_claim() {
  local file="${1:-}" taskid="${2:-}"
  if [[ -z "$file" || -z "$taskid" ]]; then
    err "claim requires <file> <task-id>"; usage; exit 1
  fi
  resolve_lockdir
  mkdir -p "$LOCKDIR"
  local lock="$LOCKDIR/$(slug "$file")"
  if mkdir "$lock" 2>/dev/null; then
    printf '%s' "$taskid" > "$lock/owner"   # we won the atomic race
    exit 0
  fi
  # EEXIST: someone owns it. Idempotent re-claim by the same task is success.
  if [[ -f "$lock/owner" && "$(cat "$lock/owner" 2>/dev/null)" == "$taskid" ]]; then
    exit 0
  fi
  exit 3   # contended by another task
}

cmd_release_all() {
  local taskid="${1:-}"
  if [[ -z "$taskid" ]]; then
    err "release-all requires <task-id>"; usage; exit 1
  fi
  resolve_lockdir
  [[ -d "$LOCKDIR" ]] || exit 0
  local d owner
  for d in "$LOCKDIR"/*/; do
    [[ -d "$d" ]] || continue   # glob matched nothing
    owner="$(cat "${d}owner" 2>/dev/null || true)"
    if [[ "$owner" == "$taskid" ]]; then
      rm -f "${d}owner"
      rmdir "$d" 2>/dev/null || true
    fi
  done
}

cmd_lockdir() {
  resolve_lockdir
  printf '%s\n' "$LOCKDIR"
}

main() {
  local sub="${1:-}"
  [[ $# -gt 0 ]] && shift || true
  case "$sub" in
    wipe)        cmd_wipe "$@" ;;
    claim)       cmd_claim "$@" ;;
    release-all) cmd_release_all "$@" ;;
    lockdir)     cmd_lockdir "$@" ;;
    -h|--help|"") usage; [[ -z "$sub" ]] && exit 1 || exit 0 ;;
    *) err "unknown subcommand '$sub'"; usage; exit 1 ;;
  esac
}

main "$@"
