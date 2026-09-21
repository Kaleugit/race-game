#!/usr/bin/env bash
# capture-delegate.sh — capture the operator's effective status line command and
# write it as the `delegate` into the per-machine telemetry sidecar, so the
# non-destructive statusline-tap wrapper renders it unchanged. Never captures the
# wrapper itself (that would recurse).
#
# Single source of this logic (DRY): used by both
#   - install-hooks.sh        (activation / re-assure)
#   - hooks/session-guard.sh  (SessionStart self-heal of a missing/corrupt sidecar)
#
# Capture order mirrors the wrapper's effective-config resolution: prefer the
# given settings.json's statusLine, else fall back to the global
# ~/.claude/settings.json. In the #63 case the versioned project settings.json
# already points at the wrapper, so the self-reference guard skips it and the
# operator's REAL (global) status line is recovered from ~/.claude.
#
# Usage: capture-delegate.sh <settings.json path> <sidecar path>
# Prints the captured delegate (empty => the wrapper renders its minimal bar).
# Requires jq; exits non-zero if jq is missing or the sidecar write fails.

set -u

SETTINGS="${1:?settings path required}"
SIDECAR="${2:?sidecar path required}"

command -v jq >/dev/null 2>&1 || exit 1

d="$(jq -r '.statusLine.command // empty' "$SETTINGS" 2>/dev/null || true)"
case "$d" in *statusline-tap.sh*) d="" ;; esac
if [ -z "$d" ] && [ -f "$HOME/.claude/settings.json" ]; then
  d="$(jq -r '.statusLine.command // empty' "$HOME/.claude/settings.json" 2>/dev/null || true)"
  case "$d" in *statusline-tap.sh*) d="" ;; esac
fi

jq -n --arg d "$d" '{delegate:$d}' > "$SIDECAR" || exit 1
printf '%s' "$d"
