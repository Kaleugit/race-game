#!/usr/bin/env bash
# migrate-legacy-events.sh — one-shot cleanup of OLD-design telemetry leftovers
# in a derived project's working tree.
#
# The CURRENT telemetry design writes ONLY to the orphan `telemetry` ref via
# append-to-orphan.sh (no working-tree files, ever). Projects that once ran the
# OLD design left untracked fragments under memory-system/telemetry/events.d/
# plus migration stashes (memory-system/telemetry/tel-stash-*). By design these
# are NEVER committed, so they just sit there as working-tree junk forever.
#
# For each legacy events.d fragment this script:
#   - MIGRATES it into the orphan branch (governance/<session>.ndjson) when that
#     session is NOT already present there, then removes the fragment.
#     (append-to-orphan does NOT dedup — re-appending an existing session would
#     duplicate its lines — so sessions already in the orphan are SKIPPED and
#     just removed, never re-appended.)
#   - KEEPS it (never deletes) when migration cannot be CONFIRMED in the orphan
#     (no git / append unavailable / append ran but the line did not land). A
#     kept fragment is retried on the next update-upstream sync. We never
#     blind-delete on failure: append-to-orphan always exits 0, so a transient
#     git hiccup is indistinguishable from a hard failure and a blind delete
#     would lose that session's telemetry permanently.
# events.d/ is removed only once empty; tel-stash-* scratch dirs (no recoverable
# per-session telemetry) are always removed.
#
# Idempotent: a clean repo (no events.d, no tel-stash-*) is a no-op; a repo with
# only unmigratable fragments converges to "kept" each run without data loss.
# Prints a one-line-per-action summary plus a final tally; always exits 0.

set -u

REPO="${CLAUDE_PROJECT_DIR:-$(pwd)}"
TELDIR="$REPO/memory-system/telemetry"
EVENTS="$TELDIR/events.d"
APPEND="$REPO/skills/telemetry/scripts/append-to-orphan.sh"
REF="refs/heads/telemetry"

migrated=0; skipped=0; failed=0; removed=0

orphan_has() {  # $1 = logical path inside the orphan tree; 0 iff present
  git -C "$REPO" cat-file -e "$REF:$1" 2>/dev/null
}

git_ok=0
if command -v git >/dev/null 2>&1 \
  && git -C "$REPO" rev-parse --git-dir >/dev/null 2>&1 \
  && [ -f "$APPEND" ]; then
  git_ok=1
fi

if [ -d "$EVENTS" ]; then
  for f in "$EVENTS"/*.ndjson; do
    [ -e "$f" ] || continue            # no-match glob guard
    s="$(basename "$f")"               # <session>.ndjson
    logical="governance/$s"
    # Remove a fragment ONLY once its session is confirmed in the orphan ref
    # (already-present OR just-migrated-and-verified). A fragment that could NOT
    # be confirmed there is KEPT, never deleted — append-to-orphan always exits 0
    # and a transient git hiccup is indistinguishable from a hard failure, so
    # blind-removing on failure would lose that session's telemetry permanently.
    # A kept fragment is simply retried on the next update-upstream sync.
    if [ "$git_ok" -eq 1 ] && orphan_has "$logical"; then
      echo "skip (already in orphan): $s"; skipped=$((skipped + 1))
      rm -f "$f" && removed=$((removed + 1))
    elif [ "$git_ok" -eq 1 ] \
          && CLAUDE_PROJECT_DIR="$REPO" bash "$APPEND" "$logical" < "$f" 2>/dev/null \
          && orphan_has "$logical"; then
      echo "migrated to orphan: $s"; migrated=$((migrated + 1))
      rm -f "$f" && removed=$((removed + 1))
    elif [ "$git_ok" -eq 1 ]; then
      echo "kept (migration unconfirmed — will retry next sync): $s"; failed=$((failed + 1))
    else
      echo "kept (git/append unavailable — will retry next sync): $s"; failed=$((failed + 1))
    fi
  done
fi

# Drop the events.d directory only when it is now empty (every fragment was
# migrated/skipped and removed above). If any fragment was kept for retry, the
# directory stays so the next sync can finish the job.
if [ -d "$EVENTS" ] && [ -z "$(ls -A "$EVENTS" 2>/dev/null)" ]; then
  rmdir "$EVENTS" 2>/dev/null
fi
# tel-stash-* are migration stashes with no recoverable per-session telemetry —
# always removable old-design scratch.
for d in "$TELDIR"/tel-stash-*; do
  [ -e "$d" ] || continue
  rm -rf "$d" && removed=$((removed + 1))
done

# Tally unit: migrated/skipped/failed count SESSIONS; locations_removed counts
# removed items (fragments + tel-stash scratch dirs).
echo "summary: migrated=$migrated skipped=$skipped kept_for_retry=$failed locations_removed=$removed"
exit 0
