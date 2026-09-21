#!/usr/bin/env bash
# Emits the downstream operator's free-form notes verbatim as a system-reminder,
# IF .governance/OPERATOR.md has any non-comment, non-blank content.
#
# The boilerplate ships OPERATOR.md blank (header comment only), so this is
# silent until an operator fills it. Called from project-state.sh (SessionStart /
# PostCompact) and from user-prompt.sh on the gated turn (every N prompts).

set -u

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
f="$PROJECT_DIR/.governance/OPERATOR.md"

[ -s "$f" ] || exit 0
body="$(grep -v '^<!--' "$f")"
[ -z "$(printf '%s' "$body" | tr -d '[:space:]')" ] && exit 0

cat <<EOF
<system-reminder>
<operator-notes>
$body
</operator-notes>
Operator-provided context for this deployment. Not from upstream governance.
</system-reminder>
EOF

exit 0
