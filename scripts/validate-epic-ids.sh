#!/usr/bin/env bash
set -euo pipefail

# Validates the integrity of the epic ID registry (docs/EPICOS.md).
#
# Motivation: epic IDs are allocated by reading docs/EPICOS.md when a branch is
# created. Two people branching in parallel take the same "next free" number and
# the collision only surfaces as a text conflict at merge time, where it can be
# resolved silently and partially. This script turns that class of drift into a
# hard failure at commit time.
#
# Rules (FAIL):
#   1. Every epic heading in docs/EPICOS.md is `### EP-NNN - <title>` (3 digits).
#   2. No epic ID is registered twice.
#   3. docs/EPICOS.md has exactly one `## Decisoes Autonomas` section.
#   4. Every EP-NNN that appears in a tracked FILENAME is registered in EPICOS.md.
#   5. No DA-NNN is defined twice inside docs/EPICOS.md itself.
#
# Rules (WARN only, informative):
#   6. Gaps in the epic sequence.
#   7. DA-NNN defined in more than one epic document (IDs are epic-scoped today).

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EPICOS="$ROOT_DIR/docs/EPICOS.md"
FAILURES=0

fail() {
  echo "FAIL: $1" >&2
  FAILURES=1
}

warn() {
  echo "WARN: $1" >&2
}

if [[ ! -f "$EPICOS" ]]; then
  fail "docs/EPICOS.md not found"
  exit "$FAILURES"
fi

cd "$ROOT_DIR"

# --- Rule 1: heading shape -------------------------------------------------
while IFS= read -r line; do
  fail "malformed epic heading in docs/EPICOS.md: $line"
done < <(grep -nE '^### *EP-' "$EPICOS" | grep -vE '^[0-9]+:### EP-[0-9]{3} - .+')

# --- Rule 2: no duplicate epic IDs ----------------------------------------
# `|| true`: an EPICOS.md with no epics yet (pre gen-epics) is valid; without it
# grep's no-match exit aborts the script silently under set -euo pipefail.
REGISTERED="$(grep -oE '^### EP-[0-9]{3}' "$EPICOS" | grep -oE 'EP-[0-9]{3}' | sort || true)"

while IFS= read -r dup; do
  [[ -z "$dup" ]] && continue
  fail "epic ID registered more than once in docs/EPICOS.md: $dup"
done < <(echo "$REGISTERED" | uniq -d)

# --- Rule 3: single Decisoes Autonomas section -----------------------------
DA_SECTIONS="$(grep -cE '^## +Decisoes Autonomas' "$EPICOS" || true)"
if [[ "$DA_SECTIONS" -ne 1 ]]; then
  fail "docs/EPICOS.md must have exactly one '## Decisoes Autonomas' section (found $DA_SECTIONS)"
fi

# --- Rule 4: every epic ID used in a filename is registered -----------------
UNIQUE_REGISTERED="$(echo "$REGISTERED" | uniq)"

while IFS= read -r path; do
  [[ -z "$path" ]] && continue
  base="$(basename "$path")"
  for id in $(echo "$base" | grep -oiE 'ep-?[0-9]{3}' | tr '[:lower:]' '[:upper:]' | sed -E 's/^EP-?/EP-/' | sort -u); do
    if ! echo "$UNIQUE_REGISTERED" | grep -qx "$id"; then
      fail "$path references $id, which is not registered in docs/EPICOS.md"
    fi
  done
done < <(git ls-files | grep -iE '(^|/)[^/]*ep-?[0-9]{3}[^/]*$' || true)

# --- Rule 5: no DA defined twice inside EPICOS.md ---------------------------
while IFS= read -r dup; do
  [[ -z "$dup" ]] && continue
  fail "DA defined more than once in docs/EPICOS.md: $dup"
done < <(grep -oE '^[-*] *\**DA-[0-9]{3}' "$EPICOS" | grep -oE 'DA-[0-9]{3}' | sort | uniq -d)

# --- Rule 6 (warn): gaps in the epic sequence ------------------------------
LAST=0
while IFS= read -r id; do
  [[ -z "$id" ]] && continue
  n=$((10#${id#EP-}))
  if [[ "$n" -gt $((LAST + 1)) && "$LAST" -gt 0 ]]; then
    warn "gap in epic sequence between EP-$(printf '%03d' "$LAST") and $id"
  fi
  LAST="$n"
done < <(echo "$UNIQUE_REGISTERED")

# --- Rule 7 (warn): DA IDs reused across epic documents --------------------
DA_REUSED="$(git grep -noE '^[-*] *\**DA-[0-9]{3}' -- docs 2>/dev/null \
  | sed -E 's/^([^:]+):[0-9]+:.*(DA-[0-9]{3}).*/\2 \1/' \
  | sort -u | awk '{c[$1]++} END{n=0; for(k in c) if(c[k]>1) n++; print n}')"
if [[ "${DA_REUSED:-0}" -gt 0 ]]; then
  warn "$DA_REUSED DA IDs are defined in more than one epic document — DA IDs are currently epic-scoped, not globally unique"
fi

if [[ "$FAILURES" -eq 0 ]]; then
  echo "Epic ID registry OK ($(printf '%s' "$UNIQUE_REGISTERED" | grep -c . || true) epics registered)"
fi

exit "$FAILURES"
