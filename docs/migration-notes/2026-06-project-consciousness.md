# Migration: Project Consciousness Injection — identity + live state + operator slot (2026-06)

**Quando aplicar:** ao sincronizar com upstream após 2026-06-18 (PR #50, commit `6d30727`).
**Para quem:** projetos derivados de `eduoda/agents` que rodam `/update-upstream`.
**Escopo:** injeção descritiva de "consciência de projeto" (identity card + snapshot de estado vivo + slot do operador) no SessionStart/PostCompact; novo `hooks/project-state.sh` e `hooks/inject-operator.sh`; gating do L1 mini por contador de turno; mudança em `.claude/settings.json`. **Requer regenerar `.governance/` e customizar o `IDENTITY.md`.**

> **Nota retroativa (backfill).** Esta feature foi entregue sem nota de migração à época; este documento foi escrito depois para fechar o gap. Datas e commits conferidos no histórico.

## Contexto

A injeção de governança era 100% prescritiva (regras) e 0% descritiva (estado): o agente bootava sabendo suas obrigações mas não **onde estava**, causando o tic de "achar o óbvio" no cold-start e amnésia pós-compactação. Esta migração adiciona duas camadas **descritivas** (nunca prescritivas) e enxuga o L1 mini para não inflar o contexto.

## O que mudou no boilerplate

1. **`.claude/settings.json`** — o hook `PostCompact` passa a chamar também `hooks/project-state.sh` (além do `inject-level.sh l2`).
2. **Novo `skills/gen-governance-core/hooks/project-state.sh`** — injeta:
   - `<project-identity>` (Tier A, estático) lido de `.governance/IDENTITY.md`;
   - `<project-state>` (Tier B, vivo) grepado de `memory-system/` (bootstrap gate, tasks IN_PROGRESS, epics, último fragmento de session-log, workstreams abertos, tech-debt aberto).
3. **Novo `skills/gen-governance-core/hooks/inject-operator.sh`** — injeta `.governance/OPERATOR.md` verbatim (slot livre do operador downstream); silencioso enquanto em branco.
4. **`skills/gen-governance-core/hooks/session-start.sh`** — passa a chamar `project-state.sh` e a resetar o `.governance/.turn-counter`.
5. **`skills/gen-governance-core/hooks/user-prompt.sh`** — o L1 mini deixa de re-injetar **todo turno**; passa a re-injetar a cada `N` prompts (`CLAUDE_GOV_MINI_EVERY`, padrão 5) via `.governance/.turn-counter`; também chama `inject-operator.sh` junto do mini. O footer por turno é inalterado.
6. **Novo `.governance/IDENTITY.md`** — card de identidade **hand-maintained** (não gerado). O do boilerplate descreve o **próprio** boilerplate; **projetos derivados devem sobrescrever** com a sua identidade.
7. **Novo `.governance/OPERATOR.md`** — slot livre do operador; ships em branco.
8. **Novo `memory-system/tech-debt.md`** — registro canônico de tech-debt (alimenta a Tier B).
9. **`.governance/MINI.md`** enxuto (regenerado) + **`SKILL.md`** com o contrato do MINI atualizado.
10. **`.gitignore`** — ignora `.governance/.turn-counter` (marcador runtime).

## Como aplicar no seu projeto derivado

### 1. Rodar `/update-upstream` e resolver conflitos por arquivo

| Arquivo | Política |
|---|---|
| `.claude/settings.json` | **merge manual** — no bloco `PostCompact`, adicione o command de `hooks/project-state.sh` após o `inject-level.sh l2`. Preserve seus hooks customizados. |
| `skills/gen-governance-core/hooks/project-state.sh` | **auto-accept** (novo). |
| `skills/gen-governance-core/hooks/inject-operator.sh` | **auto-accept** (novo). |
| `skills/gen-governance-core/hooks/session-start.sh` | **merge manual** — adote a chamada a `project-state.sh` e o reset do `.turn-counter`. |
| `skills/gen-governance-core/hooks/user-prompt.sh` | **merge manual** — adote o gating do L1 via `.turn-counter` + `CLAUDE_GOV_MINI_EVERY` e a chamada a `inject-operator.sh`. |
| `.governance/IDENTITY.md` | **NÃO use o do upstream como conteúdo final.** Aceite o arquivo, mas **reescreva** com a identidade do SEU projeto (ver passo 2). |
| `.governance/OPERATOR.md` | **auto-accept** (novo, em branco). |
| `memory-system/tech-debt.md` | **auto-accept** se não existir; senão **merge manual** preservando seus itens. |
| `.governance/MINI.md` | **descarte o que veio do upstream**; você regenera no passo 3. |
| `skills/gen-governance-core/SKILL.md` | **merge manual** — adote o contrato atualizado do MINI; preserve customizações. |
| `.gitignore` | **merge manual** — adicione `.governance/.turn-counter`. |

### 2. (Pós-merge, OBRIGATÓRIO) Customizar o `IDENTITY.md`

O `IDENTITY.md` que veio do upstream descreve o **boilerplate**, não o seu projeto. Reescreva-o com PROJECT/OBJECTIVE/ARCHITECTURE/KEY DECISIONS do **seu** projeto. Confira que não restou texto do boilerplate:

```bash
grep -qi 'eduoda/agents boilerplate' .governance/IDENTITY.md && echo "AINDA é o do boilerplate — REESCREVA" || echo "IDENTITY.md customizado"
```

### 3. (Pós-merge, OBRIGATÓRIO) Regenerar `.governance/`

O contrato do MINI mudou (mais enxuto). Regenere a partir das SUAS fontes:

```
/gen-governance-core
```

### 4. (Pós-merge) Conferir a injeção

- Inicie uma sessão nova e confirme os blocos `<project-identity>` e `<project-state>` no contexto.
- Se você preencheu `.governance/OPERATOR.md`, confirme `<operator-notes>`.
- Ajuste a cadência do L1 mini, se quiser, via `CLAUDE_GOV_MINI_EVERY` (padrão 5).

### 5. Validar e entregar

```bash
./scripts/validate-all.sh
bash skills/gen-governance-core/scripts/validate-size.sh
```

Entregue via fluxo normal (`/delivery`).

## Avisos conhecidos

- **A Tier B pode atrasar:** `<project-state>` é grepado em boundary events (SessionStart/PostCompact), não a cada turno — é um snapshot, pode estar desatualizado em relação ao mundo real.
- **Tudo descritivo, nada prescritivo:** as duas camadas dizem ao agente **onde ele está**, não **o que fazer**. Não codifique regras de comportamento no `IDENTITY.md`/`OPERATOR.md` — regras vivem nas fontes de governança e no `.governance/CORE.md` gerado.
