#!/usr/bin/env bash
# check-delivery-fastpath.sh
#
# Decides whether a delivery RE-validation may take the light path — inheriting
# the semantic verdict recorded in an existing delivery-validation note instead
# of re-deriving it from scratch.
#
# This is sound only when the code that was already validated is byte-identical
# and only documentation moved since then: the semantic gate validated the code,
# the code did not change, so the prior verdict still holds and the doc delta
# gets its own cheap deterministic checks (validate-all.sh + completion preflight).
#
# Eligibility (all must hold):
#   1. The note records a resolvable `Validated commit: <sha>` baseline.
#   2. Every path changed between that baseline and the target ref is
#      documentation-only (same classification as validate-docs-only-scope.sh).
#   3. No changed path is boilerplate-protected (architect review still required
#      for those, even when the file itself is documentation, e.g. AGENTS.md).
#
# Exit codes:
#   0  fast-path ELIGIBLE  -> semantic verdict may be inherited
#   1  NOT eligible        -> run the full semantic ceremony (and architect
#                            review if a protected path changed)
#   2  cannot determine    -> no usable baseline; run the full ceremony
#
# Usage:
#   check-delivery-fastpath.sh --note <validation-note-path> [--to <ref>]
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROTECTED_PATHS_FILE="$ROOT_DIR/skills/delivery/references/protected-boilerplate-paths.txt"
NOTE=""
TO_REF="HEAD"

usage() {
  cat <<'USAGE'
Usage:
  check-delivery-fastpath.sh --note <validation-note-path> [--to <ref>]

Decides if a delivery re-validation can inherit the prior semantic verdict
(docs-only delta vs the note's `Validated commit`, no protected path).
Exit 0 = eligible, 1 = full ceremony, 2 = no baseline (full ceremony).
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --note) NOTE="${2:-}"; shift 2 ;;
    --to)   TO_REF="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "ERROR: unknown option '$1'"; usage; exit 2 ;;
  esac
done

if [[ -z "$NOTE" ]]; then
  echo "ERROR: --note is required"; usage; exit 2
fi
if [[ ! -f "$NOTE" ]]; then
  echo "ERROR: validation note not found: $NOTE"; exit 2
fi

# Same documentation-only classification as scripts/validate-docs-only-scope.sh.
is_docs_only_path() {
  local path="$1"
  case "$path" in
    *.md|docs/*|memory-system/*|boilerplate-docs/*|.claude/agents/*) return 0 ;;
  esac
  [[ "$path" =~ ^skills/[^/]+/references/ ]] && return 0
  return 1
}

# Same glob semantics as deliver-to-main.sh, reading the canonical patterns file
# as the single source of truth for which paths are boilerplate-protected.
PROTECTED_PATTERNS=()
load_protected_patterns() {
  [[ -f "$PROTECTED_PATHS_FILE" ]] || { echo "ERROR: protected paths file not found: $PROTECTED_PATHS_FILE"; exit 2; }
  local line
  while IFS= read -r line; do
    line="$(echo "$line" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')"
    [[ -z "$line" || "$line" == \#* ]] && continue
    PROTECTED_PATTERNS+=("$line")
  done < "$PROTECTED_PATHS_FILE"
}
is_protected_path() {
  local path="$1" pattern
  for pattern in "${PROTECTED_PATTERNS[@]}"; do
    # shellcheck disable=SC2053
    [[ "$path" == $pattern ]] && return 0
  done
  return 1
}

# 1. Resolve the baseline from the note.
baseline="$(grep -m1 -E '^- Validated commit:' "$NOTE" | sed -E 's/^- Validated commit:[[:space:]]*//' | tr -d '[:space:]' || true)"
if [[ -z "$baseline" || "$baseline" == "<sha>" ]]; then
  echo "NO-BASELINE: note has no resolvable 'Validated commit' -> full ceremony."
  exit 2
fi
if ! git -C "$ROOT_DIR" cat-file -e "${baseline}^{commit}" 2>/dev/null; then
  echo "NO-BASELINE: 'Validated commit' ${baseline} is not a known commit -> full ceremony."
  exit 2
fi

# 2/3. Classify the delta vs the baseline.
changed="$(git -C "$ROOT_DIR" diff --name-only "${baseline}..${TO_REF}")"
if [[ -z "$changed" ]]; then
  echo "ELIGIBLE: no changes since validated baseline ${baseline} -> inherit semantic verdict."
  exit 0
fi

load_protected_patterns
non_docs=""
protected=""
while IFS= read -r path; do
  [[ -z "$path" ]] && continue
  is_docs_only_path "$path" || non_docs+="  ${path}"$'\n'
  is_protected_path "$path" && protected+="  ${path}"$'\n'
done <<< "$changed"

if [[ -n "$non_docs" ]]; then
  echo "NOT-ELIGIBLE: non-documentation files changed since baseline ${baseline} -> full ceremony:"
  printf '%s' "$non_docs"
  exit 1
fi
if [[ -n "$protected" ]]; then
  echo "NOT-ELIGIBLE: protected boilerplate paths changed since baseline ${baseline} -> architect review required:"
  printf '%s' "$protected"
  exit 1
fi

echo "ELIGIBLE: docs-only delta vs baseline ${baseline} (no protected paths) -> inherit semantic verdict."
exit 0
