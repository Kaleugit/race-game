#!/usr/bin/env bash
# Test harness for skills/gen-api-index/scripts/gen-api-index.sh.
#
# Builds synthetic fixtures in a temp directory, runs the generator, and
# asserts the resulting docs/INDEX-API.md.
#
# Usage:
#   ./skills/gen-api-index/scripts/tests/test-gen-api-index.sh
#
# Exit codes:
#   0 all tests pass
#   1 one or more tests fail
set -euo pipefail

PASS=0
FAIL=0

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GEN="$SCRIPT_DIR/../gen-api-index.sh"

if [[ ! -x "$GEN" ]]; then
  echo "ERROR: generator not found or not executable at $GEN" >&2
  exit 1
fi

note() { printf '\n[TEST] %s\n' "$1"; }
ok()   { PASS=$((PASS + 1)); printf '  PASS: %s\n' "$1"; }
bad()  { FAIL=$((FAIL + 1)); printf '  FAIL: %s\n' "$1"; }

assert_contains() {
  local file="$1"; local needle="$2"; local label="$3"
  if grep -qF -- "$needle" "$file"; then
    ok "$label"
  else
    bad "$label (missing: $needle)"
  fi
}

assert_not_contains() {
  local file="$1"; local needle="$2"; local label="$3"
  if grep -qF -- "$needle" "$file"; then
    bad "$label (unexpected presence: $needle)"
  else
    ok "$label"
  fi
}

# ----------------------------------------------------------------------
# Test 1: empty workspace — no sources, graceful header
# ----------------------------------------------------------------------
note "1: empty workspace produces graceful index"
TMP1="$(mktemp -d)"
trap 'rm -rf "$TMP1" "$TMP2" "$TMP3" "$TMP4"' EXIT
mkdir -p "$TMP1/src" "$TMP1/public" "$TMP1/docs"
"$GEN" --root "$TMP1" --out "$TMP1/docs/INDEX-API.md" >/dev/null
assert_contains "$TMP1/docs/INDEX-API.md" "Coverage" "1.1 coverage header present"
assert_contains "$TMP1/docs/INDEX-API.md" "0/0 backend files (0%)" "1.2 zero backend coverage rendered"
assert_contains "$TMP1/docs/INDEX-API.md" "No tagged backend modules yet" "1.3 transition placeholder for backend"
assert_contains "$TMP1/docs/INDEX-API.md" "No tagged custom elements yet" "1.4 transition placeholder for elements"

# ----------------------------------------------------------------------
# Test 2: tagged backend module appears in index with summaries
# ----------------------------------------------------------------------
note "2: backend module with @module + @summary is rendered"
TMP2="$(mktemp -d)"
mkdir -p "$TMP2/src" "$TMP2/docs"
cat > "$TMP2/src/venue-crud.ts" <<'EOF'
/**
 * @module venue-crud — CRUD de venues no disco, fonte da verdade.
 */

/**
 * @summary Verdadeiro se venue está locked via lockfile.
 */
export function isVenueLocked(id) { return false; }

/**
 * @summary Carrega venue do disco com merge de defaults.
 */
export async function loadVenue(id) { return { id }; }
EOF
"$GEN" --root "$TMP2" --out "$TMP2/docs/INDEX-API.md" >/dev/null
assert_contains "$TMP2/docs/INDEX-API.md" "1/1 backend files (100%)" "2.1 backend coverage 1/1"
assert_contains "$TMP2/docs/INDEX-API.md" "src/venue-crud.ts" "2.2 module path rendered"
assert_contains "$TMP2/docs/INDEX-API.md" "CRUD de venues no disco" "2.3 module purpose rendered"
assert_contains "$TMP2/docs/INDEX-API.md" "Verdadeiro se venue está locked" "2.4 summary 1 rendered"
assert_contains "$TMP2/docs/INDEX-API.md" "Carrega venue do disco" "2.5 summary 2 rendered"

# ----------------------------------------------------------------------
# Test 3: custom element with @element + @attr/@fires/@slot/@method
# ----------------------------------------------------------------------
note "3: custom element renders with attrs/events/slots/methods"
TMP3="$(mktemp -d)"
mkdir -p "$TMP3/public/components" "$TMP3/docs"
cat > "$TMP3/public/components/scene-list.js" <<'EOF'
/**
 * @element scene-list
 * @summary List of scenes with active highlight + delete.
 * @attr scenes
 * @attr active-id
 * @fires scene-select
 * @fires scene-delete
 * @slot header
 * @method focusActive
 */
class SceneList extends HTMLElement {}
customElements.define('scene-list', SceneList);
EOF
"$GEN" --root "$TMP3" --out "$TMP3/docs/INDEX-API.md" >/dev/null
assert_contains "$TMP3/docs/INDEX-API.md" "1/1 frontend custom elements (100%)" "3.1 element coverage 1/1"
assert_contains "$TMP3/docs/INDEX-API.md" "<scene-list>" "3.2 element tag rendered"
assert_contains "$TMP3/docs/INDEX-API.md" "List of scenes with active highlight" "3.3 element summary rendered"
# Backticks in needles are LITERAL markdown — not command substitution. SC2016 noise suppressed:
# shellcheck disable=SC2016
assert_contains "$TMP3/docs/INDEX-API.md" '**Attrs**: `scenes`,`active-id`' "3.4 attrs bullet"
# shellcheck disable=SC2016
assert_contains "$TMP3/docs/INDEX-API.md" '**Events**: `scene-select`,`scene-delete`' "3.5 events bullet"
# shellcheck disable=SC2016
assert_contains "$TMP3/docs/INDEX-API.md" '**Slots**: `header`' "3.6 slots bullet"
# shellcheck disable=SC2016
assert_contains "$TMP3/docs/INDEX-API.md" '**Methods**: `focusActive`' "3.7 methods bullet"

# ----------------------------------------------------------------------
# Test 4: untagged sources are counted in denominator only, not rendered
# ----------------------------------------------------------------------
note "4: untagged files count in denominator, not rendered"
TMP4="$(mktemp -d)"
mkdir -p "$TMP4/src/api" "$TMP4/public/components" "$TMP4/docs"

# Tagged backend
cat > "$TMP4/src/api/health.ts" <<'EOF'
/**
 * @module api/health — Liveness/readiness probes.
 */
export function ok() { return true; }
EOF

# Untagged backend (must not appear)
cat > "$TMP4/src/api/legacy.js" <<'EOF'
// Plain file with no JSDoc.
export function legacyThing() {}
EOF

# Tagged custom element
cat > "$TMP4/public/components/scene-card.js" <<'EOF'
/**
 * @element scene-card
 * @summary Card preview for a scene.
 */
class SceneCard extends HTMLElement {}
customElements.define('scene-card', SceneCard);
EOF

# Untagged custom element (must not appear)
cat > "$TMP4/public/components/orphan.js" <<'EOF'
// No JSDoc tags.
class OrphanEl extends HTMLElement {}
customElements.define('orphan-el', OrphanEl);
EOF

"$GEN" --root "$TMP4" --out "$TMP4/docs/INDEX-API.md" >/dev/null

assert_contains "$TMP4/docs/INDEX-API.md" "1/2 backend files (50%)" "4.1 backend coverage 1/2"
assert_contains "$TMP4/docs/INDEX-API.md" "1/2 frontend custom elements (50%)" "4.2 element coverage 1/2"
assert_contains "$TMP4/docs/INDEX-API.md" "src/api/health.ts" "4.3 tagged backend rendered"
assert_not_contains "$TMP4/docs/INDEX-API.md" "src/api/legacy.js" "4.4 untagged backend hidden"
assert_contains "$TMP4/docs/INDEX-API.md" "<scene-card>" "4.5 tagged element rendered"
assert_not_contains "$TMP4/docs/INDEX-API.md" "<orphan-el>" "4.6 untagged element hidden"

# ----------------------------------------------------------------------
# Test 5: idempotence — re-running produces same content (modulo timestamp)
# ----------------------------------------------------------------------
note "5: idempotent regeneration"
"$GEN" --root "$TMP4" --out "$TMP4/docs/INDEX-API.md" >/dev/null
out_a="$(grep -v 'Last regenerated' "$TMP4/docs/INDEX-API.md")"
sleep 1
"$GEN" --root "$TMP4" --out "$TMP4/docs/INDEX-API.md" >/dev/null
out_b="$(grep -v 'Last regenerated' "$TMP4/docs/INDEX-API.md")"
if [[ "$out_a" == "$out_b" ]]; then
  ok "5.1 byte-identical output across runs (timestamp excluded)"
else
  bad "5.1 byte-identical output across runs (timestamp excluded)"
fi

# ----------------------------------------------------------------------
echo
echo "================================================================"
echo "PASS=$PASS FAIL=$FAIL"
echo "================================================================"

if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
exit 0
