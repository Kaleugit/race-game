#!/usr/bin/env bash
# test-report-error.sh — error tracking mínimo RNF-012 (TASK-leorochapinto-EP-004-05).
#
# Só checagens ESTÁTICAS do contrato (grep): os testes UNIT de
# reportError/cron migraram para tests/unit/report-error.test.ts e rodam via
# `npm test` (ep-check EP-004 M-e).
#
# Contrato verificado: rota do cron com try/catch + reportError + alerta +
# status 500/{ok:false}, e reportError presente nos catch das rotas de
# pipeline/validação.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FAILED=0

echo "==> estático: contrato da rota do cron (500 + ok:false + alerta)"
CRON_ROUTE="$ROOT_DIR/app/api/cron/faturamento/route.ts"
for pattern in "status: 500" "ok: false" "alertarFalhaCronFaturamento" "reportError('cron/faturamento'"; do
  if grep -qF "$pattern" "$CRON_ROUTE"; then
    echo "PASS: cron route contém: $pattern"
  else
    echo "FAIL: cron route sem: $pattern"
    FAILED=1
  fi
done

echo "==> estático: reportError aplicado nas rotas de pipeline/validação"
ROTAS=(
  "app/api/cs/[id]/pipeline/decompor/route.ts"
  "app/api/cs/[id]/pipeline/entregavel/route.ts"
  "app/api/cs/[id]/pipeline/doc/[docId]/route.ts"
  "app/api/cs/[id]/pipeline/validar/doc/[docId]/route.ts"
  "app/api/cs/[id]/pipeline/validar/entregavel/route.ts"
  "app/api/cs/[id]/pipeline/validar/sintese/route.ts"
  "app/api/validar-entregas/route.ts"
  "app/api/cs/[id]/rodar-tudo/route.ts"
  "app/api/cs/[id]/validar/route.ts"
)
for rota in "${ROTAS[@]}"; do
  if grep -q "reportError(" "$ROOT_DIR/$rota"; then
    echo "PASS: $rota"
  else
    echo "FAIL: $rota sem reportError()"
    FAILED=1
  fi
done

if [[ "$FAILED" -ne 0 ]]; then
  echo "test-report-error: FAILED"
  exit 1
fi
echo "test-report-error: OK"
