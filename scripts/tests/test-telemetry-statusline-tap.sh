#!/usr/bin/env bash
# Test harness for skills/telemetry/hooks/statusline-tap.sh (Fase 1b).
#
# Asserts the wrapper:
#   - passes a custom original status line through UNCHANGED (never clobbers);
#   - feeds the SAME stdin to the delegate;
#   - emits ONE usage sample (dev/repo/session/tokens/ctx/limits) to the orphan;
#   - throttles repeated renders within the window;
#   - prints a minimal bar when there is no delegate configured.
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TAP="$ROOT_DIR/skills/telemetry/hooks/statusline-tap.sh"
APPEND="$ROOT_DIR/skills/telemetry/scripts/append-to-orphan.sh"

command -v jq >/dev/null 2>&1 || { echo "FAIL: jq not installed"; exit 1; }
[ -f "$TAP" ] || { echo "FAIL: statusline-tap.sh not found"; exit 1; }

unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE GIT_PREFIX GIT_COMMON_DIR 2>/dev/null || true
# Hermetic: the fixture sets a github-style origin (to test owner/repo slug
# parsing); allow only the file protocol so the tap's best-effort push is refused
# instantly instead of touching the network. Local plumbing is unaffected.
export GIT_ALLOW_PROTOCOL=file

TMP="$(mktemp -d)"
# Isolate throttle state under TMP: statusline-tap.sh keys the throttle mark base
# on $TMPDIR, so pointing TMPDIR at this run's temp dir keeps persisted marks
# from a previous run (or a live session) from suppressing the first sample.
export TMPDIR="$TMP"
trap 'rm -rf "$TMP"' EXIT
pass=0; fail=0
assert() { if eval "$2"; then echo "  PASS: $1"; pass=$((pass+1)); else echo "  FAIL: $1"; fail=$((fail+1)); fi; }

# A disposable project that ships the telemetry scripts at the expected path.
REPO="$TMP/proj"
mkdir -p "$REPO/skills/telemetry/scripts" "$REPO/.claude"
cp "$APPEND" "$REPO/skills/telemetry/scripts/append-to-orphan.sh"
git init -q -b main "$REPO"
( cd "$REPO" && git config user.email dev@example.com && git config user.name dev \
  && git remote add origin https://github.com/acme/widget.git \
  && echo x > f && git add f && git commit -q -m init )

SID="sess-tap-1"
PAYLOAD="$(jq -nc --arg pd "$REPO" --arg sid "$SID" '{
  session_id:$sid, cwd:$pd, workspace:{project_dir:$pd},
  context_window:{total_input_tokens:12000, total_output_tokens:3400, used_percentage:42.7},
  rate_limits:{five_hour:{used_percentage:55, resets_at:1750800000},
               seven_day:{used_percentage:12, resets_at:1751300000}}
}')"

# --- custom delegate is preserved verbatim, fed the same stdin ---------------
# Quoted heredoc: write the delegate JSON literally (valid JSON, no shell mangling).
cat > "$REPO/.claude/telemetry-statusline.json" <<'EOF'
{"delegate": "jq -r '\"MYBAR ctx=\\(.context_window.used_percentage)\"'"}
EOF
jq -e . "$REPO/.claude/telemetry-statusline.json" >/dev/null || { echo "FAIL: test wrote invalid delegate JSON"; exit 1; }
out="$(printf '%s' "$PAYLOAD" | bash "$TAP")"
assert "delegate output preserved unchanged" "[ \"\$out\" = 'MYBAR ctx=42.7' ]"

# The sample is emitted asynchronously; poll (bounded) instead of a fixed sleep
# so the suite never flakes under load on a slow/busy CI.
for _ in $(seq 1 50); do
  git -C "$REPO" show "telemetry:usage/$SID.ndjson" >/dev/null 2>&1 && break
  sleep 0.1
done
assert "usage sample landed on orphan" "git -C '$REPO' show telemetry:usage/$SID.ndjson >/dev/null 2>&1"
sample="$(git -C "$REPO" show "telemetry:usage/$SID.ndjson" 2>/dev/null | tail -n1)"
assert "sample is valid JSON" "printf '%s' \"\$sample\" | jq -e . >/dev/null"
assert "sample carries dev" "[ \"\$(printf '%s' \"\$sample\" | jq -r .dev)\" = 'dev@example.com' ]"
assert "sample carries repo slug" "[ \"\$(printf '%s' \"\$sample\" | jq -r .repo)\" = 'acme/widget' ]"
assert "sample carries token totals" "[ \"\$(printf '%s' \"\$sample\" | jq -r .in)\" = '12000' ] && [ \"\$(printf '%s' \"\$sample\" | jq -r .out)\" = '3400' ]"
assert "sample carries 5h limit pct + reset" "[ \"\$(printf '%s' \"\$sample\" | jq -r .h5_pct)\" = '55' ] && [ \"\$(printf '%s' \"\$sample\" | jq -r .h5_reset)\" = '1750800000' ]"
assert "sample carries 7d limit pct" "[ \"\$(printf '%s' \"\$sample\" | jq -r .d7_pct)\" = '12' ]"
assert "sample carries ctx pct" "[ \"\$(printf '%s' \"\$sample\" | jq -r .ctx_pct)\" = '42.7' ]"

# --- throttle: a second render within the window emits no new sample ---------
before="$(git -C "$REPO" show "telemetry:usage/$SID.ndjson" | grep -c .)"
printf '%s' "$PAYLOAD" | bash "$TAP" >/dev/null
sleep 0.4
after="$(git -C "$REPO" show "telemetry:usage/$SID.ndjson" | grep -c .)"
assert "throttle suppresses a second sample in-window" "[ '$before' = '$after' ]"

# --- no delegate -> minimal bar, but still functional -----------------------
REPO2="$TMP/proj2"
mkdir -p "$REPO2/skills/telemetry/scripts" "$REPO2/.claude"
cp "$APPEND" "$REPO2/skills/telemetry/scripts/append-to-orphan.sh"
git init -q -b main "$REPO2"
( cd "$REPO2" && git config user.email d2@e.com && git config user.name d2 && echo y>g && git add g && git commit -q -m init )
P2="$(jq -nc --arg pd "$REPO2" '{session_id:"s2", cwd:$pd, workspace:{project_dir:$pd}, context_window:{used_percentage:10}}')"
out2="$(printf '%s' "$P2" | bash "$TAP")"
assert "minimal bar printed when no delegate" "printf '%s' \"\$out2\" | grep -q 'proj2'"
assert "minimal bar shows ctx pct" "printf '%s' \"\$out2\" | grep -q 'ctx 10%'"

# --- M1 defense in depth: a self-referential delegate must NOT recurse --------
printf '%s\n' '{"delegate": "bash \"$CLAUDE_PROJECT_DIR/skills/telemetry/hooks/statusline-tap.sh\""}' > "$REPO2/.claude/telemetry-statusline.json"
jq -e . "$REPO2/.claude/telemetry-statusline.json" >/dev/null || { echo "FAIL: bad self-ref JSON in test"; exit 1; }
selfout="$(printf '%s' "$P2" | timeout 10 bash "$TAP"; echo "rc=$?")"
assert "self-referential delegate ignored, falls back to minimal bar" "printf '%s' \"\$selfout\" | grep -q 'proj2'"
assert "self-referential delegate did not hang/recurse (rc=0)" "printf '%s' \"\$selfout\" | grep -q 'rc=0'"

# --- L2: a malformed used_percentage must never leak a printf error to stderr -
# Includes "12.5.6" (passes a digits+dots filter yet is not a number) and "1e9".
rm -f "$REPO2/.claude/telemetry-statusline.json"   # force the minimal-bar path
for raw in '"abc"' '""' 'null' '"1e9"' '"12.5.6"' '42.7' '100'; do
  PBAD="$(jq -nc --arg pd "$REPO2" --argjson up "$raw" '{session_id:"s3", cwd:$pd, workspace:{project_dir:$pd}, context_window:{used_percentage:$up}}')"
  printf '%s' "$PBAD" | bash "$TAP" >"$TMP/bad.out" 2>"$TMP/bad.err"
  assert "malformed ctx ($raw): nothing leaked to stderr" "[ ! -s '$TMP/bad.err' ]"
  assert "malformed ctx ($raw): bar still printed (has repo label)" "grep -q 'proj2' '$TMP/bad.out'"
done
# the well-formed decimal renders its integer part
Pok="$(jq -nc --arg pd "$REPO2" '{session_id:"s3", cwd:$pd, workspace:{project_dir:$pd}, context_window:{used_percentage:42.7}}')"
assert "decimal ctx renders integer part" "[ \"\$(printf '%s' \"\$Pok\" | bash '$TAP')\" = 'proj2 | ctx 42%' ]"

echo
if [ "$fail" -eq 0 ]; then echo "ALL PASS ($pass)"; exit 0; else echo "SOME FAILED ($fail failed, $pass passed)"; exit 1; fi
