#!/usr/bin/env bash
set -euo pipefail

# Skill taxonomy validator — aligned with skills/gen-skill/references/interoperable-skills-model.md
# Validates:
#  1. Every skills/*/SKILL.md has valid name and description in frontmatter.
#  2. name matches the parent directory name.
#  3. metadata.kind is persona or workflow.
#  4. Persona skills have user-invocable: false in frontmatter.
#  5. Persona skills have a matching .claude/agents/<name>.md subagent adapter.
#  6. Subagent adapters have skills: [<name>] in frontmatter.
#  7. Workflow skills do NOT have a subagent adapter.
#  8. No files exist in .claude/commands/ (deprecated).
#  9. Symlinks .claude/skills and .agents/skills exist and point to ../skills.
# 10. No SKILL.md uses forbidden fields: kind (top-level), context, agent.
# 11. Workflow skills must NOT use disable-model-invocation (deprecated).

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILLS_DIR="$ROOT_DIR/skills"
CLAUDE_AGENTS_DIR="$ROOT_DIR/.claude/agents"
CLAUDE_COMMANDS_DIR="$ROOT_DIR/.claude/commands"
FAILURES=0

fail() {
  echo "ERROR: $1"
  FAILURES=1
}

warn() {
  echo "WARN: $1"
}

trim() {
  local value="$1"
  echo "$value" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//'
}

has_yaml_frontmatter() {
  local file="$1"
  if [[ "$(head -n1 "$file" 2>/dev/null || true)" != "---" ]]; then
    return 1
  fi

  awk '
    NR > 1 && $0 == "---" { found=1; exit }
    END { exit !found }
  ' "$file"
}

# Extract a top-level frontmatter field (key: value on a single line).
extract_frontmatter_field() {
  local file="$1"
  local key="$2"

  awk -v wanted_key="$key" '
    BEGIN { in_fm=0 }
    NR==1 && $0=="---" { in_fm=1; next }
    in_fm && $0=="---" { exit }
    in_fm {
      if ($0 ~ "^" wanted_key ":[[:space:]]*") {
        line=$0
        sub("^[^:]+:[[:space:]]*", "", line)
        print line
        exit
      }
    }
  ' "$file"
}

# Extract metadata.kind from nested YAML (metadata:\n  kind: value).
extract_metadata_kind() {
  local file="$1"

  awk '
    BEGIN { in_fm=0; in_metadata=0 }
    NR==1 && $0=="---" { in_fm=1; next }
    in_fm && $0=="---" { exit }
    in_fm && $0 ~ /^metadata:[[:space:]]*$/ { in_metadata=1; next }
    in_fm && in_metadata && $0 ~ /^[[:space:]]+kind:[[:space:]]*/ {
      line=$0
      sub("^[[:space:]]+kind:[[:space:]]*", "", line)
      print line
      exit
    }
    in_fm && in_metadata && $0 ~ /^[^[:space:]]/ { in_metadata=0 }
  ' "$file"
}

frontmatter_has_line() {
  local file="$1"
  local pattern="$2"

  awk -v wanted_pattern="$pattern" '
    BEGIN { in_fm=0; found=0 }
    NR==1 && $0=="---" { in_fm=1; next }
    in_fm && $0=="---" { exit }
    in_fm && $0 ~ wanted_pattern { found=1 }
    END { exit !found }
  ' "$file"
}

# Check top-level forbidden field exists in frontmatter.
has_forbidden_toplevel_field() {
  local file="$1"
  local field="$2"

  awk -v f="$field" '
    BEGIN { in_fm=0 }
    NR==1 && $0=="---" { in_fm=1; next }
    in_fm && $0=="---" { exit }
    in_fm && $0 ~ "^" f ":[[:space:]]" { found=1; exit }
    END { exit !found }
  ' "$file"
}

# --- Pre-checks ---

if [[ ! -d "$SKILLS_DIR" ]]; then
  fail "missing skills directory: skills/"
fi

if [[ ! -d "$CLAUDE_AGENTS_DIR" ]]; then
  fail "missing Claude subagent adapters directory: .claude/agents/"
fi

# Rule 8: .claude/commands/ must not exist or must be empty.
if [[ -d "$CLAUDE_COMMANDS_DIR" ]]; then
  shopt -s nullglob
  cmd_files=("$CLAUDE_COMMANDS_DIR"/*.md)
  shopt -u nullglob
  if [[ ${#cmd_files[@]} -gt 0 ]]; then
    for cf in "${cmd_files[@]}"; do
      fail ".claude/commands/ is deprecated: remove ${cf#"$ROOT_DIR"/}"
    done
  fi
fi

# Rule 9: Symlinks must exist and point to ../skills.
for symlink_path in "$ROOT_DIR/.claude/skills" "$ROOT_DIR/.agents/skills"; do
  rel_path="${symlink_path#"$ROOT_DIR"/}"
  if [[ ! -L "$symlink_path" ]]; then
    fail "missing symlink: $rel_path (should point to ../skills)"
  else
    target="$(readlink "$symlink_path")"
    # Normalize: remove trailing slash for comparison.
    target="${target%/}"
    if [[ "$target" != "../skills" ]]; then
      fail "symlink $rel_path points to '$target' instead of '../skills'"
    fi
  fi
done

# --- Per-skill validation ---

while IFS= read -r skill_file; do
  skill_dir="$(dirname "$skill_file")"
  skill_name="$(basename "$skill_dir")"

  # Rule 1: name and description must exist.
  fm_name_raw="$(extract_frontmatter_field "$skill_file" "name" || true)"
  fm_name="$(trim "$fm_name_raw")"
  if [[ -z "$fm_name" ]]; then
    fail "missing 'name' in skills/${skill_name}/SKILL.md"
  fi

  fm_desc_raw="$(extract_frontmatter_field "$skill_file" "description" || true)"
  fm_desc="$(trim "$fm_desc_raw")"
  if [[ -z "$fm_desc" ]]; then
    fail "missing 'description' in skills/${skill_name}/SKILL.md"
  fi

  # Rule 2: name must match directory name.
  if [[ -n "$fm_name" && "$fm_name" != "$skill_name" ]]; then
    fail "name mismatch in skills/${skill_name}/SKILL.md: frontmatter name='${fm_name}', directory='${skill_name}'"
  fi

  # Rule 10: Forbidden top-level fields.
  for forbidden in kind context agent; do
    if has_forbidden_toplevel_field "$skill_file" "$forbidden"; then
      fail "forbidden top-level field '${forbidden}' in skills/${skill_name}/SKILL.md (use metadata.kind instead of kind)"
    fi
  done

  # Rule 3: metadata.kind must be persona or workflow.
  kind_raw="$(extract_metadata_kind "$skill_file" || true)"
  kind="$(trim "$kind_raw")"

  if [[ -z "$kind" ]]; then
    fail "missing 'metadata.kind' in skills/${skill_name}/SKILL.md"
    continue
  fi

  if [[ "$kind" != "persona" && "$kind" != "workflow" ]]; then
    fail "invalid metadata.kind '${kind}' in skills/${skill_name}/SKILL.md (expected persona|workflow)"
    continue
  fi

  if [[ "$kind" == "persona" ]]; then
    # Rule 4: Persona skills must have user-invocable: false.
    ui_raw="$(extract_frontmatter_field "$skill_file" "user-invocable" || true)"
    ui="$(trim "$ui_raw")"
    if [[ "$ui" != "false" ]]; then
      fail "persona skill skills/${skill_name}/SKILL.md must have 'user-invocable: false'"
    fi

    # Rule 5: Persona skills must have a matching subagent adapter.
    adapter_path="$CLAUDE_AGENTS_DIR/${skill_name}.md"
    if [[ ! -f "$adapter_path" ]]; then
      fail "missing Claude subagent adapter for persona skill '${skill_name}': .claude/agents/${skill_name}.md"
      continue
    fi

    if ! has_yaml_frontmatter "$adapter_path"; then
      fail "invalid frontmatter in .claude/agents/${skill_name}.md"
      continue
    fi

    # Rule 6: Adapter must preload the skill.
    if ! frontmatter_has_line "$adapter_path" "^[[:space:]]*skills:[[:space:]]*$"; then
      fail "missing 'skills' block in .claude/agents/${skill_name}.md"
    fi

    if ! frontmatter_has_line "$adapter_path" "^[[:space:]]*-[[:space:]]*${skill_name}[[:space:]]*$"; then
      fail "subagent adapter must preload skill '${skill_name}' in .claude/agents/${skill_name}.md"
    fi

    # Check adapter has name matching skill.
    adapter_name_raw="$(extract_frontmatter_field "$adapter_path" "name" || true)"
    adapter_name="$(trim "$adapter_name_raw")"
    if [[ -n "$adapter_name" && "$adapter_name" != "$skill_name" ]]; then
      fail "adapter name mismatch in .claude/agents/${skill_name}.md: expected '${skill_name}', found '${adapter_name}'"
    fi
  fi

  if [[ "$kind" == "workflow" ]]; then
    # Rule 7: Workflow skills must NOT have a subagent adapter.
    adapter_path="$CLAUDE_AGENTS_DIR/${skill_name}.md"
    if [[ -f "$adapter_path" ]]; then
      fail "workflow skill '${skill_name}' must NOT have a subagent adapter: .claude/agents/${skill_name}.md"
    fi

    # Rule 11: Workflow skills must NOT use disable-model-invocation (deprecated).
    dmi_raw="$(extract_frontmatter_field "$skill_file" "disable-model-invocation" || true)"
    dmi="$(trim "$dmi_raw")"
    if [[ "$dmi" == "true" ]]; then
      fail "workflow skill skills/${skill_name}/SKILL.md must NOT have 'disable-model-invocation: true' (deprecated — blocks slash command invocation)"
    fi
  fi

done < <(find "$SKILLS_DIR" -mindepth 2 -maxdepth 2 -type f -name 'SKILL.md' | sort)

# Warn for orphan adapters without matching skill.
shopt -s nullglob
for adapter in "$CLAUDE_AGENTS_DIR"/*.md; do
  adapter_skill_name="$(basename "$adapter" .md)"
  if [[ ! -f "$SKILLS_DIR/$adapter_skill_name/SKILL.md" ]]; then
    warn "orphan Claude adapter without matching skill: .claude/agents/${adapter_skill_name}.md"
  fi
done
shopt -u nullglob

if [[ "$FAILURES" -eq 0 ]]; then
  echo "OK: skill taxonomy validation passed"
fi

exit "$FAILURES"
