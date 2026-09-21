#!/usr/bin/env bash
# record-event.sh — append one governance/workflow telemetry event (NDJSON) per
# hook invocation, routed to the per-repo `telemetry` orphan branch (Fase 1c).
#
# Wired into .claude/settings.json on several hook events. Reads the hook payload
# JSON on stdin (RTFM: Claude Code pipes the event payload to each command hook).
# Emits NOTHING to stdout (so it never disturbs the UserPromptSubmit cache prefix
# or the governance footer) and ALWAYS exits 0 (never blocks a turn).
#
# Usage: record-event.sh <category>
#   <category> is a coarse label from the wiring (session_start|prompt|tool|
#   session_end). The fine event name comes from the payload's hook_event_name.
#
# Output: the line is appended to refs/heads/telemetry at
#   governance/<session_id>.ndjson
# via skills/telemetry/scripts/append-to-orphan.sh — git plumbing, no working
# tree / HEAD / index touched, so the stream never pollutes main (no untracked,
# no diff, no PR/CI noise). This replaces the old design that wrote events.d/
# fragments onto main.
#
# THIN by design: `detail` carries a SHORT semantic snippet (intent / descriptor),
# not the old 4000-char firehose. Outcomes are NOT stored here — the aggregator
# reads those from git (commits/PRs) and the transcript (DRY).
#
# NO cost/token fields: no hook payload carries usage or cost (confirmed against
# the official Claude Code hooks reference). The usage tap lives in the statusLine
# (statusline-tap.sh); the aggregator derives precise cost later from the
# transcript or OTel — not here.

set -u

CATEGORY="${1:-event}"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
# Max length of the semantic `detail` snippet — short by design (thin telemetry).
DETAIL_MAX="${TELEMETRY_DETAIL_MAX:-280}"

payload="$(cat 2>/dev/null || true)"

# jq required; if absent, fail silent (telemetry must never break a turn).
command -v jq >/dev/null 2>&1 || exit 0

field() { printf '%s' "$payload" | jq -r "$1 // empty" 2>/dev/null || true; }

session="$(field '.session_id')"
[ -n "$session" ] || session="unknown"
# session_id is used as a PATH component in the orphan tree; never let a crafted
# value escape governance/ (path traversal). Collapse anything that is not a safe
# basename to "unknown". Real Claude Code session ids are UUIDs (safe).
case "$session" in *[!A-Za-z0-9._-]*|''|.|..) session="unknown" ;; esac
cwd="$(field '.cwd')"
[ -n "$cwd" ] || cwd="$PROJECT_DIR"
hook_event="$(field '.hook_event_name')"
tool_name="$(field '.tool_name')"
source_field="$(field '.source')"
[ -n "$source_field" ] || source_field="$(field '.reason')"   # SessionEnd carries .reason
agent_type_payload="$(field '.agent_type')"

# repo identity slug (origin owner/repo, else toplevel basename) + branch — same
# key the statusLine tap and the aggregator use, so usage and governance streams
# share one repo identity.
repo=""
origin_url="$(git -C "$cwd" remote get-url origin 2>/dev/null || true)"
if [ -n "$origin_url" ]; then
  repo="${origin_url%.git}"; repo="${repo#git@*:}"; repo="${repo#*://*/}"
fi
[ -n "$repo" ] || repo="$(basename "$(git -C "$cwd" rev-parse --show-toplevel 2>/dev/null || echo "$cwd")")"
branch="$(git -C "$cwd" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"

# Resolve actor/name from the tool, for tool events. For non-tool categories
# (prompt/session_start/session_end) tool_name is empty: leave actor empty so it
# is dropped from the line — `category` already carries that meaning (no DRY dup).
# The `?*` branch fires only if the PreToolUse matcher in settings.json is later
# broadened beyond Task|Agent|Skill.
actor=""
name=""
case "$tool_name" in
  Skill)       actor="skill"; name="$(field '.tool_input.skill')" ;;
  Task|Agent)  actor="agent"; name="$(field '.tool_input.subagent_type')"
               [ -n "$name" ] || name="$(field '.tool_input.subagentType')" ;;
  ?*)          actor="tool";  name="$tool_name" ;;
esac
# subagent context (present only when the event fires inside a subagent)
[ -n "$agent_type_payload" ] && [ -z "$name" ] && name="$agent_type_payload"

# Semantic payload (SHORT): WHAT the human asked, or WHAT a dispatched agent/skill
# was told to do — the signal the Fase 3 semantic monitor needs; capturing only
# `name` is too thin. Capped to DETAIL_MAX (not the old 4000) and whitespace is
# collapsed so each line stays a tight one-liner.
detail=""
[ "$CATEGORY" = "prompt" ] && detail="$(field '.prompt')"
case "$tool_name" in
  Task|Agent)  detail="$(field '.tool_input.description')" ;;  # short task descriptor
  Skill)       detail="$(field '.tool_input.args')" ;;
esac

ts="$(date '+%Y-%m-%dT%H:%M:%S%z')"

# Build the line with jq so every value is correctly escaped (never hand-roll JSON).
# Collapse internal whitespace and cap detail to keep the stream thin. Drop empty
# fields to keep lines lean.
line="$(jq -nc \
  --arg ts "$ts" \
  --arg session "$session" \
  --arg repo "$repo" \
  --arg branch "$branch" \
  --arg category "$CATEGORY" \
  --arg event "${hook_event:-$CATEGORY}" \
  --arg actor "$actor" \
  --arg name "$name" \
  --arg source "$source_field" \
  --arg detail "$detail" \
  --argjson max "$DETAIL_MAX" \
  '{ts:$ts, session:$session, repo:$repo, branch:$branch, category:$category, event:$event, actor:$actor, name:$name, source:$source, detail:(($detail | gsub("\\s+";" ") | .[0:$max]))} | with_entries(select(.value != ""))' \
  2>/dev/null || true)"

[ -n "$line" ] || exit 0

# Route to the telemetry orphan branch (git plumbing; never touches main).
APPEND="$PROJECT_DIR/skills/telemetry/scripts/append-to-orphan.sh"
[ -f "$APPEND" ] || exit 0
CLAUDE_PROJECT_DIR="$PROJECT_DIR" printf '%s\n' "$line" | CLAUDE_PROJECT_DIR="$PROJECT_DIR" bash "$APPEND" "governance/$session.ndjson" >/dev/null 2>&1

exit 0
