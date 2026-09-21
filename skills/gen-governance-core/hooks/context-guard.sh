#!/usr/bin/env bash
# context-guard.sh — per-turn context-exhaustion guard.
#
# Reads the current context usage via scripts/context-meter.sh and, when usage
# crosses thresholds, injects an escalating system-reminder that steers the
# session toward a clean close and (at the critical threshold) a handoff document
# the operator can resume from in a fresh session.
#
#   >= WARN (default 75%)  -> warning: start winding down, no large new work.
#   >= CRIT (default 85%)  -> critical: if no handoff doc exists, ASK the operator
#                             to generate one; if it exists, UPDATE it this turn.
#
# The presence of memory-system/handoff/HANDOFF-<session>.md is itself the
# "approved / update-mode" marker — no extra state file.
#
# Called by user-prompt.sh with the session transcript_path as $1 (also used to
# derive the session id). Emitted BEFORE footer.sh so the footer stays last.
# Exit code is always 0 so the hook never blocks; silent below WARN.
#
# Env: CLAUDE_GOV_CTX_WARN (default 75), CLAUDE_GOV_CTX_CRIT (default 85).

set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
TRANSCRIPT="${1:-}"
WARN="${CLAUDE_GOV_CTX_WARN:-75}"
CRIT="${CLAUDE_GOV_CTX_CRIT:-85}"

pct="$(bash "$PROJECT_DIR/scripts/context-meter.sh" "$TRANSCRIPT" 2>/dev/null || true)"
case "$pct" in ''|*[!0-9]*) exit 0 ;; esac
[ "$pct" -ge "$WARN" ] || exit 0

# Derive session id + handoff path (transcript basename == session UUID).
sid=""
[ -n "$TRANSCRIPT" ] && sid="$(basename "$TRANSCRIPT" .jsonl 2>/dev/null || true)"
[ -n "$sid" ] || sid="current"
handoff_rel="memory-system/handoff/HANDOFF-${sid}.md"
handoff_abs="$PROJECT_DIR/$handoff_rel"

if [ "$pct" -ge "$CRIT" ]; then
  if [ -f "$handoff_abs" ]; then
    cat <<EOF
<system-reminder>
<context-guard level="critical" usage="${pct}%">
Context usage is at ${pct}% (critical threshold ${CRIT}%). A handoff document already exists at ${handoff_rel}.
UPDATE it now to reflect the latest state (current state, next steps, files touched, open decisions, how to resume) and keep updating it EVERY turn. Steer the session to a clean close so the operator can resume from a fresh context. Do not start new large work.
</context-guard>
</system-reminder>
EOF
  else
    cat <<EOF
<system-reminder>
<context-guard level="critical" usage="${pct}%">
Context usage is at ${pct}% (critical threshold ${CRIT}%). The session is approaching its limit. Act now, in order:
1. Stop starting new work; bring the current unit of work to a safe stopping point.
2. No handoff document exists yet. ASK THE OPERATOR (in the project language) whether to generate it now at ${handoff_rel}. Do NOT generate it without explicit approval.
3. Once approved, write it from the template below, then keep it updated EVERY turn until the session ends.

Handoff template (write to ${handoff_rel}; English section headers, body in the project language):
# Handoff — <task / objective>
- Session: ${sid}
- Generated: <YYYY-MM-DD HH:MM TZ>
## Objective
## Current state (done / verified, with evidence)
## Next steps (ordered, actionable)
## Files touched / branch / worktree
## Open decisions & blockers
## How to resume (exact branch, command, and context to reload)
</context-guard>
</system-reminder>
EOF
  fi
else
  cat <<EOF
<system-reminder>
<context-guard level="warning" usage="${pct}%">
Context usage is at ${pct}% (warning threshold ${WARN}%). Start winding down: finish the current unit of work, avoid starting large new tasks, and prefer concise actions. At ${CRIT}% a session handoff document will be offered.
</context-guard>
</system-reminder>
EOF
fi

exit 0
