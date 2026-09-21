#!/usr/bin/env bash
# smoke.sh — verifiable test for the telemetry capture hooks (Fase 1c + wiring).
#
# Drives record-event.sh with synthetic hook payloads in an isolated temp git
# repo (CLAUDE_PROJECT_DIR) and asserts the events land on the `telemetry` orphan
# branch (read back via `git show`), that main is never touched, and that the
# drift-guard and install-hooks helpers behave. No dependency on a live Claude
# Code session. Exits non-zero on any failed assertion.

set -u

HERE="$(cd "$(dirname "$0")" && pwd)"
REC="$HERE/../hooks/record-event.sh"
DRIFT="$HERE/../hooks/drift-guard.sh"
INSTALL="$HERE/install-hooks.sh"
APPEND="$HERE/append-to-orphan.sh"

command -v jq >/dev/null 2>&1 || { echo "FAIL: jq not installed"; exit 1; }

# Scrub ambient git context (a pre-commit hook leaks GIT_DIR/etc).
unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE GIT_PREFIX GIT_COMMON_DIR 2>/dev/null || true

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
export CLAUDE_PROJECT_DIR="$TMP"

# A disposable project repo that ships the append plumbing where record-event
# expects it ($PROJECT_DIR/skills/telemetry/scripts/append-to-orphan.sh).
mkdir -p "$TMP/skills/telemetry/scripts"
cp "$APPEND" "$TMP/skills/telemetry/scripts/append-to-orphan.sh"
git init -q -b main "$TMP"
( cd "$TMP" && git config user.email a@b && git config user.name t \
  && echo init > README.md && git add README.md skills && git commit -q -m init )
head_before="$(git -C "$TMP" rev-parse HEAD)"

SID="test-session-0001"
fail=0
assert() { if eval "$2"; then echo "PASS: $1"; else echo "FAIL: $1"; fail=1; fi; }

# 1) skill invocation
printf '%s' "{\"session_id\":\"$SID\",\"cwd\":\"$TMP\",\"hook_event_name\":\"PreToolUse\",\"tool_name\":\"Skill\",\"tool_input\":{\"skill\":\"implement\"}}" \
  | bash "$REC" tool
# 2) agent spawn (with task descriptor)
printf '%s' "{\"session_id\":\"$SID\",\"cwd\":\"$TMP\",\"hook_event_name\":\"PreToolUse\",\"tool_name\":\"Task\",\"tool_input\":{\"subagent_type\":\"backend\",\"description\":\"fix auth bug\"}}" \
  | bash "$REC" tool
# 3) prompt activity (with the human's prompt text)
printf '%s' "{\"session_id\":\"$SID\",\"cwd\":\"$TMP\",\"hook_event_name\":\"UserPromptSubmit\",\"prompt\":\"implementar a fase 2\"}" \
  | bash "$REC" prompt
# 4) session end with reason (SessionEnd carries .reason, not .source)
printf '%s' "{\"session_id\":\"$SID\",\"cwd\":\"$TMP\",\"hook_event_name\":\"SessionEnd\",\"reason\":\"logout\"}" \
  | bash "$REC" session_end

show() { git -C "$TMP" show "telemetry:governance/$SID.ndjson" 2>/dev/null; }

assert "events landed on telemetry orphan" "show >/dev/null"
assert "4 events recorded" "[ \"\$(show | grep -c .)\" -eq 4 ]"
assert "every line is valid JSON" "show | jq -e . >/dev/null"
assert "skill name captured" "show | jq -e 'select(.actor==\"skill\" and .name==\"implement\")' >/dev/null"
assert "agent subagent_type captured" "show | jq -e 'select(.actor==\"agent\" and .name==\"backend\")' >/dev/null"
assert "session end reason captured" "show | jq -e 'select(.event==\"SessionEnd\" and .source==\"logout\")' >/dev/null"
assert "human prompt text captured in detail" "show | jq -e 'select(.category==\"prompt\" and .detail==\"implementar a fase 2\")' >/dev/null"
assert "agent task descriptor captured in detail" "show | jq -e 'select(.actor==\"agent\" and .detail==\"fix auth bug\")' >/dev/null"
assert "no token/cost fields leaked" "! show | jq -e 'has(\"tokens\") or has(\"cost\")' >/dev/null"
assert "non-tool event has no actor field" "show | jq -e 'select(.event==\"UserPromptSubmit\") | has(\"actor\") | not' >/dev/null"

# THIN telemetry: a long detail is capped well under the old 4000-char firehose.
LONG="$(printf 'x%.0s' $(seq 1 1000))"
printf '%s' "{\"session_id\":\"$SID\",\"cwd\":\"$TMP\",\"hook_event_name\":\"UserPromptSubmit\",\"prompt\":\"$LONG\"}" \
  | bash "$REC" prompt
assert "detail capped short (<=280)" "[ \"\$(show | tail -n1 | jq -r '.detail | length')\" -le 280 ]"

# main / working tree never touched by telemetry.
assert "HEAD unchanged by telemetry" "[ \"\$(git -C '$TMP' rev-parse HEAD)\" = '$head_before' ]"
assert "no untracked files from telemetry" "[ -z \"\$(git -C '$TMP' status --porcelain)\" ]"
assert "no events.d on main (old design gone)" "[ ! -e '$TMP/memory-system/telemetry/events.d' ]"

# SECURITY: a crafted session_id must NOT escape governance/ (path traversal).
printf '%s' "{\"session_id\":\"../../../CANARY\",\"cwd\":\"$TMP\",\"hook_event_name\":\"PreToolUse\",\"tool_name\":\"Skill\",\"tool_input\":{\"skill\":\"x\"}}" \
  | bash "$REC" tool
assert "traversal sanitized to governance/unknown.ndjson" "git -C '$TMP' show telemetry:governance/unknown.ndjson >/dev/null 2>&1"
assert "no CANARY path on the orphan tree" "! git -C '$TMP' ls-tree -r --name-only telemetry | grep -q CANARY"

# drift-guard: silent without flag, emits with flag. Capture to files so the
# emitted double-quotes (severity="high") never reach the assert eval.
printf '%s' '{}' | bash "$DRIFT" > "$TMP/drift_silent.out"
assert "drift-guard silent without flag" "[ ! -s '$TMP/drift_silent.out' ]"
mkdir -p "$TMP/memory-system/telemetry"
printf 'high|teste de desvio\n' > "$TMP/memory-system/telemetry/drift.flag"
printf '%s' '{}' | bash "$DRIFT" > "$TMP/drift_flag.out"
assert "drift-guard emits alert with flag" "grep -q 'strategic-drift severity=.high.' '$TMP/drift_flag.out'"

# install-hooks.sh: wires into a settings.json, preserves existing hooks, idempotent.
SET="$TMP/settings.json"
printf '%s' '{"hooks":{"UserPromptSubmit":[{"hooks":[{"type":"command","command":"bash gov-footer.sh"}]}]}}' > "$SET"
bash "$INSTALL" "$SET" >/dev/null
assert "install-hooks: result is valid JSON" "jq -e . '$SET' >/dev/null"
assert "install-hooks: telemetry record wired" "grep -q 'skills/telemetry/hooks/record-event.sh' '$SET'"
assert "install-hooks: statusLine tap wired" "jq -e '.statusLine.command | test(\"statusline-tap.sh\")' '$SET' >/dev/null"
assert "install-hooks: session-guard wired" "grep -q 'skills/telemetry/hooks/session-guard.sh' '$SET'"
assert "install-hooks: delegate captured for the statusLine wrapper" "[ -f '$TMP/telemetry-statusline.json' ]"
assert "install-hooks: preserved existing governance hook" "grep -q 'gov-footer.sh' '$SET'"
assert "install-hooks: telemetry prepended, governance footer stays last" "jq -e '.hooks.UserPromptSubmit[-1].hooks[0].command==\"bash gov-footer.sh\"' '$SET' >/dev/null"
assert "install-hooks: SessionEnd created" "jq -e '.hooks.SessionEnd[] | .hooks[].command | select(test(\"record-event.sh.*session_end\"))' '$SET' >/dev/null"
before="$(grep -c 'record-event.sh' "$SET")"
bash "$INSTALL" "$SET" >/dev/null   # second run
after="$(grep -c 'record-event.sh' "$SET")"
assert "install-hooks: idempotent (no duplication on re-run)" "[ '$before' = '$after' ]"

[ "$fail" -eq 0 ] && echo "ALL PASS" || echo "SOME FAILED"
exit "$fail"
