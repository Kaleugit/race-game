#!/usr/bin/env bash
# append-to-orphan.sh — append an NDJSON fragment to the per-repo telemetry
# branch (an ORPHAN ref `refs/heads/telemetry`) using pure git plumbing, WITHOUT
# touching the working tree, HEAD, or the real index.
#
# This is the foundational transport of the monitoring system (Fase 1a). Every
# telemetry producer (the statusLine tap, the governance hooks) routes its lines
# through here. Rationale and design: MONITORING-DESIGN.md ("Transporte: branch
# órfã `telemetry` por repo").
#
# Why an orphan branch:
#   - It never pollutes `main` (where the agent works): no untracked files, no
#     diff, no PR noise, no CI trigger. Fragments live ONLY in commits of the
#     `telemetry` ref, disjoint from the project history (gh-pages pattern).
#   - It does not depend on the agent running `git add`: this script appends via
#     plumbing on a hook boundary, solving "agents never commit telemetry".
#
# Usage:
#   <producer> | append-to-orphan.sh <logical-path>
#     <logical-path>  path INSIDE the orphan tree, e.g. usage/<session>.ndjson
#     stdin           the NDJSON line(s) to append (a trailing newline is
#                     ensured automatically)
#
# Behavior contract (telemetry must never disturb a turn):
#   - Emits NOTHING to stdout. Always exits 0. Fails effectively silent on any
#     error (missing git, not a repo, missing path arg, jq/git hiccup). A NUL
#     byte in the fragment is the one case that can make $(cat) warn on stderr —
#     NDJSON never contains NUL, and both callers redirect stderr to /dev/null.
#   - Operates on the repo at $CLAUDE_PROJECT_DIR (fallback: cwd).
#   - Concurrency-safe: serializes ref updates with a portable advisory lock
#     (flock when available, else an atomic mkdir-lock) on the common git dir and
#     uses compare-and-swap on update-ref.
#   - Fork-safe: the orphan records the repo slug at meta/repo. If an INHERITED
#     telemetry branch belongs to a different repo (a fork copies all branches),
#     it is RE-ROOTED here — the inherited history is discarded so a fork emits
#     only its own telemetry and is never summed into the upstream.
#   - Push is best-effort, asynchronous, silent (never blocks the turn). A
#     rejected push (e.g. divergent orphan on the remote) is ignored; the local
#     ref keeps every line and the aggregator fetches what it can.

set -u

REF="refs/heads/telemetry"

LOGICAL_PATH="${1:-}"
[ -n "$LOGICAL_PATH" ] || exit 0
# Keep the logical path inside the tree: no leading slash, no traversal segment.
case "$LOGICAL_PATH" in
  /*|*..*) exit 0 ;;
esac

command -v git >/dev/null 2>&1 || exit 0

REPO="${CLAUDE_PROJECT_DIR:-$(pwd)}"
GIT() { git -C "$REPO" "$@"; }

# Must be inside a git work tree (or at least a repo). Bail silently otherwise.
GIT rev-parse --git-dir >/dev/null 2>&1 || exit 0

# Read the fragment and guarantee it ends with exactly one newline so NDJSON
# lines never get glued together when concatenated to the existing blob.
frag="$(cat 2>/dev/null || true)"
[ -n "$frag" ] || exit 0
case "$frag" in
  *$'\n') : ;;
  *) frag="$frag"$'\n' ;;
esac

# Repo identity slug = origin remote (owner/repo) when available, else the
# toplevel basename. This is what fork-detection and the aggregator key on.
slug=""
origin_url="$(GIT remote get-url origin 2>/dev/null || true)"
if [ -n "$origin_url" ]; then
  slug="${origin_url%.git}"
  slug="${slug#git@*:}"          # git@host:owner/repo -> owner/repo
  slug="${slug#*://*/}"          # https://host/owner/repo -> owner/repo
fi
[ -n "$slug" ] || slug="$(basename "$(GIT rev-parse --show-toplevel 2>/dev/null || echo "$REPO")")"

common_dir="$(GIT rev-parse --git-common-dir 2>/dev/null || true)"
[ -n "$common_dir" ] || exit 0
case "$common_dir" in /*) : ;; *) common_dir="$REPO/$common_dir" ;; esac
LOCK="$common_dir/telemetry-append.lock"
LOCKDIR="$LOCK.d"

tmpidx="$(mktemp 2>/dev/null)" || exit 0

# Portable advisory lock to serialize ref updates. flock(1) when available
# (Linux), else an atomic mkdir-lock — macOS ships NO flock by default, and
# without a lock the concurrent update-ref CAS would drop lines. Best-effort: if
# the lock can't be taken we skip THIS append rather than block the turn.
lock_held=""
if command -v flock >/dev/null 2>&1; then
  # flock auto-releases when the holder dies, so it can never go stale.
  if exec 9>"$LOCK" 2>/dev/null && flock -x -w 5 9 2>/dev/null; then
    lock_held="flock"
  fi
else
  # Atomic mkdir-lock (macOS ships no flock). A healthy holder releases in well
  # under a second (its trap runs); if the dir is STILL held after ~5s the holder
  # almost certainly died mid-section (SIGKILL — its trap never ran), so break it
  # once and take it. No find/stat/mtime: portable across GNU/BSD/macOS/bfs.
  # Worst case under a wrongful break is two writers in the section at once, which
  # update-ref's compare-and-swap turns into one dropped line, never corruption.
  _n=0; _got=0
  while [ "$_n" -lt 50 ]; do
    if mkdir "$LOCKDIR" 2>/dev/null; then _got=1; break; fi
    _n=$((_n + 1)); sleep 0.1
  done
  if [ "$_got" -eq 0 ]; then
    rmdir "$LOCKDIR" 2>/dev/null || rm -rf "$LOCKDIR" 2>/dev/null
    mkdir "$LOCKDIR" 2>/dev/null && _got=1
  fi
  [ "$_got" -eq 1 ] && lock_held="mkdir"
fi
[ -n "$lock_held" ] || { rm -f "$tmpidx"; exit 0; }

# Release the lock + clean the temp index on any exit (never leak either).
trap 'rm -f "$tmpidx"; [ "$lock_held" = mkdir ] && rmdir "$LOCKDIR" 2>/dev/null; [ "$lock_held" = flock ] && exec 9>&-; :' EXIT

(
  parent="$(GIT rev-parse --verify -q "$REF" 2>/dev/null || true)"

  reroot=0
  if [ -n "$parent" ]; then
    existing_slug="$(GIT show "$REF:meta/repo" 2>/dev/null | head -n1 || true)"
    if [ -n "$existing_slug" ] && [ "$existing_slug" != "$slug" ]; then
      reroot=1
    fi
  fi

  export GIT_INDEX_FILE="$tmpidx"

  existing=""
  if [ -n "$parent" ] && [ "$reroot" -eq 0 ]; then
    GIT read-tree "$REF" 2>/dev/null || GIT read-tree --empty 2>/dev/null
    existing="$(GIT show "$REF:$LOGICAL_PATH" 2>/dev/null || true)"
    # Command substitution strips the blob's trailing newline; restore it so the
    # new fragment starts on its own line (NDJSON lines must never be glued).
    [ -n "$existing" ] && existing="$existing"$'\n'
  else
    GIT read-tree --empty 2>/dev/null || exit 0
    parent=""           # fresh root commit (orphan re-root or first ever)
  fi

  newblob="$(printf '%s%s' "$existing" "$frag" | GIT hash-object -w --stdin 2>/dev/null || true)"
  [ -n "$newblob" ] || exit 0
  GIT update-index --add --cacheinfo "100644,$newblob,$LOGICAL_PATH" 2>/dev/null || exit 0

  metablob="$(printf '%s\n' "$slug" | GIT hash-object -w --stdin 2>/dev/null || true)"
  [ -n "$metablob" ] && GIT update-index --add --cacheinfo "100644,$metablob,meta/repo" 2>/dev/null || true

  tree="$(GIT write-tree 2>/dev/null || true)"
  [ -n "$tree" ] || exit 0

  if [ -n "$parent" ]; then
    commit="$(GIT commit-tree "$tree" -p "$parent" -m telemetry 2>/dev/null || true)"
  else
    commit="$(GIT commit-tree "$tree" -m telemetry 2>/dev/null || true)"
  fi
  [ -n "$commit" ] || exit 0

  if [ -n "$parent" ]; then
    GIT update-ref "$REF" "$commit" "$parent" 2>/dev/null || exit 0
  else
    GIT update-ref "$REF" "$commit" 2>/dev/null || exit 0
  fi
)

# Critical section done — release the lock now (the async push needs no lock and
# must not keep the flock fd alive in its background child).
rm -f "$tmpidx"
[ "$lock_held" = mkdir ] && rmdir "$LOCKDIR" 2>/dev/null
[ "$lock_held" = flock ] && exec 9>&-
trap - EXIT

# Best-effort async push: detach fully so it never blocks the turn, swallow all
# output, and ignore rejection (divergent remote orphan is a Fase-2 concern).
if GIT remote get-url origin >/dev/null 2>&1; then
  ( GIT push -q origin "$REF" >/dev/null 2>&1 & ) >/dev/null 2>&1 || true
fi

exit 0
