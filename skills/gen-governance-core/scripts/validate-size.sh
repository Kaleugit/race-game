#!/usr/bin/env bash
# Validates that each hook injection output stays under the Claude Code 10K
# character cap. Measures the actual hook output (file content + wrapper),
# not just the file size, because the wrapper adds ~150-300 bytes.
#
# Exit non-zero on any FAIL so this can plug into CI / pre-commit.

set -u

PROJECT_DIR="${1:-${CLAUDE_PROJECT_DIR:-$(pwd)}}"
HOOK_SCRIPT="$PROJECT_DIR/skills/gen-governance-core/hooks/inject-level.sh"
CAP=10000

if [ ! -x "$HOOK_SCRIPT" ]; then
  echo "ERROR: hook script not found: $HOOK_SCRIPT" >&2
  exit 2
fi

cd "$PROJECT_DIR" || exit 2
export CLAUDE_PROJECT_DIR="$PROJECT_DIR"

failed=0
for level in l1 l2 l3; do
  size=$(bash "$HOOK_SCRIPT" "$level" 2>/dev/null | wc -c)
  if [ "$size" -lt "$CAP" ]; then
    printf 'PASS  %s  %5d bytes  (cap %d)\n' "${level^^}" "$size" "$CAP"
  else
    printf 'FAIL  %s  %5d bytes  (cap %d) — hook output would be truncated by Claude Code\n' "${level^^}" "$size" "$CAP"
    failed=1
  fi
done

exit $failed
