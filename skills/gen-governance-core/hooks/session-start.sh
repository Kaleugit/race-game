#!/usr/bin/env bash
# SessionStart composite: injects L2 governance + runs the fast health check.
# Health check output is suppressed unless something fails — then the failures
# are surfaced as a system-reminder so the agent flags them to the human.

set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
SCRIPTS_DIR="$PROJECT_DIR/skills/gen-governance-core/scripts"

# Always inject L2 first.
bash "$SCRIPT_DIR/inject-level.sh" l2

# Inject project consciousness (Tier A identity + Tier B live state).
bash "$SCRIPT_DIR/project-state.sh"

# Reset the per-turn mini-injection counter so the L1 recency nudge re-lands a
# few prompts into the session rather than immediately after the full L2 boot.
: > "$PROJECT_DIR/.governance/.turn-counter" 2>/dev/null || true

# Fast health check (no --deep). If failures, surface them.
if ! check_output="$(bash "$SCRIPTS_DIR/validate-system.sh" 2>&1)"; then
  failures="$(printf '%s\n' "$check_output" | grep -E '^FAIL' || true)"
  if [ -n "$failures" ]; then
    cat <<EOF
<system-reminder>
Governance injection system health check FAILED. Open your response with
this warning so the human sees it:

---
> ⚠️ **Sistema de injeção de governança com problemas**:
> $(printf '%s\n' "$failures" | sed 's/^FAIL /> - /')
>
> Rode \`bash skills/gen-governance-core/scripts/validate-system.sh\` para detalhes.
</system-reminder>
EOF
  fi
fi

exit 0
