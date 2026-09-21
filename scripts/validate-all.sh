#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FAILED=0

# Fail-fast syntax/structure validation by default in every repository.
# Semantic contract validation is handled by skills/delivery.
# Allow skipping only when explicitly requested.
if [[ "${SKIP_GOVERNANCE_VALIDATION:-0}" == "1" ]]; then
  echo "Governance validation skipped via SKIP_GOVERNANCE_VALIDATION=1"
  exit 0
fi

run_check() {
  local script="$1"
  echo "==> Running $script"
  if ! "$ROOT_DIR/scripts/$script"; then
    FAILED=1
  fi
  echo
}

run_check "validate-links.sh"
run_check "validate-placeholders.sh"
run_check "validate-conventions.sh"
run_check "validate-skill-taxonomy.sh"
run_check "validate-epic-ids.sh"
run_check "validate-dates.sh"
run_check "run-tests.sh"

if [[ "$FAILED" -ne 0 ]]; then
  echo "Governance validation failed"
  exit 1
fi

echo "Governance validation passed"
