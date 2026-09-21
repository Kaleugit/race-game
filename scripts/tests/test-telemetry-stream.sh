#!/usr/bin/env bash
# Test harness for the governance stream hooks (Fase 1c):
#   skills/telemetry/hooks/record-event.sh -> telemetry orphan branch
#   skills/telemetry/hooks/drift-guard.sh  -> in-session drift alert
#
# Asserts events land on refs/heads/telemetry (read via git show), detail is
# THIN (capped, not the old 4000-char firehose), main is never touched, session
# ids are sanitized, and drift-guard is silent/loud as expected.
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REC="$ROOT_DIR/skills/telemetry/hooks/record-event.sh"
DRIFT="$ROOT_DIR/skills/telemetry/hooks/drift-guard.sh"
APPEND="$ROOT_DIR/skills/telemetry/scripts/append-to-orphan.sh"

command -v jq >/dev/null 2>&1 || { echo "FAIL: jq not installed"; exit 1; }
unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE GIT_PREFIX GIT_COMMON_DIR 2>/dev/null || true
# Hermetic: the fixture sets a github-style origin (to test owner/repo slug
# parsing); allow only the file protocol so append-to-orphan's best-effort push
# is refused instantly (transport 'ssh' not allowed) instead of touching the
# network. Local plumbing uses no transport protocol, so it is unaffected.
export GIT_ALLOW_PROTOCOL=file

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
pass=0; fail=0
assert() { if eval "$2"; then echo "  PASS: $1"; pass=$((pass+1)); else echo "  FAIL: $1"; fail=$((fail+1)); fi; }

REPO="$TMP/proj"
mkdir -p "$REPO/skills/telemetry/scripts"
cp "$APPEND" "$REPO/skills/telemetry/scripts/append-to-orphan.sh"
git init -q -b main "$REPO"
( cd "$REPO" && git config user.email a@b && git config user.name t \
  && git remote add origin git@github.com:acme/widget.git \
  && echo init > README.md \
  && git add README.md skills && git commit -q -m init )
export CLAUDE_PROJECT_DIR="$REPO"
head_before="$(git -C "$REPO" rev-parse HEAD)"

SID="sess-stream-1"
emit() { printf '%s' "$1" | bash "$REC" "$2"; }

emit "{\"session_id\":\"$SID\",\"cwd\":\"$REPO\",\"hook_event_name\":\"PreToolUse\",\"tool_name\":\"Skill\",\"tool_input\":{\"skill\":\"implement\"}}" tool
emit "{\"session_id\":\"$SID\",\"cwd\":\"$REPO\",\"hook_event_name\":\"PreToolUse\",\"tool_name\":\"Task\",\"tool_input\":{\"subagent_type\":\"backend\",\"description\":\"fix auth bug\"}}" tool
emit "{\"session_id\":\"$SID\",\"cwd\":\"$REPO\",\"hook_event_name\":\"UserPromptSubmit\",\"prompt\":\"implementar a fase 2\"}" prompt
emit "{\"session_id\":\"$SID\",\"cwd\":\"$REPO\",\"hook_event_name\":\"SessionEnd\",\"reason\":\"logout\"}" session_end

show() { git -C "$REPO" show "telemetry:governance/$SID.ndjson" 2>/dev/null; }

assert "events landed on telemetry orphan" "show >/dev/null"
assert "4 events recorded" "[ \"\$(show | grep -c .)\" -eq 4 ]"
assert "every line valid JSON" "show | jq -e . >/dev/null"
assert "repo carries origin slug (owner/repo)" "[ \"\$(show | head -n1 | jq -r .repo)\" = 'acme/widget' ]"
assert "skill captured" "show | jq -e 'select(.actor==\"skill\" and .name==\"implement\")' >/dev/null"
assert "agent subagent_type captured" "show | jq -e 'select(.actor==\"agent\" and .name==\"backend\")' >/dev/null"
assert "agent descriptor in detail" "show | jq -e 'select(.actor==\"agent\" and .detail==\"fix auth bug\")' >/dev/null"
assert "prompt text in detail" "show | jq -e 'select(.category==\"prompt\" and .detail==\"implementar a fase 2\")' >/dev/null"
assert "SessionEnd reason captured as source" "show | jq -e 'select(.event==\"SessionEnd\" and .source==\"logout\")' >/dev/null"
assert "non-tool event has no actor" "show | jq -e 'select(.event==\"UserPromptSubmit\") | has(\"actor\") | not' >/dev/null"
assert "no token/cost fields" "! show | jq -e 'has(\"tokens\") or has(\"cost\")' >/dev/null"

# THIN: long detail is capped well below the old 4000-char firehose.
LONG="$(printf 'x%.0s' $(seq 1 1000))"
emit "{\"session_id\":\"$SID\",\"cwd\":\"$REPO\",\"hook_event_name\":\"UserPromptSubmit\",\"prompt\":\"$LONG\"}" prompt
assert "detail capped to <=280 (thin telemetry)" "[ \"\$(show | tail -n1 | jq -r '.detail | length')\" -le 280 ]"

# main / working tree never touched.
assert "HEAD unchanged" "[ \"\$(git -C '$REPO' rev-parse HEAD)\" = '$head_before' ]"
assert "no untracked files" "[ -z \"\$(git -C '$REPO' status --porcelain)\" ]"
assert "no events.d on main (old design removed)" "[ ! -e '$REPO/memory-system/telemetry/events.d' ]"

# SECURITY: crafted session_id sanitized; no traversal on the orphan tree.
emit "{\"session_id\":\"../../../CANARY\",\"cwd\":\"$REPO\",\"hook_event_name\":\"PreToolUse\",\"tool_name\":\"Skill\",\"tool_input\":{\"skill\":\"x\"}}" tool
assert "traversal sanitized to governance/unknown.ndjson" "git -C '$REPO' show telemetry:governance/unknown.ndjson >/dev/null 2>&1"
assert "no CANARY anywhere on the orphan tree" "! git -C '$REPO' ls-tree -r --name-only telemetry | grep -q CANARY"

# drift-guard.
printf '%s' '{}' | bash "$DRIFT" > "$TMP/drift_silent.out"
assert "drift-guard silent without flag" "[ ! -s '$TMP/drift_silent.out' ]"
mkdir -p "$REPO/memory-system/telemetry"
printf 'high|teste de desvio\n' > "$REPO/memory-system/telemetry/drift.flag"
CLAUDE_PROJECT_DIR="$REPO" bash -c 'printf "%s" "{}" | bash "'"$DRIFT"'"' > "$TMP/drift_flag.out"
assert "drift-guard emits alert with flag" "grep -q 'strategic-drift severity=.high.' '$TMP/drift_flag.out'"

echo
if [ "$fail" -eq 0 ]; then echo "ALL PASS ($pass)"; exit 0; else echo "SOME FAILED ($fail failed, $pass passed)"; exit 1; fi
