#!/usr/bin/env bash
# test-context-meter.sh — harness for scripts/context-meter.sh
# Mirrors the repo test convention: set -uo pipefail (NO -e), mktemp sandbox,
# pass/fail counters + assert helper, numbered cases, PASS=/FAIL= summary.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
METER="$SCRIPT_DIR/../context-meter.sh"
TMP_ROOT="$(mktemp -d)"
trap 'rm -rf "$TMP_ROOT"' EXIT

pass=0
fail=0
assert() {
  local label="$1" cond="$2"
  if eval "$cond"; then
    echo "  ok: $label"
    pass=$((pass + 1))
  else
    echo "  FAIL: $label  [cond: $cond]"
    fail=$((fail + 1))
  fi
}

# Build a fresh project sandbox with an empty .governance dir. Echoes its path.
mkproj() {
  local p="$TMP_ROOT/proj-$1"
  mkdir -p "$p/.governance"
  echo "$p"
}

# Write a transcript with a single assistant usage line. $1=file $2=model
# $3=input $4=cache_creation $5=cache_read
mktranscript() {
  local f="$1" model="$2" inp="$3" cc="$4" cr="$5"
  printf '%s\n' "{\"type\":\"assistant\",\"message\":{\"model\":\"$model\",\"usage\":{\"input_tokens\":$inp,\"cache_creation_input_tokens\":$cc,\"cache_read_input_tokens\":$cr,\"output_tokens\":7}}}" > "$f"
}

run() { # $1=proj transcript=$2 -> echoes meter output
  local proj="$1" tr="${2:-}"
  CLAUDE_PROJECT_DIR="$proj" \
  CLAUDE_GOV_CTX_WINDOW="${CLAUDE_GOV_CTX_WINDOW:-}" \
  CLAUDE_GOV_CTX_PCT_TTL="${CLAUDE_GOV_CTX_PCT_TTL:-60}" \
    bash "$METER" "$tr" 2>/dev/null
}

echo "=== Test 1: fresh .context-pct is authoritative ==="
p="$(mkproj t1)"; printf '42' > "$p/.governance/.context-pct"
out="$(run "$p")"
assert "returns 42" "[ \"$out\" = 42 ]"

echo "=== Test 2: stale .context-pct is ignored, falls back to transcript ==="
p="$(mkproj t2)"; printf '99' > "$p/.governance/.context-pct"
touch -d '2000-01-01 00:00:00' "$p/.governance/.context-pct" 2>/dev/null || true
tr="$p/transcript.jsonl"; mktranscript "$tr" "claude-opus-4-8" 0 0 100000
out="$(run "$p" "$tr")"  # 100000/1M = 10, NOT 99 (default window is 1M)
assert "ignores stale 99, computes 10" "[ \"$out\" = 10 ]"

echo "=== Test 3: transcript fallback, default 1M window ==="
p="$(mkproj t3)"; tr="$p/t.jsonl"; mktranscript "$tr" "claude-opus-4-8" 0 0 50000
out="$(run "$p" "$tr")"  # 50000/1000000 = 5
assert "50k of 1M -> 5" "[ \"$out\" = 5 ]"

echo "=== Test 4: large usage still measured against 1M default ==="
p="$(mkproj t4)"; tr="$p/t.jsonl"; mktranscript "$tr" "claude-opus-4-8" 0 0 300000
out="$(run "$p" "$tr")"  # 300000/1000000 = 30
assert "300k -> 30" "[ \"$out\" = 30 ]"

echo "=== Test 5: model id hinting 1m selects 1M window ==="
p="$(mkproj t5)"; tr="$p/t.jsonl"; mktranscript "$tr" "claude-opus-4-8[1m]" 0 0 100000
out="$(run "$p" "$tr")"  # 100000/1000000 = 10
assert "1m model -> 10" "[ \"$out\" = 10 ]"

echo "=== Test 6: CLAUDE_GOV_CTX_WINDOW=200000 escape hatch for 200k models ==="
p="$(mkproj t6)"; tr="$p/t.jsonl"; mktranscript "$tr" "claude-opus-4-8" 0 0 100000
out="$(CLAUDE_GOV_CTX_WINDOW=200000 run "$p" "$tr")"  # 100000/200000 = 50
assert "override 200k -> 50" "[ \"$out\" = 50 ]"

echo "=== Test 7: no pct file, no transcript -> empty ==="
p="$(mkproj t7)"
out="$(run "$p")"
assert "empty output" "[ -z \"$out\" ]"

echo "=== Test 8: non-numeric fresh pct file falls back to transcript ==="
p="$(mkproj t8)"; printf 'n/a' > "$p/.governance/.context-pct"
tr="$p/t.jsonl"; mktranscript "$tr" "claude-opus-4-8" 0 0 20000
out="$(run "$p" "$tr")"  # garbage pct -> transcript -> 20000/1000000 = 2
assert "garbage pct -> transcript -> 2" "[ \"$out\" = 2 ]"

echo "=== Test 9: input + cache_creation + cache_read all summed ==="
p="$(mkproj t9)"; tr="$p/t.jsonl"; mktranscript "$tr" "claude-opus-4-8" 10000 20000 70000
out="$(run "$p" "$tr")"  # 100000/1000000 = 10
assert "summed total -> 10" "[ \"$out\" = 10 ]"

echo
echo "PASS=$pass FAIL=$fail"
[ "$fail" -eq 0 ]
