#!/usr/bin/env bash
# Test harness for gh_pr_create_with_fallback() in deliver-to-main.sh (issue #14.1).
# Mocks the `gh` CLI via PATH override so each test exercises a specific failure path
# without touching real GitHub.
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
source <(sed -n '/^gh_pr_create_with_fallback()/,/^}$/p' "$DELIVERY_SCRIPT")

make_mock() {
  # make_mock <id> <gh-create-rc> <gh-api-rc> [<gh-api-body>]
  local id="$1" create_rc="$2" api_rc="$3" api_body="${4:-{\\\"number\\\":42}}"
  local bin="$TMP_ROOT/bin-$id"
  mkdir -p "$bin"
  cat > "$bin/gh" <<EOF
#!/usr/bin/env bash
# Mock gh: consume known flags (-R repo) then read the first positional as the
# subcommand. We do not need to fully model gh — only enough to decide between
# 'pr create' and 'api'.
while [ \$# -gt 0 ]; do
  case "\$1" in
    -R|--repo) shift 2 ;;
    -X|--method) shift 2 ;;
    --input) shift 2 ;;
    --) shift; break ;;
    -*) shift ;;
    *) break ;;
  esac
done
cmd="\${1:-}"
case "\$cmd" in
  pr)  exit $create_rc ;;
  api) printf '%s\n' "$api_body"; exit $api_rc ;;
  *)   exit 0 ;;
esac
EOF
  chmod +x "$bin/gh"
  echo "$bin"
}

run_with_mock() {
  # run_with_mock <bin-dir> <ORIGIN_REPO>
  local bindir="$1" origin="$2"
  (
    PATH="$bindir:/usr/bin:/bin"
    ORIGIN_REPO="$origin"
    if [[ -n "$origin" ]]; then
      GH_REPO_ARGS=(-R "$origin")
    else
      GH_REPO_ARGS=()
    fi
    set +e
    gh_pr_create_with_fallback --base main --head test --title T --body B 2>&1
    echo "EXIT=$?"
  )
}

echo "=== Test 1: Path 1 success -> no fallback log ==="
bin="$(make_mock t1 0 0)"
out="$(run_with_mock "$bin" eduoda/agents)"
assert "exits 0" "echo \"$out\" | grep -q '^EXIT=0$'"
assert "no fallback log" "! echo \"$out\" | grep -q 'falling back to REST'"

echo "=== Test 2: Path 1 fails -> REST fallback succeeds ==="
bin="$(make_mock t2 1 0)"
out="$(run_with_mock "$bin" eduoda/agents)"
assert "exits 0" "echo \"$out\" | grep -q '^EXIT=0$'"
assert "fallback log present" "echo \"$out\" | grep -q 'falling back to REST API'"
assert "REST success log present" "echo \"$out\" | grep -q 'PR created via gh api REST'"

echo "=== Test 3: Path 1 fails + REST fails -> circuit-break ==="
bin="$(make_mock t3 1 1 'GraphQL: Resource not accessible')"
out="$(run_with_mock "$bin" eduoda/agents)"
assert "exits 1" "echo \"$out\" | grep -q '^EXIT=1$'"
assert "gh-unavailable log present" "echo \"$out\" | grep -q 'gh-unavailable'"
assert "no third attempt occurred" "[ \"\$(echo \"$out\" | grep -c 'falling back')\" -eq 1 ]"

echo "=== Test 4: ORIGIN_REPO empty -> fast abort with explicit message ==="
bin="$(make_mock t4 1 0)"
out="$(run_with_mock "$bin" "")"
assert "exits 1" "echo \"$out\" | grep -q '^EXIT=1$'"
assert "ORIGIN_REPO error visible" "echo \"$out\" | grep -q 'ORIGIN_REPO is empty'"

echo "=== Test 5: REST returns non-PR-shaped JSON -> treated as failure ==="
bin="$(make_mock t5 1 0 '{\"message\":\"Not Found\"}')"
out="$(run_with_mock "$bin" eduoda/agents)"
assert "exits 1" "echo \"$out\" | grep -q '^EXIT=1$'"
assert "no false success log" "! echo \"$out\" | grep -q 'PR created via gh api REST'"

echo "=== Summary ==="
echo "PASS=$pass FAIL=$fail"
[ "$fail" -eq 0 ]
