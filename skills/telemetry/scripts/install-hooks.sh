#!/usr/bin/env bash
# install-hooks.sh — idempotently activate the inherited telemetry capture in a
# project: the governance-stream hooks, the SessionStart runtime guard, and the
# non-destructive statusLine usage tap. One source of the wiring logic (DRY).
#
# Consumers:
#   - skills/bootstrap: activate telemetry in a NEW derived project.
#   - /update-upstream: re-assure it in an existing derived project.
#   - skills/telemetry/hooks/session-guard.sh tells the operator to run it.
#   - a human, manually.
#
# The BOILERPLATE itself must never run this — telemetry is a derived-project
# feature and the boilerplate must not generate telemetry about itself.
#
# Fully idempotent and self-healing: each concern (hooks / statusLine) is wired
# only if missing, so re-running reconverges without duplication or damage and
# repairs whichever half fell off. Never clobbers the operator's config: the
# existing status line is captured as a delegate and called from inside the
# wrapper.
#
# Usage: install-hooks.sh [<settings.json path>]   (default: .claude/settings.json)

set -u
command -v jq >/dev/null 2>&1 || { echo "ERROR: jq required"; exit 1; }

SETTINGS="${1:-.claude/settings.json}"
DIR="$(dirname "$SETTINGS")"
SIDECAR="$DIR/telemetry-statusline.json"

REC='bash "$CLAUDE_PROJECT_DIR/skills/telemetry/hooks/record-event.sh"'
DRIFT='bash "$CLAUDE_PROJECT_DIR/skills/telemetry/hooks/drift-guard.sh"'
GUARD='bash "$CLAUDE_PROJECT_DIR/skills/telemetry/hooks/session-guard.sh"'
WRAPPER='bash "$CLAUDE_PROJECT_DIR/skills/telemetry/hooks/statusline-tap.sh"'

mkdir -p "$DIR" 2>/dev/null || true
[ -f "$SETTINGS" ] || printf '{\n  "hooks": {}\n}\n' > "$SETTINGS"
jq -e . "$SETTINGS" >/dev/null 2>&1 || { echo "ERROR: $SETTINGS is not valid JSON"; exit 1; }

# --- 1. governance-stream hooks + SessionStart runtime guard ----------------
if grep -q 'skills/telemetry/hooks/record-event.sh' "$SETTINGS" 2>/dev/null; then
  echo "telemetry hooks already wired in $SETTINGS — no change"
else
  tmp="$(mktemp)"
  jq \
    --arg rec_ss   "$REC session_start" \
    --arg guard    "$GUARD" \
    --arg rec_pr   "$REC prompt" \
    --arg drift    "$DRIFT" \
    --arg rec_tool "$REC tool" \
    --arg rec_se   "$REC session_end" \
    '
    .hooks //= {}
    | .hooks.SessionStart     = ((.hooks.SessionStart // []) + [ {hooks:[ {type:"command", command:$rec_ss}, {type:"command", command:$guard} ]} ])
    | .hooks.UserPromptSubmit = ([ {hooks:[ {type:"command", command:$rec_pr}, {type:"command", command:$drift} ]} ] + (.hooks.UserPromptSubmit // []))
    | .hooks.PreToolUse       = ((.hooks.PreToolUse // []) + [ {matcher:"Task|Agent|Skill", hooks:[ {type:"command", command:$rec_tool} ]} ])
    | .hooks.SessionEnd       = ((.hooks.SessionEnd // []) + [ {hooks:[ {type:"command", command:$rec_se} ]} ])
    ' "$SETTINGS" > "$tmp" || { echo "ERROR: jq merge failed"; rm -f "$tmp"; exit 1; }
  mv "$tmp" "$SETTINGS"
  echo "telemetry hooks wired into $SETTINGS"
fi

# Ensure the SessionStart runtime guard is present even when the governance hooks
# were wired by an OLDER installer that predates session-guard (the block above
# short-circuits on the existing record-event wiring). Idempotent and independent
# so any prior state reconverges — the zero-toil "completely configured" promise.
if ! grep -q 'skills/telemetry/hooks/session-guard.sh' "$SETTINGS" 2>/dev/null; then
  tmp="$(mktemp)"
  jq --arg guard "$GUARD" '
    .hooks //= {}
    | .hooks.SessionStart = ((.hooks.SessionStart // []) + [ {hooks:[ {type:"command", command:$guard} ]} ])
    ' "$SETTINGS" > "$tmp" && mv "$tmp" "$SETTINGS" \
    && echo "SessionStart runtime guard wired into $SETTINGS" || rm -f "$tmp"
fi

# --- 2. non-destructive statusLine usage tap --------------------------------
# Capture whatever status line is in effect now (project, else the global
# ~/.claude one) as the delegate so the wrapper renders it unchanged. Never
# capture the wrapper itself (would recurse). The capture logic is shared with
# session-guard.sh (DRY) in capture-delegate.sh.
capture_delegate() {
  bash "$(dirname "$0")/capture-delegate.sh" "$SETTINGS" "$SIDECAR"
}

cur="$(jq -r '.statusLine.command // empty' "$SETTINGS" 2>/dev/null || true)"
case "$cur" in
  *statusline-tap.sh*)
    echo "statusLine tap already wired in $SETTINGS — no change"
    # Self-heal the per-machine delegate sidecar: recapture if it is missing
    # (fresh clone) OR corrupted into a self-reference (delegate -> the wrapper
    # itself, e.g. captured by an older installer), so re-running reconverges.
    if [ ! -f "$SIDECAR" ] || grep -q 'statusline-tap.sh' "$SIDECAR" 2>/dev/null; then
      d="$(capture_delegate)"; echo "captured/healed statusLine delegate -> $SIDECAR (${d:-none})"
    fi
    ;;
  *)
    d="$(capture_delegate)"
    tmp="$(mktemp)"
    jq --arg w "$WRAPPER" '.statusLine = ((.statusLine // {}) + {type:"command", command:$w})' "$SETTINGS" > "$tmp" \
      || { echo "ERROR: jq statusLine merge failed"; rm -f "$tmp"; exit 1; }
    mv "$tmp" "$SETTINGS"
    echo "statusLine tap wired into $SETTINGS (delegate: ${d:-none -> minimal bar})"
    ;;
esac

# --- 3. keep the per-machine delegate sidecar out of git --------------------
# It can hold a machine-specific (absolute) command and must not be committed.
root="$(git -C "$DIR" rev-parse --show-toplevel 2>/dev/null || true)"
if [ -n "$root" ]; then
  # canonicalize before prefix-stripping: on macOS mktemp/cwd paths can be
  # symlinked (/var -> /private/var) while show-toplevel returns the real path.
  # On Git Bash show-toplevel returns C:/... while pwd -P returns /c/..., so
  # canonicalize the root the same way or the strip fails (absolute path leaks).
  root="$(cd "$root" 2>/dev/null && pwd -P)"
  sidecar_canon="$(cd "$(dirname "$SIDECAR")" 2>/dev/null && pwd -P)/$(basename "$SIDECAR")"
  rel="${sidecar_canon#"$root"/}"
  gi="$root/.gitignore"
  if ! { [ -f "$gi" ] && grep -qxF "$rel" "$gi"; }; then
    printf '%s\n' "$rel" >> "$gi"
    echo "ignored per-machine sidecar in .gitignore: $rel"
  fi
fi

exit 0
