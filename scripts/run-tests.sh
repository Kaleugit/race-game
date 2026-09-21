#!/usr/bin/env bash
# run-tests.sh
#
# Runs every bash test harness under scripts/tests/ (test-*.sh) and reports an
# aggregate verdict. Wired into scripts/validate-all.sh so the harnesses are
# actually executed by the governance gate / CI (previously they were orphan
# harnesses never run by any automation).
#
# Usage:
#   ./scripts/run-tests.sh
#
# Exit codes:
#   0 all harnesses passed (or none found)
#   1 one or more harnesses failed
set -euo pipefail

# Harnesses build their own throwaway git repos. When this runner is invoked
# from a pre-commit hook, git exports GIT_DIR/GIT_INDEX_FILE/etc into the
# environment; those would leak into the harnesses' git calls and corrupt them.
# Strip the ambient git context so each harness starts clean.
unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE GIT_PREFIX GIT_COMMON_DIR 2>/dev/null || true

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TESTS_DIR="$ROOT_DIR/scripts/tests"
FAILED=0
FAILED_NAMES=""
RAN=0
SKIPPED_COUNT=0
SKIPPED_NAMES=""
BUSY_COUNT=0
BUSY_NAMES=""

if [[ ! -d "$TESTS_DIR" ]]; then
  echo "INFO: no scripts/tests directory; nothing to run."
  exit 0
fi

# Reset de ambiente ANTES do loop (EP-008 fix round / devops-F2): um `next dev`
# vazado de uma execução anterior (CWD == este root) segura o `.next/dev/lock`
# project-global e faria TODOS os harnesses e2e/DB SKIParem — verde-com-SKIP
# mascarando cobertura. Reusa as funções DRY do teardown (sem duplicar lógica):
# mata os next/next-server desta árvore por CWD e remove o lock preso (pid morto).
# shellcheck source=scripts/tests/lib/next-dev-teardown.sh
if [[ -f "$TESTS_DIR/lib/next-dev-teardown.sh" ]]; then
  . "$TESTS_DIR/lib/next-dev-teardown.sh"
  _next_dev_kill_by_cwd "$ROOT_DIR"      # mata next dev vazado desta árvore
  # next_dev_guard_or_skip remove o lock preso (pid morto); com pid VIVO ele
  # emite SKIP-BUSY + exit 0 — rodado em SUBSHELL para o gate FALHAR alto em vez
  # de sair verde silencioso (anti verde-vácuo, ep-check EP-008 H2b).
  guard_out="$( (next_dev_guard_or_skip "$ROOT_DIR") 2>&1 || true )"
  if [[ "$guard_out" == *SKIP-BUSY:* ]]; then
    echo "$guard_out"
    echo "Test harnesses FAILED: next dev residual VIVO segura o lock deste checkout (preflight). Mate o processo e rode novamente."
    exit 1
  fi
fi

HARNESS_OUT="$(mktemp)"
trap 'rm -f "$HARNESS_OUT"' EXIT

for t in "$TESTS_DIR"/test-*.sh; do
  [[ -e "$t" ]] || continue   # glob matched nothing
  RAN=$((RAN + 1))
  echo "==> Running tests/$(basename "$t")"
  # tee: preserva o streaming do output E permite contar SKIPs no sumário
  # (ep-check EP-004 M-a: SKIP silencioso não pode virar verde-vácuo invisível).
  # pipefail garante que o status refletido no if é o do harness, não o do tee.
  if bash "$t" 2>&1 | tee "$HARNESS_OUT"; then
    # SKIP-BUSY = ambiente OCUPADO (porta tomada / next dev lock vivo), não
    # pré-requisito ausente (ep-check EP-008 H2b). Um harness que não RODOU por
    # resíduo de outro processo não pode passar o gate: vira FALHA agregada
    # (anti verde-vácuo). SKIPs verdadeiros (env/CI sem deps) continuam 0.
    if grep -q '^SKIP-BUSY:' "$HARNESS_OUT"; then
      BUSY_COUNT=$((BUSY_COUNT + 1))
      BUSY_NAMES="${BUSY_NAMES:+$BUSY_NAMES, }$(basename "$t")"
      echo "BUSY: $(basename "$t") (ambiente ocupado — gate NÃO passa)"
    elif grep -q '^SKIP:' "$HARNESS_OUT"; then
      SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
      SKIPPED_NAMES="${SKIPPED_NAMES:+$SKIPPED_NAMES, }$(basename "$t")"
      echo "OK: $(basename "$t")"
    else
      echo "OK: $(basename "$t")"
    fi
  else
    echo "FAIL: $(basename "$t")"
    FAILED=1
    # Coleta o NOME do harness que falhou para o sumário agregado (ep-check
    # EP-009 M6): sem isso, achar o culpado exigia rolar o log inteiro.
    FAILED_NAMES="${FAILED_NAMES:+$FAILED_NAMES, }$(basename "$t")"
  fi
  echo
done

if [[ "$RAN" -eq 0 ]]; then
  echo "INFO: no test-*.sh harnesses found."
  exit 0
fi

if [[ "$FAILED" -ne 0 ]]; then
  echo "Test harnesses FAILED: $FAILED_NAMES"
  exit 1
fi

if [[ "$BUSY_COUNT" -gt 0 ]]; then
  echo "Test harnesses FAILED: $BUSY_COUNT harness(es) com SKIP-BUSY (ambiente ocupado): $BUSY_NAMES"
  echo "Libere as portas/locks residuais (next dev vazado) e rode novamente."
  exit 1
fi

if [[ "$SKIPPED_COUNT" -gt 0 ]]; then
  echo "All $RAN test harness(es) passed ($SKIPPED_COUNT SKIPPED: $SKIPPED_NAMES)"
else
  echo "All $RAN test harness(es) passed"
fi
