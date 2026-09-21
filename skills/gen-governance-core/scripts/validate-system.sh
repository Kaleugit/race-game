#!/usr/bin/env bash
# Validates the governance injection system end-to-end.
#
# Default mode (fast, suitable for SessionStart hook):
#   - .claude/settings.json exists and registers expected hooks
#   - .governance/CORE.md, MINI.md, SUBAGENT.md, meta.yaml exist
#   - each level hook output fits under the 10K cap
#
# --deep adds the slow check:
#   - sha256 of each source listed in meta.yaml matches the live file
#
# Output: one line per check, prefixed PASS or FAIL.
# Exit: 0 on all PASS, 1 if any FAIL.

set -u

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
DEEP=0
if [ "${1:-}" = "--deep" ]; then DEEP=1; fi

cd "$PROJECT_DIR" || exit 2

failed=0
report() {
  local status="$1"; shift
  printf '%-4s %s\n' "$status" "$*"
  [ "$status" = "FAIL" ] && failed=1
}

# --- 1. settings.json with required hooks ---------------------------------
SETTINGS=".claude/settings.json"
if [ ! -f "$SETTINGS" ]; then
  report FAIL "$SETTINGS missing"
else
  for ev in SessionStart PostCompact SubagentStart UserPromptSubmit PostToolUse; do
    if jq -e --arg ev "$ev" '.hooks[$ev] // empty | length > 0' "$SETTINGS" >/dev/null 2>&1; then
      report PASS "hook registered: $ev"
    else
      report FAIL "hook missing in $SETTINGS: $ev"
    fi
  done
fi

# --- 2. governance files present ------------------------------------------
for f in .governance/CORE.md .governance/MINI.md .governance/SUBAGENT.md .governance/meta.yaml; do
  if [ -s "$f" ]; then
    report PASS "$f present"
  else
    report FAIL "$f missing or empty"
  fi
done

# --- 3. hook output under 10K ---------------------------------------------
SIZE_SCRIPT="skills/gen-governance-core/scripts/validate-size.sh"
if [ -x "$SIZE_SCRIPT" ]; then
  if "$SIZE_SCRIPT" >/dev/null 2>&1; then
    report PASS "all level outputs under 10K cap"
  else
    report FAIL "one or more level outputs exceed 10K cap (run $SIZE_SCRIPT to see which)"
  fi
else
  report FAIL "size validator not executable: $SIZE_SCRIPT"
fi

# --- 4. dirty marker advisory ---------------------------------------------
if [ -f .governance/.dirty ]; then
  report FAIL "regeneration pending — .governance/.dirty present; run /gen-governance-core"
fi

# --- 5. deep check: source hash drift -------------------------------------
if [ "$DEEP" -eq 1 ]; then
  META=".governance/meta.yaml"
  if [ ! -f "$META" ]; then
    report FAIL "deep check skipped — $META missing"
  else
    python3 - "$META" <<'PY' || failed=1
import hashlib
import sys
from pathlib import Path

import yaml

meta_path = Path(sys.argv[1])
meta = yaml.safe_load(meta_path.read_text(encoding="utf-8"))
for entry in meta.get("sources", []) or []:
    path = Path(entry["path"])
    expected = entry["sha256"]
    if not path.exists():
        print(f"FAIL source listed in meta but missing on disk: {path}")
        continue
    actual = hashlib.sha256(path.read_bytes()).hexdigest()
    if actual == expected:
        print(f"PASS source hash matches: {path}")
    else:
        print(f"FAIL source drifted (regenerate): {path}")
PY
  fi
fi

exit $failed
