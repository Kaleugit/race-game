#!/usr/bin/env bash
# UserPromptSubmit composite.
#
# The L1 governance mini is a recency nudge. Injecting it on EVERY turn bloats
# the conversation history (each copy persists and is re-read at cache-read cost,
# pushing the session toward compaction sooner — the very degradation it fights).
# So the mini is GATED: it re-lands only every N user prompts (CLAUDE_GOV_MINI_EVERY,
# default 5), counted in .governance/.turn-counter (reset at SessionStart).
#
# The dynamic footer (timestamp + dirty alert) still runs EVERY turn — the harness
# relies on it for the closing block and the staleness alert.
#
# The context guard (context-guard.sh) also runs EVERY turn: it warns and steers
# toward a handoff once context usage crosses its thresholds. It needs the session
# transcript_path, which Claude Code passes in the UserPromptSubmit JSON payload on
# stdin (RTFM: usage % is not in the payload; it is derived from the transcript).
#
# Order matters for the Anthropic prompt cache and for the harness: the static
# mini (when emitted) goes first, then the context guard, and the per-turn footer
# LAST (the harness keys the closing block off the footer).

set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
COUNTER="$PROJECT_DIR/.governance/.turn-counter"
N="${CLAUDE_GOV_MINI_EVERY:-5}"

# Capture the hook payload once; extract transcript_path for the context guard.
payload="$(cat 2>/dev/null || true)"
transcript=""
if [ -n "$payload" ]; then
  transcript="$(printf '%s' "$payload" | jq -r '.transcript_path // empty' 2>/dev/null || true)"
fi

mkdir -p "$(dirname "$COUNTER")" 2>/dev/null || true

c=0
[ -f "$COUNTER" ] && c="$(cat "$COUNTER" 2>/dev/null || echo 0)"
case "$c" in ''|*[!0-9]*) c=0 ;; esac
c=$((c + 1))

if [ "$c" -ge "$N" ]; then
  bash "$SCRIPT_DIR/inject-level.sh" l1
  bash "$SCRIPT_DIR/inject-operator.sh"
  c=0
fi
printf '%s' "$c" > "$COUNTER" 2>/dev/null || true

bash "$SCRIPT_DIR/context-guard.sh" "$transcript"

bash "$SCRIPT_DIR/footer.sh"

exit 0
