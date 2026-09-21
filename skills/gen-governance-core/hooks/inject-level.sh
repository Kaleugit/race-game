#!/usr/bin/env bash
# Injects a governance level (L1/L2/L3) as a system-reminder.
# Usage: inject-level.sh <level>
#   level: l1 | l2 | l3   (case-insensitive)
#
# Output is written to stdout, which Claude Code adds to the model context.
# Static-only content here — keeps the prompt-cache prefix stable. Dynamic
# additions (timestamps, dirty alerts) live in footer.sh and are emitted
# AFTER this block to preserve cache.

set -u

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
GOV_DIR="$PROJECT_DIR/.governance"
level="$(printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]')"

case "$level" in
  l1) file="$GOV_DIR/MINI.md";     tag="governance-mini" ;;
  l2) file="$GOV_DIR/CORE.md";     tag="governance-core" ;;
  l3) file="$GOV_DIR/SUBAGENT.md"; tag="governance-subagent" ;;
  *)  exit 0 ;;
esac

[ -f "$file" ] || exit 0

if [ "$level" = "l1" ]; then
  # L1 is an attention amplifier: short imperative prose, not YAML.
  cat <<EOF
<system-reminder>
<$tag>
$(cat "$file")
</$tag>
Recency reminder of always-applicable rules. Full governance already in context
from SessionStart/PostCompact. Do NOT Read() any file in .governance/.
</system-reminder>
EOF
else
  cat <<EOF
<system-reminder>
<$tag level="${level^^}">
$(cat "$file")
</$tag>
Authoritative governance. Do NOT Read() any file in .governance/ — already injected.
Repeated injections across hooks are recency reinforcement, not new rules.
</system-reminder>
EOF
fi

exit 0
