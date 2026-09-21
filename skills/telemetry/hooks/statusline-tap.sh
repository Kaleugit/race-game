#!/usr/bin/env bash
# statusline-tap.sh — non-destructive statusLine WRAPPER that taps usage/limits
# telemetry (Fase 1b) while preserving the operator's own status line.
#
# Why the tap lives in the statusLine and not in a hook: NO hook payload carries
# token/usage/limit data (confirmed against the official Claude Code hooks
# reference). The statusLine payload is the only local, machine-readable source
# of `rate_limits` (5h / 7d used_percentage + resets_at) and per-session token
# totals for unaffiliated (non-org) accounts. See MONITORING-DESIGN.md (Plano A).
#
# Contract (DA-activation — never clobber the human's config):
#   - Reads the statusLine JSON payload from stdin EXACTLY once.
#   - Emits ONE usage sample (throttled, async, silent) to the telemetry orphan
#     branch via append-to-orphan.sh.
#   - Delegates rendering to the operator's ORIGINAL status line command, feeding
#     it the SAME stdin and printing its output UNCHANGED. The original command
#     is captured by the installer into <project>/.claude/telemetry-statusline.json
#     (key `delegate`). When there is none, a minimal default bar is printed so
#     the tap can coexist even with no pre-existing status line.
#   - Never fails the status line: any error falls back to the minimal bar.
#
# This script is SHIPPED by the boilerplate but only becomes the active
# statusLine in a DERIVED project (the installer points statusLine.command here).
# The boilerplate never points its own statusLine at this wrapper — it must not
# generate telemetry about itself.

set -u

input="$(cat 2>/dev/null || true)"

have_jq=0
command -v jq >/dev/null 2>&1 && have_jq=1

field() { [ "$have_jq" -eq 1 ] && printf '%s' "$input" | jq -r "$1 // empty" 2>/dev/null || true; }

project_dir="$(field '.workspace.project_dir')"
[ -n "$project_dir" ] || project_dir="$(field '.cwd')"
[ -n "$project_dir" ] || project_dir="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# ---- emit the usage sample (throttled, async, never blocks the bar) --------
emit_sample() {
  [ "$have_jq" -eq 1 ] || return 0

  local session; session="$(field '.session_id')"
  [ -n "$session" ] || session="unknown"
  case "$session" in *[!A-Za-z0-9._-]*|''|.|..) session="unknown" ;; esac

  # Throttle: at most one sample per session per window (default 60s) so a very
  # active session does not flood the orphan with near-identical renders.
  local throttle="${TELEMETRY_SAMPLE_THROTTLE:-60}"
  # Key the throttle mark on the FULL project path (sanitized) + session so two
  # different projects that share a basename never share a throttle window.
  local key; key="$(printf '%s' "${project_dir}-${session}" | tr -c 'A-Za-z0-9._-' '_')"
  local tmpbase="${TMPDIR:-/tmp}"; tmpbase="${tmpbase%/}"
  local mark="$tmpbase/claude-telemetry/$key.last"
  mkdir -p "$(dirname "$mark")" 2>/dev/null || true
  local now last=0
  now="$(date +%s 2>/dev/null || echo 0)"
  [ -f "$mark" ] && last="$(cat "$mark" 2>/dev/null || echo 0)"
  case "$last" in ''|*[!0-9]*) last=0 ;; esac
  if [ "$now" -gt 0 ] && [ $((now - last)) -lt "$throttle" ]; then
    return 0
  fi
  printf '%s' "$now" > "$mark" 2>/dev/null || true

  # dev identity: git committer email is the stable per-dev key the aggregator
  # rolls up account-wide limits on; fall back to the OS user.
  local dev
  dev="$(git -C "$project_dir" config user.email 2>/dev/null || true)"
  [ -n "$dev" ] || dev="${USER:-unknown}"

  local repo="" branch=""
  local origin_url; origin_url="$(git -C "$project_dir" remote get-url origin 2>/dev/null || true)"
  if [ -n "$origin_url" ]; then
    repo="${origin_url%.git}"; repo="${repo#git@*:}"; repo="${repo#*://*/}"
  fi
  [ -n "$repo" ] || repo="$(basename "$(git -C "$project_dir" rev-parse --show-toplevel 2>/dev/null || echo "$project_dir")")"
  branch="$(git -C "$project_dir" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"

  local ts; ts="$(date '+%Y-%m-%dT%H:%M:%S%z' 2>/dev/null || echo "")"

  local line
  line="$(printf '%s' "$input" | jq -c \
    --arg ts "$ts" --arg dev "$dev" --arg session "$session" \
    --arg repo "$repo" --arg branch "$branch" '
      { ts:$ts, dev:$dev, session:$session, repo:$repo, branch:$branch,
        in:  (.context_window.total_input_tokens  // null),
        out: (.context_window.total_output_tokens // null),
        ctx_pct:  (.context_window.used_percentage // null),
        h5_pct:   (.rate_limits.five_hour.used_percentage // null),
        h5_reset: (.rate_limits.five_hour.resets_at       // null),
        d7_pct:   (.rate_limits.seven_day.used_percentage // null),
        d7_reset: (.rate_limits.seven_day.resets_at       // null) }
      | with_entries(select(.value != null and .value != ""))' 2>/dev/null || true)"
  [ -n "$line" ] || return 0

  local append; append="$project_dir/skills/telemetry/scripts/append-to-orphan.sh"
  [ -f "$append" ] || return 0
  # export inside the subshell so CLAUDE_PROJECT_DIR reaches `bash "$append"`
  # (the consumer side of the pipe), not just the producing printf.
  ( export CLAUDE_PROJECT_DIR="$project_dir"; printf '%s\n' "$line" | bash "$append" "usage/$session.ndjson" >/dev/null 2>&1 & ) >/dev/null 2>&1 || true
}

emit_sample

# ---- delegate to the operator's original status line -----------------------
delegate=""
cfg="$project_dir/.claude/telemetry-statusline.json"
if [ "$have_jq" -eq 1 ] && [ -f "$cfg" ]; then
  delegate="$(jq -r '.delegate // empty' "$cfg" 2>/dev/null || true)"
fi

# Defense in depth: never delegate to ourselves (a corrupted sidecar pointing at
# this wrapper would recurse). install-hooks.sh also heals such a sidecar.
case "$delegate" in *statusline-tap.sh*) delegate="" ;; esac

if [ -n "$delegate" ]; then
  if printf '%s' "$input" | bash -c "$delegate" 2>/dev/null; then
    exit 0
  fi
fi

# Minimal default bar (no original status line, or it failed). Keep it cheap.
repo_lbl="$(basename "$project_dir")"
ctx="$(field '.context_window.used_percentage')"
# Show the integer part only, via parameter expansion — NO printf float, which
# would write "invalid number" to stderr on a malformed value like "12.5.6" or
# "1e9" (violates "never fails the status line"). Drop the fractional part, then
# accept only an all-digits remainder.
ctx="${ctx%%.*}"
case "$ctx" in ''|*[!0-9]*) ctx="" ;; esac
if [ -n "$ctx" ]; then
  printf '%s | ctx %s%%' "$repo_lbl" "$ctx"
else
  printf '%s' "$repo_lbl"
fi
exit 0
