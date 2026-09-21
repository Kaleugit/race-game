#!/usr/bin/env bash
# context-meter.sh — echoes the current context-window usage as an integer
# percentage (0-100), or nothing when it cannot be determined.
#
# Hybrid measurement (RTFM: Claude Code exposes context usage ONLY to the
# statusLine command, never to hooks; hooks receive transcript_path on stdin):
#
#   1. AUTHORITATIVE — read .governance/.context-pct, the integer percentage that
#      an opt-in statusLine snippet writes on each refresh (see
#      docs/statusline-optional.md). Used only while FRESH (mtime within TTL).
#   2. FALLBACK — parse the session transcript (arg $1 = transcript_path) and
#      compute total_in_context / window from the most recent message `usage`
#      object. The transcript schema is undocumented but stable; this is fail-open.
#
# Fail-open: any parsing/availability problem prints nothing and exits 0, so the
# caller simply stays silent rather than ever blocking a turn.
#
# Window size: the transcript records the base model id (e.g. "claude-opus-4-8")
# WITHOUT the [1m] marker, so the window cannot be inferred from the transcript.
# The fallback therefore DEFAULTS TO 1M (the tier the operator runs); set
# CLAUDE_GOV_CTX_WINDOW=200000 for a 200k model, or enable the statusLine writer
# (leg 1) for the exact official percentage. Precedence:
#   CLAUDE_GOV_CTX_WINDOW (explicit override) > 1M default.
#
# Usage: context-meter.sh [<transcript_path>]
# Env:   CLAUDE_PROJECT_DIR, CLAUDE_GOV_CTX_PCT_TTL (default 60),
#        CLAUDE_GOV_CTX_WINDOW (override window size in tokens)

set -u

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
PCT_FILE="$PROJECT_DIR/.governance/.context-pct"
TTL="${CLAUDE_GOV_CTX_PCT_TTL:-60}"
TRANSCRIPT="${1:-}"

mtime_of() { # $1=path -> epoch seconds, or 0
  stat -c %Y "$1" 2>/dev/null || stat -f %m "$1" 2>/dev/null || echo 0
}

# --- 1. Authoritative: fresh statusLine-written percentage -----------------
if [ -f "$PCT_FILE" ]; then
  now="$(date +%s 2>/dev/null || echo 0)"
  mtime="$(mtime_of "$PCT_FILE")"
  age=$(( now - mtime ))
  if [ "$age" -ge 0 ] && [ "$age" -le "$TTL" ]; then
    pct="$(tr -dc '0-9' < "$PCT_FILE" 2>/dev/null | head -c 3)"
    if [ -n "$pct" ]; then
      echo "$pct"
      exit 0
    fi
  fi
fi

# --- 2. Fallback: parse the transcript -------------------------------------
[ -n "$TRANSCRIPT" ] && [ -f "$TRANSCRIPT" ] || exit 0

# Most recent line carrying a usage object (tac -> first match is the last line).
line="$(tac "$TRANSCRIPT" 2>/dev/null | grep -m1 '"usage"' || true)"
[ -z "$line" ] && exit 0

# input + cache_creation + cache_read = tokens currently resident in context
# (matches the maintainer's statusLine ctx_total). One jq pass, fail-open.
read -r inp cc cr <<EOF
$(printf '%s' "$line" | jq -r '
  (.message.usage // .usage) as $u
  | [ ($u.input_tokens // 0),
      ($u.cache_creation_input_tokens // 0),
      ($u.cache_read_input_tokens // 0) ]
  | @tsv' 2>/dev/null)
EOF
case "${inp:-}${cc:-}${cr:-}" in ''|*[!0-9]*) exit 0 ;; esac
total=$(( inp + cc + cr ))
[ "$total" -gt 0 ] || exit 0

# Default window = 1M. The operator runs the 1M Opus/Sonnet tier, and the
# transcript strips the [1m] marker (RTFM) so 200k cannot be distinguished from
# the model id here — defaulting to 200k caused false warnings in the 150k-200k
# band. Operators on a 200k model set CLAUDE_GOV_CTX_WINDOW=200000, or enable the
# statusLine writer (leg 1 above) for the exact official percentage at runtime.
window="${CLAUDE_GOV_CTX_WINDOW:-1000000}"
[ "$window" -gt 0 ] || exit 0

echo $(( total * 100 / window ))
exit 0
