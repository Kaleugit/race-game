#!/usr/bin/env bash
# Idempotent updater for memory-system/tasks/<TASK-ID>.md after a PR merges.
# Called by .github/workflows/finalize-task-metadata.yml.
#
# Usage:
#   finalize-task-metadata.sh --task-id <TASK-ID> --pr <N> --merged-at <ISO8601-UTC>
#
# Exit codes:
#   0  success (including no-op cases: task file absent, nothing changed)
#   1  invalid arguments or unrecoverable error
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TASK_ID_RE='^TASK-[a-z0-9][a-z0-9-]*-(EP-[0-9]{3,}-[0-9]{2,}|[0-9]{14})$'

TASK_ID=""
PR_NUMBER=""
MERGED_AT_RAW=""

usage() {
  cat <<'USAGE'
Usage:
  finalize-task-metadata.sh --task-id <TASK-ID> --pr <N> --merged-at <ISO8601-UTC>
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --task-id)    TASK_ID="${2:-}";       shift 2 ;;
    --pr)         PR_NUMBER="${2:-}";     shift 2 ;;
    --merged-at)  MERGED_AT_RAW="${2:-}"; shift 2 ;;
    -h|--help)    usage; exit 0 ;;
    *)            echo "ERROR: unknown option '$1'"; usage; exit 1 ;;
  esac
done

if [[ -z "$TASK_ID" || -z "$PR_NUMBER" || -z "$MERGED_AT_RAW" ]]; then
  echo "ERROR: --task-id, --pr, and --merged-at are required" >&2
  usage
  exit 1
fi

if ! [[ "$TASK_ID" =~ $TASK_ID_RE ]]; then
  echo "ERROR: invalid task id format: $TASK_ID" >&2
  exit 1
fi

# Validate merged_at format upfront so callers get a clear error regardless of task-file state.
# Portable date parsing (EP-001 M4): GNU date (-d) first, BSD date (-j -f) fallback
# so the harness passes on macOS without gnubin in PATH.
MERGED_AT="$(date -u -d "$MERGED_AT_RAW" +"%Y-%m-%d %H:%M" 2>/dev/null || true)"
if [[ -z "$MERGED_AT" ]]; then
  MERGED_AT="$(date -u -j -f "%Y-%m-%dT%H:%M:%SZ" "$MERGED_AT_RAW" +"%Y-%m-%d %H:%M" 2>/dev/null || true)"
fi
if [[ -z "$MERGED_AT" ]]; then
  MERGED_AT="$(date -u -j -f "%Y-%m-%dT%H:%M:%S%z" "${MERGED_AT_RAW/Z/+0000}" +"%Y-%m-%d %H:%M" 2>/dev/null || true)"
fi
if [[ -z "$MERGED_AT" ]]; then
  echo "ERROR: could not parse --merged-at value: $MERGED_AT_RAW" >&2
  exit 1
fi
NOW="$(date -u +"%Y-%m-%d %H:%M")"

TASK_FILE="$ROOT_DIR/memory-system/tasks/$TASK_ID.md"
if [[ ! -f "$TASK_FILE" ]]; then
  echo "INFO: task file not found ($TASK_FILE) — skipping. Manual backfill path still applies."
  exit 0
fi

# Per-mode mandatory-field gate. The `validate-conventions.sh` check requires
# `Evidence` on COMPLETED Quick tasks and `Report` on COMPLETED Standard/Critical
# tasks. If the merged branch did not carry the required field, refuse to flip
# Status to COMPLETED — that would leave `main` in a state that immediately
# fails `validate-all.sh`. Manual backfill remains the documented escape hatch.
mode_line="$(grep -E '^- Execution Mode:[[:space:]]*' "$TASK_FILE" | head -n 1 || true)"
mode="$(printf '%s' "$mode_line" | sed -E 's/^- Execution Mode:[[:space:]]*([A-Za-z]+).*$/\1/')"

has_nonempty_field() {
  # Returns 0 if the named field has a non-empty value on the line.
  local field="$1"
  grep -qE "^- ${field}:[[:space:]]*[^[:space:]]" "$TASK_FILE"
}

case "$mode" in
  Quick)
    if ! has_nonempty_field 'Evidence'; then
      echo "WARN: $TASK_ID is Quick mode but 'Evidence' field is missing — refusing to mark COMPLETED. Manual backfill required."
      exit 0
    fi
    ;;
  Standard|Critical)
    if ! has_nonempty_field 'Report'; then
      echo "WARN: $TASK_ID is $mode mode but 'Report' field is missing — refusing to mark COMPLETED. Manual backfill required."
      exit 0
    fi
    ;;
  "")
    echo "WARN: $TASK_ID has no 'Execution Mode' line — refusing to mark COMPLETED. Manual backfill required."
    exit 0
    ;;
  *)
    # Unknown mode token; behave as paranoid and skip rather than create
    # a half-completed metadata block.
    echo "WARN: $TASK_ID has unrecognised Execution Mode '$mode' — refusing to mark COMPLETED. Manual backfill required."
    exit 0
    ;;
esac

# Idempotent update via awk. Pattern: replace-if-exists, append-after-anchor-if-missing.
# Anchor: the metadata block at the top of the file (lines starting with "- " before the first "## " heading).
TMP_OUT="$(mktemp)"
trap 'rm -f "$TMP_OUT"' EXIT

awk \
  -v task_id="$TASK_ID" \
  -v pr="#$PR_NUMBER" \
  -v merged_at="$MERGED_AT" \
  -v now="$NOW" '
  function emit_missing(    line) {
    if (!seen_status)        { print "- Status: COMPLETED" }
    if (!seen_last_updated)  { print "- Last Updated: " now }
    if (!seen_completed)     { print "- Completed: " merged_at }
    if (!seen_handoff)       { print "- Delivery Handoff: DONE (owner: github-actions)" }
    if (!seen_pr)            { print "- Delivery PR: " pr }
    if (!seen_status_d)      { print "- Delivery Status: MERGED" }
    if (!seen_merged_at)     { print "- Delivery Merged At: " merged_at }
  }
  BEGIN {
    seen_status = 0; seen_last_updated = 0; seen_completed = 0
    seen_handoff = 0; seen_pr = 0; seen_status_d = 0; seen_merged_at = 0
    in_meta = 1; appended = 0
  }
  {
    line = $0
    if (in_meta) {
      if (line ~ /^- Status:[[:space:]]/)               { line = "- Status: COMPLETED"; seen_status = 1 }
      else if (line ~ /^- Last Updated:[[:space:]]/)    { line = "- Last Updated: " now; seen_last_updated = 1 }
      else if (line ~ /^- Completed:[[:space:]]/)       { line = "- Completed: " merged_at; seen_completed = 1 }
      else if (line ~ /^- Delivery Handoff:[[:space:]]/){ line = "- Delivery Handoff: DONE (owner: github-actions)"; seen_handoff = 1 }
      else if (line ~ /^- Delivery PR:[[:space:]]/)     { line = "- Delivery PR: " pr; seen_pr = 1 }
      else if (line ~ /^- Delivery Status:[[:space:]]/) { line = "- Delivery Status: MERGED"; seen_status_d = 1 }
      else if (line ~ /^- Delivery Merged At:[[:space:]]/){ line = "- Delivery Merged At: " merged_at; seen_merged_at = 1 }
      else if (line ~ /^##[[:space:]]/) {
        # Exiting metadata block — append any missing fields just before the heading.
        if (!appended) { emit_missing(); appended = 1 }
        in_meta = 0
      }
    }
    print line
  }
  END {
    # File had no "## " heading after metadata — append at end.
    if (!appended) emit_missing()
  }
' "$TASK_FILE" > "$TMP_OUT"

# Detect no-op to keep CI logs clean and avoid empty commits.
if cmp -s "$TASK_FILE" "$TMP_OUT"; then
  echo "INFO: $TASK_ID metadata already final — no changes."
  exit 0
fi

mv "$TMP_OUT" "$TASK_FILE"
trap - EXIT
echo "OK: updated metadata for $TASK_ID (PR #$PR_NUMBER, merged $MERGED_AT)."
