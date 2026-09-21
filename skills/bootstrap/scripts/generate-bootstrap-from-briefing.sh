#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
BRIEFING_FILE="$ROOT_DIR/BRIEFING.md"
SPECS_FILE="$ROOT_DIR/docs/PROJECT_SPECS.md"
CONTEXT_FILE="$ROOT_DIR/memory-system/1-project-context.md"
README_FILE="$ROOT_DIR/README.md"
TASKS_FILE="$ROOT_DIR/memory-system/2-tasks.md"
TODAY="$(date +%F)"
NOW_UTC="$(date -u +%Y%m%d%H%M%S)"
FORCE_OVERWRITE=0

usage() {
  cat <<'USAGE'
Usage:
  generate-bootstrap-from-briefing.sh [--force-overwrite]

Options:
  --force-overwrite   overwrite non-draft specs/context/readme files.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force-overwrite)
      FORCE_OVERWRITE=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "ERROR: unknown option '$1'"
      usage
      exit 1
      ;;
  esac
done

if [[ ! -f "$BRIEFING_FILE" ]]; then
  echo "ERROR: BRIEFING.md not found at repository root"
  exit 1
fi

if [[ ! -s "$BRIEFING_FILE" ]]; then
  echo "ERROR: BRIEFING.md is empty"
  exit 1
fi

briefing_looks_placeholder() {
  local file="$1"
  if grep -q 'Descrição livre do projeto (estado `PRE_BOOTSTRAP`).' "$file" \
    && grep -q '^Use este arquivo para explicar, em linguagem natural:' "$file"; then
    return 0
  fi
  return 1
}

if [[ ! -f "$SPECS_FILE" ]]; then
  echo "ERROR: missing required file: ${SPECS_FILE#"$ROOT_DIR"/}"
  exit 1
fi

if [[ ! -f "$CONTEXT_FILE" ]]; then
  echo "ERROR: missing required file: ${CONTEXT_FILE#"$ROOT_DIR"/}"
  exit 1
fi

briefing_excerpt="$(awk 'NF {print "> " $0}' "$BRIEFING_FILE" | sed -n '1,12p')"
if [[ -z "$briefing_excerpt" ]]; then
  briefing_excerpt="> TO_CONFIRM"
fi

is_bootstrap_draft() {
  local file="$1"
  [[ -f "$file" ]] || return 0

  if grep -q 'Origem de bootstrap: `BRIEFING.md`' "$file" \
    && grep -Eq 'TO_CONFIRM|YYYY-MM-DD|\[Item\]|\[Project Name\]|Bootstrap scaffold|\[Primary goal\]' "$file"; then
    return 0
  fi

  return 1
}

is_project_readme_draft() {
  local file="$1"
  [[ -f "$file" ]] || return 0

  if grep -q '^# Boilerplate Multi-IA para Desenvolvimento com Agentes' "$file"; then
    return 0
  fi

  if grep -q '<!-- BOOTSTRAP_PROJECT_README_TEMPLATE -->' "$file"; then
    return 0
  fi

  return 1
}

guard_overwrite() {
  local file="$1"
  local label="$2"
  local detector="$3"
  local backup

  [[ -f "$file" ]] || return 0

  if [[ "$FORCE_OVERWRITE" -eq 0 ]] && ! "$detector" "$file"; then
    echo "ERROR: refusing to overwrite ${label} because it looks like refined content."
    echo "Use --force-overwrite to overwrite intentionally."
    exit 1
  fi

  backup="${file}.bak.${NOW_UTC}"
  cp "$file" "$backup"
  echo "Backup created: ${backup#"$ROOT_DIR"/}"
}

guard_overwrite "$SPECS_FILE" "docs/PROJECT_SPECS.md" is_bootstrap_draft
guard_overwrite "$CONTEXT_FILE" "memory-system/1-project-context.md" is_bootstrap_draft
guard_overwrite "$README_FILE" "README.md" is_project_readme_draft

update_specs() {
  local tmp_file
  tmp_file="$(mktemp)"

  sed -i "s/^Última atualização: YYYY-MM-DD$/Última atualização: ${TODAY}/" "$SPECS_FILE"
  sed -i "s/^- YYYY-MM-DD - \\[Mudança\\] - \\[Motivo\\]$/- ${TODAY} - Bootstrap scaffold atualizado a partir de BRIEFING - Pendências TO_CONFIRM/" "$SPECS_FILE"

  if ! grep -q '^## 10\. Fonte de Bootstrap (Resumo Livre)' "$SPECS_FILE"; then
    awk -v excerpt="$briefing_excerpt" '
      /^---$/ && !inserted {
        print "## 10. Fonte de Bootstrap (Resumo Livre)"
        print excerpt
        print ""
        inserted=1
      }
      {print}
    ' "$SPECS_FILE" > "$tmp_file"
    mv "$tmp_file" "$SPECS_FILE"
  fi
}

update_context() {
  local tmp_file
  tmp_file="$(mktemp)"

  sed -i "s/^\\*\\*Last Updated:\\*\\* YYYY-MM-DD$/**Last Updated:** ${TODAY}/" "$CONTEXT_FILE"
  sed -i "s/^\\*Last Updated: YYYY-MM-DD\\*$/*Last Updated: ${TODAY}*/" "$CONTEXT_FILE"

  if ! grep -q '^## Bootstrap Source Snapshot' "$CONTEXT_FILE"; then
    awk -v excerpt="$briefing_excerpt" '
      /^## Important Conventions/ && !inserted {
        print "## Bootstrap Source Snapshot"
        print excerpt
        print ""
        inserted=1
      }
      {print}
    ' "$CONTEXT_FILE" > "$tmp_file"
    mv "$tmp_file" "$CONTEXT_FILE"
  fi
}

infer_project_name() {
  local candidate
  candidate="$(awk '
    /^#/ {
      sub(/^#+[[:space:]]*/, "", $0)
      if ($0 != "" && $0 != "BRIEFING") {
        print $0
        exit
      }
    }
  ' "$BRIEFING_FILE")"

  if [[ -n "$candidate" ]] && ! briefing_looks_placeholder "$BRIEFING_FILE"; then
    echo "$candidate"
    return
  fi

  echo "[Nome do Projeto]"
}

update_project_readme_template() {
  local project_name
  project_name="$(infer_project_name)"

  cat > "$README_FILE" <<EOF
<!-- BOOTSTRAP_PROJECT_README_TEMPLATE -->
# ${project_name}

Template inicial de README gerado pela skill \`bootstrap\`.
Atualize este arquivo com a skill \`update-docs\` e confirmação humana.

## Visão Geral
- Produto: TO_CONFIRM
- Público-alvo: TO_CONFIRM
- Problema que resolve: TO_CONFIRM
- Objetivo principal: TO_CONFIRM

## Escopo Inicial
### Incluído
- TO_CONFIRM

### Fora de escopo
- TO_CONFIRM

## Requisitos Funcionais Iniciais
- RF-001: TO_CONFIRM

## Critérios de Aceite Iniciais
- CA-001: TO_CONFIRM

## Fonte de Bootstrap (Resumo do BRIEFING)
${briefing_excerpt}

## Próximos Passos
1. Atualizar \`docs/PROJECT_SPECS.md\` com os fatos confirmados.
2. Atualizar \`memory-system/1-project-context.md\` com contexto operacional.
3. Refinar este README com \`skills/update-docs/\`.

---
Última atualização: ${TODAY}
EOF
}

update_specs
update_context
update_project_readme_template

# Update bootstrap status PRE_BOOTSTRAP -> INCOMPLETE only when BRIEFING is project-specific.
if [[ -f "$TASKS_FILE" ]]; then
  if grep -q '^- Current Status: `PRE_BOOTSTRAP`' "$TASKS_FILE"; then
    if briefing_looks_placeholder "$BRIEFING_FILE"; then
      echo "Bootstrap status kept as PRE_BOOTSTRAP (BRIEFING.md still looks like template placeholder)."
    else
      sed -i 's/^- Current Status: `PRE_BOOTSTRAP`/- Current Status: `INCOMPLETE`/' "$TASKS_FILE"
      echo "Bootstrap status moved PRE_BOOTSTRAP -> INCOMPLETE (BRIEFING.md is project-specific)."
    fi
  fi
fi

echo "Bootstrap scaffold updated from existing base docs (no semantic inference)."
echo "- Updated: docs/PROJECT_SPECS.md"
echo "- Updated: memory-system/1-project-context.md"
echo "- Replaced: README.md (project template scaffold)"
echo "- Bootstrap status update validated against BRIEFING.md state"
echo "Next: fill semantic fields with human+LLM before setting bootstrap to COMPLETE."
echo "After COMPLETE, run /gen-epics and approve docs/EPICOS.md before moving to READY_FOR_EXECUTION."
