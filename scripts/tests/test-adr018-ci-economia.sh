#!/usr/bin/env bash
# Test harness for ADR-018 (economia de minutos do Actions).
#
# Protege as quatro decisões que sustentam a economia e, principalmente, as
# armadilhas que as tornam silenciosamente inúteis:
#   - o PR precisa NASCER draft nos DOIS caminhos de criação (gh e fallback REST);
#     esquecer no fallback não quebra nada visivelmente, só volta a gastar minutos;
#   - o job precisa ser pulado por condição de JOB (custo zero), não por
#     early-exit de step (que sobe runner e fatura 1 minuto);
#   - `ready_for_review` sozinho deixaria PR aberto non-draft sem check para sempre;
#   - `gh pr ready` precisa vir DEPOIS do último push da branch.
#
# Sem dependência de js-yaml: `run-tests.sh` roda dentro do CI, que não faz
# `npm ci`. Asserções em grep/sed puro.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
WF="$ROOT/.github/workflows/governance.yml"
DELIVER="$ROOT/skills/delivery/scripts/deliver-to-main.sh"

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

echo "== ADR-018: gatilhos e economia do governance.yml =="

assert "workflow existe" "[ -f '$WF' ]"

# AC-01 — types generosos: `ready_for_review` sozinho deixaria PR aberto
# non-draft (pela UI, por bot, ou pelo fallback REST) sem check para sempre.
assert "types inclui ready_for_review" \
  "grep -qE '^ *types: *\[.*ready_for_review.*\]' '$WF'"
assert "types inclui opened (fecha o buraco do PR aberto já pronto)" \
  "grep -qE '^ *types: *\[.*opened.*\]' '$WF'"
assert "types inclui synchronize (push depois do ready revalida sozinho)" \
  "grep -qE '^ *types: *\[.*synchronize.*\]' '$WF'"

# AC-01 — a economia mora no `if` de JOB. Se alguém remover isso, o custo volta
# sem nenhum sintoma visível: tudo continua verde, só que pagando por push.
assert "job governance tem condição de draft (economia real)" \
  "grep -qE 'github\.event\.pull_request\.draft == false' '$WF'"
assert "condição trata push explicitamente (null == false seria coerção acidental)" \
  "grep -qE \"github\.event_name != 'pull_request' \|\|\" '$WF'"

# AC-02 — cancel-in-progress condicional.
assert "cancel-in-progress é expressão, não literal" \
  "grep -qE '^ *cancel-in-progress: *\\\$\{\{' '$WF'"
assert "cancel-in-progress liga apenas em pull_request" \
  "grep -qE \"cancel-in-progress: .*github\.event_name == 'pull_request'\" '$WF'"

# AC-03 — o modo lite não pula mais eventos de PR, mas segue pulando o bot na main.
assert "lite NÃO pula mais pull_request" \
  "! grep -q 'mode=lite skips pull_request events' '$WF'"
assert "lite ainda pula pushes do github-actions[bot]" \
  "grep -q 'mode=lite skips github-actions\[bot\] pushes' '$WF'"
assert "skip do bot é guardado por EVENT_NAME=push (senão PR de bot pularia)" \
  "grep -qE '\[ \"\\\$EVENT_NAME\" = \"push\" \] && \[ \"\\\$ACTOR\" = \"github-actions\[bot\]\" \]' '$WF'"

echo "== ADR-018: fluxo draft no deliver-to-main.sh =="

assert "script de entrega existe" "[ -f '$DELIVER' ]"

# AC-04 — o PR precisa nascer draft nos DOIS caminhos.
assert "gh pr create usa --draft" \
  "grep -qE 'pr create .*\\\\?$' '$DELIVER' && grep -qE -- '--title \"\\\$title\" --body \"\\\$body\" --draft' '$DELIVER'"
assert "fallback REST manda draft:true (esquecer aqui é silencioso)" \
  "grep -q '\\\\\"draft\\\\\":true' '$DELIVER'"

# AC-04 — ordem: ready depois do último push (o commit de metadata).
assert "mark_pr_ready existe" "grep -qE '^mark_pr_ready\(\) \{' '$DELIVER'"
assert "mark_pr_ready é chamada DEPOIS de update_task_delivery_metadata" \
  "[ \"\$(grep -n 'update_task_delivery_metadata \"\\\$pr_number\"' '$DELIVER' | tail -1 | cut -d: -f1)\" -lt \"\$(grep -n '^mark_pr_ready \"\\\$pr_number\"' '$DELIVER' | tail -1 | cut -d: -f1)\" ]"
assert "falha de gh pr ready é fatal (PR draft não pode ser mergeado)" \
  "grep -q 'O PR ficou em DRAFT' '$DELIVER'"

# Decisão do gestor: auto-merge opt-in.
assert "AUTO_MERGE default é 0 (opt-in)" \
  "grep -qE '^AUTO_MERGE=0' '$DELIVER'"
assert "existe a flag --auto-merge" \
  "grep -qE '^ *--auto-merge\)' '$DELIVER'"
assert "--no-auto-merge segue aceita (compatibilidade)" \
  "grep -qE '^ *--no-auto-merge\)' '$DELIVER'"

# Decisão do gestor: o alarme de cota sobrevive fora do bloco de auto-merge —
# era ele que faltou no incidente de 22/08 (ADR-017).
assert "check_gh_billing_exhaustion é chamado fora do bloco de auto-merge" \
  "[ \"\$(grep -n '^if ! check_gh_billing_exhaustion' '$DELIVER' | wc -l)\" -ge 1 ]"
assert "alarme de cota roda DEPOIS do ready (é quando um run passa a ser esperado)" \
  "[ \"\$(grep -n '^mark_pr_ready \"\\\$pr_number\"' '$DELIVER' | tail -1 | cut -d: -f1)\" -lt \"\$(grep -n '^if ! check_gh_billing_exhaustion' '$DELIVER' | tail -1 | cut -d: -f1)\" ]"

echo ""
echo "ADR-018 harness: $pass passed, $fail failed"
[ "$fail" -eq 0 ] || exit 1
exit 0
