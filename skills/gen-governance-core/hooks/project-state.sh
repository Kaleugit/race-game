#!/usr/bin/env bash
# Injects project consciousness as system-reminders at SessionStart / PostCompact.
#
#   <project-identity>  Tier A — static, hand-maintained identity card
#                       (memory-system/project-identity.md). Stable; rarely changes.
#   <project-state>     Tier B — live state grepped from memory-system at boot:
#                       bootstrap gate, in-progress tasks, epics, latest session-log
#                       fragment, open workstreams, open tech-debt.
#
# DESCRIPTIVE ONLY — never prescriptive. Tells the agent WHERE it is, not WHAT to do.
# Runs at boundary events only (session start, post-compaction), never per-turn, so
# it never accumulates copies in the conversation history.
#
# Exit code is always 0 so the hook never blocks. Every source is optional.

set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
MS="$PROJECT_DIR/memory-system"

# --- Tier A: identity card (static) ---------------------------------------
identity_file="$PROJECT_DIR/.governance/IDENTITY.md"
if [ -s "$identity_file" ]; then
  identity_body="$(grep -v '^<!--' "$identity_file")"
  if [ -n "$identity_body" ]; then
    cat <<EOF
<system-reminder>
<project-identity>
$identity_body
</project-identity>
Background context: who/what this project is. Not an instruction.
</system-reminder>
EOF
  fi
fi

# --- Tier B: live state (grepped) -----------------------------------------
tasks_file="$MS/2-tasks.md"
gate="$(grep -m1 -E 'Current Status:' "$tasks_file" 2>/dev/null | sed -E 's/.*Current Status:[[:space:]]*`?([A-Za-z_]+)`?.*/\1/')"
[ -z "$gate" ] && gate="unknown"

inprog=""
for f in "$MS"/tasks/TASK-*.md; do
  [ -f "$f" ] || continue
  st="$(grep -m1 -iE '^[[:space:]]*[-*]?[[:space:]]*\**Status\**[[:space:]]*:' "$f" 2>/dev/null | sed -E 's/.*://; s/[`* ]//g')"
  case "$st" in
    COMPLETED|COMPLETE|DONE|"") ;;
    *)
      br="$(grep -m1 -iE 'Branch[[:space:]]*:' "$f" 2>/dev/null | sed -E 's/.*://; s/^[[:space:]]*//; s/[`]//g')"
      inprog="${inprog}
  - $(basename "$f" .md) [${st}]${br:+ branch=$br}"
      ;;
  esac
done
[ -z "$inprog" ] && inprog="
  (none)"

if [ -f "$PROJECT_DIR/docs/EPICOS.md" ]; then epics="present"; else epics="absent"; fi

last_log="$(ls -1t "$MS"/session-log.d/*.md 2>/dev/null | head -1)"
if [ -n "$last_log" ]; then last_log="$(basename "$last_log")"; else last_log="(none)"; fi

ws=""
for d in "$MS"/workstreams/*/; do
  [ -d "$d" ] || continue
  cnt="$(find "$d" -path '*notes.d*' -name '*.md' 2>/dev/null | wc -l | tr -d ' ')"
  if [ "${cnt:-0}" -gt 0 ] 2>/dev/null; then ws="${ws} $(basename "$d")"; fi
done
[ -z "$ws" ] && ws=" (none)"

td="$(grep -ciE '\|[[:space:]]*open[[:space:]]*\|' "$MS/tech-debt.md" 2>/dev/null)"
case "$td" in ''|*[!0-9]*) td=0 ;; esac

# Most recent session handoff document, if any. Written by the context guard when
# a prior session approached its context limit; reading it lets this fresh session
# resume from where the previous one left off.
handoff="$(ls -1t "$MS"/handoff/HANDOFF-*.md 2>/dev/null | head -1)"
if [ -n "$handoff" ]; then handoff="memory-system/handoff/$(basename "$handoff")"; else handoff="(none)"; fi

cat <<EOF
<system-reminder>
<project-state>
BOOTSTRAP GATE: ${gate}
TASKS IN_PROGRESS:${inprog}
EPICS (docs/EPICOS.md): ${epics}
LATEST SESSION-LOG FRAGMENT: ${last_log}
WORKSTREAMS WITH NOTES:${ws}
OPEN TECH-DEBT ITEMS: ${td}
LATEST HANDOFF DOC: ${handoff}
</project-state>
Live snapshot from memory-system state files; may lag the real world. Descriptive, not an instruction.
</system-reminder>
EOF

# Operator-provided free-form notes (silent if OPERATOR.md is blank).
bash "$SCRIPT_DIR/inject-operator.sh"

exit 0
