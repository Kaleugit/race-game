# Relatório de Validação — Épico {EPIC_ID}: {EPIC_NAME}

**Data**: {DATE}
**Veredito final**: {VERDICT}  <!-- GO | AWAITING HUMAN VALIDATION | NO-GO -->
**Modo desta execução**: {RUN_MODE}  <!-- Full | Re-check (incremental) -->

## Baseline (para re-check incremental)

| Campo | Valor |
|-------|-------|
| SHA validado | {BASELINE_SHA} |
| Findings ainda abertos | {OPEN_FINDINGS_COUNT} |

---

## 1. Identificação do Épico

| Campo | Valor |
|-------|-------|
| ID | {EPIC_ID} |
| Nome | {EPIC_NAME} |
| Escopo | {EPIC_SCOPE} |
| Tasks | {TASK_COUNT} concluídas |

## 2. Pré-voo (Pre-flight)

### Status das Tasks

| Task ID | Status | Evidência | Delivery |
|---------|--------|-----------|----------|
| {TASK_ID} | {STATUS} | {EVIDENCE} | {DELIVERY_STATUS} |

**Resultado do pré-voo**: {PREFLIGHT_RESULT}

## 3. Achados por Dimensão

### 3.1 Backend
{BACKEND_FINDINGS}

### 3.2 Frontend
{FRONTEND_FINDINGS}

### 3.3 Testing
{TESTING_FINDINGS}

### 3.4 Segurança
{SECURITY_FINDINGS}

### 3.5 DevOps
{DEVOPS_FINDINGS}

### 3.6 Code Review
{REVIEW_FINDINGS}

## 4. Resumo de Testes

| Suite | Total | Passou | Falhou | Cobertura |
|-------|-------|--------|--------|-----------|
| Unit | {N} | {N} | {N} | {N}% |
| Integration | {N} | {N} | {N} | {N}% |
| E2E | {N} | {N} | {N} | — |

## 5. Achados por Severidade

### Critical (bloqueia)
{CRITICAL_FINDINGS}

### High (bloqueia — nunca deferível, deve ser resolvido)
{HIGH_FINDINGS}

### Medium (corrigir, ou prosseguir só com deferral humano aprovado e rastreado)
{MEDIUM_FINDINGS}

### Low (corrigir, ou prosseguir só com deferral humano aprovado e rastreado)
{LOW_FINDINGS}

## 6. Política Zero-Leftover — Ledger de Findings

Ao fechar o épico, NADA fica para trás (nem Low), salvo deferral aprovado pelo
humano. Cada finding está RESOLVIDO ou DEFERIDO; um deferral é **decisão exclusiva
do humano**, com **motivo registrado** (obrigatório) e item de rastreamento.

| Finding | Severidade | Status | Deferral aprovado por | Motivo (obrigatório) | Rastreamento |
|---------|-----------|--------|-----------------------|----------------------|--------------|
| {FINDING} | {SEV} | RESOLVIDO / DEFERIDO | {HUMAN ou —} | {REASON ou —} | {TECH_DEBT/ISSUE ou —} |

> Critical/High NUNCA são deferíveis — devem ser resolvidos. Deferral sem motivo
> registrado é inválido. Agente jamais auto-aprova deferral.

## 7. Gates Humanos (BLOQUEANTES)

### 7.1 Delta Arquitetural (consciência) — `docs/reviews/EPIC-{EPIC_ID}-arch-delta.md`

| Campo | Valor |
|-------|-------|
| Status | RECONHECIDO / PENDING |
| Reconhecido por | {HUMAN ou —} |
| Data | {DATE ou —} |

### 7.2 Teste Manual de UX (posse) — `docs/reviews/EPIC-{EPIC_ID}-ux-test.md`

| Campo | Valor |
|-------|-------|
| Resultado | PASS / FAIL / PENDING / N/A |
| Testado por | {HUMAN ou —} |
| Passos FAIL (viram findings High) | {FAILED_STEPS ou —} |
| Justificativa N/A (se aplicável) | {NA_JUSTIFICATION ou —} |

## 8. Veredito Final

**{VERDICT}**: {VERDICT_JUSTIFICATION}

> GO = técnico limpo (ou deferrals aprovados) **e** delta reconhecido **e** UX
> PASS/N/A. AWAITING HUMAN VALIDATION = técnico OK mas um gate `PENDING`.
> NO-GO = finding bloqueante aberto ou UX FAIL.

{IF_NO_GO}
### Ações Corretivas Necessárias
{CORRECTIVE_ACTIONS}
{/IF_NO_GO}

{IF_AWAITING}
### Ações Humanas Pendentes
{PENDING_HUMAN_ACTIONS}
{/IF_AWAITING}

{IF_GO}
### Próximo Épico
{NEXT_EPIC_INFO}
{/IF_GO}

## 9. Recomendações

{RECOMMENDATIONS}

## 10. Contratos/Specs que Podem Precisar de Atualização

{CONTRACTS_TO_UPDATE}
