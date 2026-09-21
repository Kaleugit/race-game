# Plano de Teste Manual de UX — Épico {EPIC_ID}: {EPIC_NAME}

**Data**: {DATE}
**Gate**: 4.2 — Posse da UX (BLOQUEANTE)
**Executor**: humano (a UX é a única responsabilidade de teste do humano)

> Propósito: você exercita a UX real à mão e dá o veredito PASS/FAIL. O e2e do
> agente (Phase 2.2) já provou que a fiação funciona; aqui você prova que a
> experiência é aceitável. Execute cada passo e marque PASS ou FAIL.

---

## Como subir a aplicação localmente

```
{HOW_TO_LAUNCH}
```

URL / ponto de entrada: {ENTRY_POINT}

## Roteiro

Cada passo deriva de um critério de aceite de UX (CA-UX / RF user-facing) do épico.

### Passo 1 — {STEP_TITLE} (deriva de {CA_REF})
- **Ação**: {ACTION}
- **Resultado esperado (observável)**: {EXPECTED}
- **Resultado**: [ ] PASS  [ ] FAIL
- **Observação (se FAIL, descreva o que viu)**: {NOTE}

### Passo 2 — {STEP_TITLE} (deriva de {CA_REF})
- **Ação**: {ACTION}
- **Resultado esperado (observável)**: {EXPECTED}
- **Resultado**: [ ] PASS  [ ] FAIL
- **Observação**: {NOTE}

<!-- repita por critério de aceite de UX do épico -->

---

## Veredito da UX (preenchido pelo humano)

- [ ] **PASS** — todos os passos PASS.
- [ ] **FAIL** — ao menos um passo FAIL (cada falha vira finding High + item de
      tech-debt/issue com os passos de reprodução).

Testado por: {HUMAN} — {DATE}

> Enquanto não executado, o gate fica `PENDING` e o veredito do épico fica
> `AWAITING HUMAN VALIDATION`. Um FAIL leva o épico a `NO-GO`.
