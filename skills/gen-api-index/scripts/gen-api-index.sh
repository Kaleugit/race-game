#!/usr/bin/env bash
# @module gen-api-index — Regenerate docs/INDEX-API.md from JSDoc head tags.
#
# Parses backend modules (@module + @summary before each export) and frontend
# custom elements (@element + @attr/@fires/@slot/@method) using regex bash —
# no jsdoc-api or other npm dependency (CDT-003).
#
# Idempotent: same inputs produce byte-identical output except for the
# `Last regenerated` timestamp.
#
# Usage:
#   ./skills/gen-api-index/scripts/gen-api-index.sh [--root <dir>] [--out <path>]
#
# Configuration:
#   .governance/api-index.conf — one glob/pattern per line, `#` for comments.
#   Defaults: src + public JS/TS sources.
#
# Exit codes:
#   0 success
#   1 invalid arguments / IO failure
set -euo pipefail

ROOT_DIR=""
OUT_PATH=""

usage() {
  cat <<'USAGE'
Usage:
  gen-api-index.sh [--root <dir>] [--out <path>]

Options:
  --root <dir>   Repository root (default: git rev-parse --show-toplevel).
  --out <path>   Output path (default: <root>/docs/INDEX-API.md).
  -h, --help     Show this help.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --root) ROOT_DIR="${2:-}"; shift 2 ;;
    --out)  OUT_PATH="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "ERROR: unknown option '$1'" >&2; usage; exit 1 ;;
  esac
done

if [[ -z "$ROOT_DIR" ]]; then
  if ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null)"; then
    :
  else
    ROOT_DIR="$(pwd)"
  fi
fi

if [[ ! -d "$ROOT_DIR" ]]; then
  echo "ERROR: root '$ROOT_DIR' is not a directory" >&2
  exit 1
fi

OUT_PATH="${OUT_PATH:-$ROOT_DIR/docs/INDEX-API.md}"
mkdir -p "$(dirname "$OUT_PATH")"

CONF="$ROOT_DIR/.governance/api-index.conf"

# Default candidate roots and extensions. The generator uses `find` with
# explicit -path filters so we do not depend on bash globstar / shopt rules.
declare -a SCAN_ROOTS=("src" "public")
declare -a EXTENSIONS=("js" "ts" "jsx" "tsx")

# Optional extra patterns from .governance/api-index.conf — one extension or
# directory per line, `#` comments. Lines starting with `dir:<path>` add a scan
# root; bare extensions extend the extension list.
EXTRA_ROOTS=()
EXTRA_EXTS=()
if [[ -f "$CONF" ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%#*}"
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    [[ -z "$line" ]] && continue
    if [[ "$line" == dir:* ]]; then
      EXTRA_ROOTS+=("${line#dir:}")
    else
      EXTRA_EXTS+=("$line")
    fi
  done < "$CONF"
fi

if [[ ${#EXTRA_ROOTS[@]} -gt 0 ]]; then
  SCAN_ROOTS+=("${EXTRA_ROOTS[@]}")
fi
if [[ ${#EXTRA_EXTS[@]} -gt 0 ]]; then
  EXTENSIONS+=("${EXTRA_EXTS[@]}")
fi

# Build find expression for extensions.
find_expr=()
for ext in "${EXTENSIONS[@]}"; do
  if [[ ${#find_expr[@]} -gt 0 ]]; then
    find_expr+=( -o )
  fi
  find_expr+=( -name "*.${ext}" )
done

# Enumerate candidate files (relative paths).
candidates=()
for sub in "${SCAN_ROOTS[@]}"; do
  abs="$ROOT_DIR/$sub"
  [[ -d "$abs" ]] || continue
  # shellcheck disable=SC2207
  while IFS= read -r f; do
    rel="${f#"$ROOT_DIR/"}"
    candidates+=( "$rel" )
  done < <(find "$abs" -type f \( "${find_expr[@]}" \) ! -name '*.test.*' ! -name '*.spec.*' 2>/dev/null | sort)
done

total_backend_candidates=0
total_element_candidates=0
tagged_backend=0
tagged_elements=0

backend_blocks=""
element_blocks=""

# parse_file <relative-path>
parse_file() {
  local rel="$1"
  local abs="$ROOT_DIR/$rel"
  [[ -f "$abs" ]] || return 0

  local head
  head="$(head -n 60 "$abs" 2>/dev/null || true)"

  local is_element=0
  if grep -qE 'customElements\.define\s*\(' "$abs" 2>/dev/null \
     || printf '%s' "$head" | grep -qE '@element[[:space:]]'; then
    is_element=1
  fi

  if [[ $is_element -eq 1 ]]; then
    total_element_candidates=$((total_element_candidates + 1))
  else
    total_backend_candidates=$((total_backend_candidates + 1))
  fi

  # Backend module path.
  if [[ $is_element -eq 0 ]]; then
    local module_line
    module_line="$(printf '%s' "$head" | grep -m1 -E '^[[:space:]]*(\*|\/\/)?[[:space:]]*@module[[:space:]]' || true)"
    [[ -z "$module_line" ]] && return 0
    tagged_backend=$((tagged_backend + 1))

    # Strip leading comment marker (`*` block or `//` line) and `@module` keyword.
    local title
    title="$(printf '%s' "$module_line" | sed -E 's/^[[:space:]]*(\*|\/\/)?[[:space:]]*@module[[:space:]]+//')"

    # Collect @summary lines (anywhere in file head, up to 200 lines).
    local summaries
    summaries="$(head -n 200 "$abs" \
                 | grep -E '^[[:space:]]*(\*|\/\/)?[[:space:]]*@summary[[:space:]]' \
                 | sed -E 's/^[[:space:]]*(\*|\/\/)?[[:space:]]*@summary[[:space:]]+/- /' \
                 || true)"

    backend_blocks+=$'\n'"### \`$rel\` — $title"$'\n'
    if [[ -n "$summaries" ]]; then
      backend_blocks+="$summaries"$'\n'
    fi
    return 0
  fi

  # Custom element path.
  local element_tag
  element_tag="$(printf '%s' "$head" | grep -m1 -E '^[[:space:]]*(\*|\/\/)?[[:space:]]*@element[[:space:]]' \
                 | sed -E 's/^[[:space:]]*(\*|\/\/)?[[:space:]]*@element[[:space:]]+//' \
                 | awk '{print $1}' || true)"
  if [[ -z "$element_tag" ]]; then
    # Untagged custom element — not in index.
    return 0
  fi
  tagged_elements=$((tagged_elements + 1))

  local element_summary
  element_summary="$(printf '%s' "$head" \
                     | grep -m1 -E '^[[:space:]]*(\*|\/\/)?[[:space:]]*@summary[[:space:]]' \
                     | sed -E 's/^[[:space:]]*(\*|\/\/)?[[:space:]]*@summary[[:space:]]+//' || true)"

  # Collect @attr/@fires/@slot/@method up to 200 lines.
  local head_long
  head_long="$(head -n 200 "$abs" 2>/dev/null || true)"

  # Backticks in sed expressions are LITERAL markdown — not command
  # substitution. shellcheck SC2016 disabled inline.
  local attrs fires slots methods
  # shellcheck disable=SC2016
  attrs="$(printf '%s' "$head_long"  | grep -E '^[[:space:]]*(\*|\/\/)?[[:space:]]*@attr[[:space:]]'   | sed -E 's/^[[:space:]]*(\*|\/\/)?[[:space:]]*@attr[[:space:]]+/`/; s/$/`/' | paste -sd, - || true)"
  # shellcheck disable=SC2016
  fires="$(printf '%s' "$head_long"  | grep -E '^[[:space:]]*(\*|\/\/)?[[:space:]]*@fires[[:space:]]'  | sed -E 's/^[[:space:]]*(\*|\/\/)?[[:space:]]*@fires[[:space:]]+/`/; s/$/`/' | paste -sd, - || true)"
  # shellcheck disable=SC2016
  slots="$(printf '%s' "$head_long"  | grep -E '^[[:space:]]*(\*|\/\/)?[[:space:]]*@slot[[:space:]]'   | sed -E 's/^[[:space:]]*(\*|\/\/)?[[:space:]]*@slot[[:space:]]+/`/; s/$/`/' | paste -sd, - || true)"
  # shellcheck disable=SC2016
  methods="$(printf '%s' "$head_long" | grep -E '^[[:space:]]*(\*|\/\/)?[[:space:]]*@method[[:space:]]' | sed -E 's/^[[:space:]]*(\*|\/\/)?[[:space:]]*@method[[:space:]]+/`/; s/$/`/' | paste -sd, - || true)"

  element_blocks+=$'\n'"### \`<$element_tag>\` — $rel"$'\n'
  if [[ -n "$element_summary" ]]; then
    element_blocks+="$element_summary"$'\n'
  fi
  [[ -n "$attrs"   ]] && element_blocks+="- **Attrs**: $attrs"$'\n'
  [[ -n "$fires"   ]] && element_blocks+="- **Events**: $fires"$'\n'
  [[ -n "$slots"   ]] && element_blocks+="- **Slots**: $slots"$'\n'
  [[ -n "$methods" ]] && element_blocks+="- **Methods**: $methods"$'\n'
  # parse_file must return 0 under `set -e` regardless of which `[[ -n ... ]]`
  # branches ran. The last conditional above can leave $? = 1.
  return 0
}

for rel in "${candidates[@]}"; do
  parse_file "$rel"
done

total_files=$(( total_backend_candidates + total_element_candidates ))

# Coverage formula: percent rounded to nearest integer, 0 when denominator is 0.
percent() {
  local num="$1"
  local den="$2"
  if [[ "$den" -eq 0 ]]; then
    echo "0"
  else
    awk -v n="$num" -v d="$den" 'BEGIN { printf "%d", (n*100.0/d) + 0.5 }'
  fi
}

backend_pct="$(percent "$tagged_backend" "$total_backend_candidates")"
element_pct="$(percent "$tagged_elements" "$total_element_candidates")"

timestamp="$(date -u +%Y-%m-%dT%H:%MZ)"
# Prefer the git remote slug (owner/repo) so worktree directory names do not
# leak into the index header. Fall back to basename.
project_name=""
if remote_url="$(git -C "$ROOT_DIR" remote get-url origin 2>/dev/null)"; then
  project_name="$(printf '%s' "$remote_url" \
                  | sed -E 's#(\.git)?$##; s#^.*[:/]([^/]+/[^/]+)$#\1#')"
fi
if [[ -z "$project_name" ]]; then
  project_name="$(basename "$ROOT_DIR")"
fi

tmp="$(mktemp "${TMPDIR:-/tmp}/gen-api-index.XXXXXX")"
trap 'rm -f "$tmp"' EXIT

{
  echo "# API Index — $project_name"
  echo
  echo "> **Coverage**: ${tagged_backend}/${total_backend_candidates} backend files (${backend_pct}%), ${tagged_elements}/${total_element_candidates} frontend custom elements (${element_pct}%)."
  echo "> Auto-generated from JSDoc \`@module\` / \`@summary\` / \`@element\` tags. Transition phase — files without these tags do NOT appear here."
  echo ">"
  echo "> **If you don't find what you need:**"
  echo "> 1. \`grep -rn \"<concept>\" src/ public/\` to confirm absence vs. undocumented."
  echo "> 2. If grep surfaces a candidate -> consume it (DRY)."
  echo "> 3. **Add the missing JSDoc tags to the file you touched** before closing the task. Boy-scout rule — your PR expands this index."
  echo
  echo "Last regenerated: $timestamp"
  echo "Total candidate files scanned: $total_files"
  echo
  echo "## Backend modules"
  if [[ -n "$backend_blocks" ]]; then
    printf '%s' "$backend_blocks"
  else
    echo
    echo "_No tagged backend modules yet. Add \`@module <name> — <purpose>\` at the top of a \`src/\` file to populate this section._"
  fi
  echo
  echo "## Frontend custom elements"
  if [[ -n "$element_blocks" ]]; then
    printf '%s' "$element_blocks"
  else
    echo
    echo "_No tagged custom elements yet. Add \`@element <tag-name>\` to a class JSDoc block that calls \`customElements.define\` to populate this section._"
  fi
} > "$tmp"

mv "$tmp" "$OUT_PATH"
trap - EXIT

echo "Wrote $OUT_PATH"
echo "Backend coverage: ${tagged_backend}/${total_backend_candidates} (${backend_pct}%)"
echo "Custom-element coverage: ${tagged_elements}/${total_element_candidates} (${element_pct}%)"
