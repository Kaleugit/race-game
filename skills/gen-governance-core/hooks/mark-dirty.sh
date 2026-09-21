#!/usr/bin/env bash
# PostToolUse hook: marks GOVERNANCE-CORE.md as dirty when a governance source
# document is edited. Reads the Claude Code hook payload from stdin (JSON).
#
# The hook never invokes gen-governance-core. Regeneration is human-only.
# This script only appends the changed path to GOVERNANCE-CORE.dirty.
#
# Exit code is always 0 so the hook never blocks the tool call.

set -u

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
GOV_DIR="$PROJECT_DIR/.governance"
DIRTY_FILE="$GOV_DIR/.dirty"
mkdir -p "$GOV_DIR" 2>/dev/null || true

# Governance source paths that, when edited, must trigger regeneration of
# .governance/CORE.md. Each entry is justified inline. Keep in sync with the
# reading list in skills/gen-governance-core/SKILL.md (reading is wider than
# triggering on purpose: optional sources can still feed extraction when a
# trigger fires from another path).
GOV_PATHS=(
  "AGENTS.md"             # workflow, escalation rules, rule IDs (GOV-*)
  "INTEGRITY-RULES.md"    # non-negotiables (NN-*)
  "CLAUDE.md"             # provider-specific overrides
  "docs/PROJECT_SPECS.md" # CDT criteria (Section 10)
  "docs/decisions.md"     # ADRs that establish behavior rules
  "docs/language-policy.md" # language conventions enforced as rules
)

# Read JSON payload from stdin. Tool input path lives at .tool_input.file_path.
payload="$(cat 2>/dev/null || true)"
[ -z "$payload" ] && exit 0

# Extract edited path; jq is expected to be available in Claude Code environments.
edited_path="$(printf '%s' "$payload" | jq -r '.tool_input.file_path // empty' 2>/dev/null || true)"
[ -z "$edited_path" ] && exit 0

# Normalize to project-relative path when absolute.
case "$edited_path" in
  "$PROJECT_DIR"/*) rel_path="${edited_path#"$PROJECT_DIR"/}" ;;
  /*)               exit 0 ;;  # outside project; ignore
  *)                rel_path="$edited_path" ;;
esac

# Skip anything inside the .governance/ directory (dirty marker + generated files).
case "$rel_path" in
  .governance/*) exit 0 ;;
esac

# Check membership against governance source list.
matched=0
for g in "${GOV_PATHS[@]}"; do
  if [ "$rel_path" = "$g" ]; then
    matched=1
    break
  fi
done
[ "$matched" -eq 0 ] && exit 0

# Append to dirty file (deduplicated, one path per line).
touch "$DIRTY_FILE"
if ! grep -qxF "$rel_path" "$DIRTY_FILE" 2>/dev/null; then
  printf '%s\n' "$rel_path" >> "$DIRTY_FILE"
fi

exit 0
