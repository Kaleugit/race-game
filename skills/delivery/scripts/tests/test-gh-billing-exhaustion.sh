#!/usr/bin/env bash
# Test harness for check_gh_billing_exhaustion() in deliver-to-main.sh.
# Mocks the `gh` CLI via PATH override so each test exercises a specific log
# shape without touching real GitHub. Mirrors the style of
# test-gh-pr-create-fallback.sh.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DELIVERY_SCRIPT="$SCRIPT_DIR/../deliver-to-main.sh"
TMP_ROOT="$(mktemp -d)"
trap 'rm -rf "$TMP_ROOT"' EXIT

pass=0
fail=0

assert() {
  local label="$1" cond="$2"
  if eval "$cond"; then
    echo "  PASS: $label"
    pass=$((pass + 1))
  else
    echo "  FAIL: $label"
    fail=$((fail + 1))
  fi
}

# Source the function from the real script.
# shellcheck disable=SC1090
source <(sed -n '/^check_gh_billing_exhaustion()/,/^}$/p' "$DELIVERY_SCRIPT")

make_mock() {
  # make_mock <id> <run-list-id> <summary-body> [<log-body>]
  # run-list-id="" simulates "no run found".
  # If <log-body> is omitted, the same body is used for both view and view --log.
  local id="$1" run_id="$2" summary_body="$3" log_body="${4:-$3}"
  local bin="$TMP_ROOT/bin-$id"
  mkdir -p "$bin"
  cat > "$bin/gh" <<EOF
#!/usr/bin/env bash
# Mock gh: consume known flags (-R repo) BEFORE the subcommand; positional
# trailing flags (like --log) are inspected after the subcommand parse.
while [ \$# -gt 0 ]; do
  case "\$1" in
    -R|--repo) shift 2 ;;
    --) shift; break ;;
    -*) shift ;;
    *) break ;;
  esac
done
cmd="\${1:-}"
sub="\${2:-}"
shift 2 2>/dev/null || true
want_log=0
for a in "\$@"; do
  [ "\$a" = "--log" ] && want_log=1
done
case "\$cmd" in
  run)
    case "\$sub" in
      list) printf '%s\n' "$run_id" ;;
      view)
        if [ "\$want_log" = "1" ]; then
          printf '%s\n' "$log_body"
        else
          printf '%s\n' "$summary_body"
        fi
        ;;
      *) exit 0 ;;
    esac
    ;;
  *) exit 0 ;;
esac
EOF
  chmod +x "$bin/gh"
  echo "$bin"
}

run_with_mock() {
  # run_with_mock <bin-dir> <branch>
  local bindir="$1" branch="$2"
  (
    PATH="$bindir:/usr/bin:/bin"
    GH_REPO_ARGS=(-R eduoda/agents)
    set +e
    check_gh_billing_exhaustion "$branch" 2>&1
    echo "EXIT=$?"
  )
}

echo "=== Test 1: log contains 'payments have failed' -> abort with token ==="
bin="$(make_mock t1 12345 'something happened: recent account payments have failed for org')"
out="$(run_with_mock "$bin" feature-branch)"
assert "exits 1" "echo \"$out\" | grep -q '^EXIT=1$'"
assert "gh-billing-exhausted token present" "echo \"$out\" | grep -q 'gh-billing-exhausted'"

echo "=== Test 2: log contains 'spending limit' -> abort with token ==="
bin="$(make_mock t2 12346 'Error: your spending limit needs to be increased to enable Actions.')"
out="$(run_with_mock "$bin" feature-branch)"
assert "exits 1" "echo \"$out\" | grep -q '^EXIT=1$'"
assert "gh-billing-exhausted token present" "echo \"$out\" | grep -q 'gh-billing-exhausted'"

echo "=== Test 3: normal log -> returns 0 silently ==="
bin="$(make_mock t3 12347 'governance.yml: All checks passed. validate-all.sh PASS.')"
out="$(run_with_mock "$bin" feature-branch)"
assert "exits 0" "echo \"$out\" | grep -q '^EXIT=0$'"
assert "no error token" "! echo \"$out\" | grep -q 'gh-billing-exhausted'"

echo "=== Test 4: no run found -> returns 0 silently ==="
bin="$(make_mock t4 '' '')"
out="$(run_with_mock "$bin" feature-branch)"
assert "exits 0" "echo \"$out\" | grep -q '^EXIT=0$'"
assert "no error token" "! echo \"$out\" | grep -q 'gh-billing-exhausted'"

echo "=== Test 5: empty branch arg -> returns 0 silently ==="
bin="$(make_mock t5 12348 'recent account payments have failed')"
out="$(run_with_mock "$bin" "")"
assert "exits 0" "echo \"$out\" | grep -q '^EXIT=0$'"
assert "no error token" "! echo \"$out\" | grep -q 'gh-billing-exhausted'"

echo "=== Test 6: annotation-only (summary has marker, --log empty) -> abort ==="
# Real-world billing case: job never starts, so 'gh run view --log' returns
# nothing useful, but 'gh run view' annotation shows the billing message.
bin="$(make_mock t6 12349 'X governance in 0s ANNOTATIONS X The job was not started because recent account payments have failed' '')"
out="$(run_with_mock "$bin" feature-branch)"
assert "exits 1" "echo \"$out\" | grep -q '^EXIT=1$'"
assert "gh-billing-exhausted token present" "echo \"$out\" | grep -q 'gh-billing-exhausted'"

echo "=== Summary ==="
echo "PASS=$pass FAIL=$fail"
[ "$fail" -eq 0 ]
