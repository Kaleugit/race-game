# Migration: Context-meter default window = 1M (2026-06)

**Quando aplicar:** ao sincronizar com upstream após 2026-06-22.
**Para quem:** projetos derivados de `eduoda/agents` que rodam `/update-upstream`.
**Escopo:** `scripts/context-meter.sh` agora assume janela de **1M** por padrão no fallback de transcript (antes assumia 200k). **Sem mudança em `.claude/settings.json`** e **sem regenerar `.governance/`**.

## Contexto

O `context-guard` avisava falsamente "contexto acabando" em sessões Opus/Sonnet de **1M**, porque o fallback do `context-meter.sh` media contra 200k. RTFM (já documentado): o transcript grava o id base do modelo **sem** o marcador `[1m]`, e hooks **não** acessam a janela oficial (só o statusLine acessa). Logo a janela não é inferível do transcript — e o default de 200k produzia falso-alto na faixa 150k–200k tokens (ex.: 165k → "82%").

Correção: o fallback agora **default = 1M** (o tier que o operador roda). Quem usa modelo de 200k define `CLAUDE_GOV_CTX_WINDOW=200000`, ou ativa o statusLine (medição exata em runtime).

## O que mudou no boilerplate

1. `scripts/context-meter.sh` — fallback default de 200k → **1M**; removida a inferência por id de modelo (não confiável) e o auto-bump (redundante com 1M). Override `CLAUDE_GOV_CTX_WINDOW` inalterado.
2. `scripts/tests/test-context-meter.sh` — casos atualizados para o contrato 1M; Test 6 passa a provar o escape hatch `CLAUDE_GOV_CTX_WINDOW=200000`.

## Como aplicar no seu projeto derivado

| Arquivo | Política |
|---|---|
| `scripts/context-meter.sh` | **merge manual** se você customizou; senão **auto-accept**. Adote o default 1M. |
| `scripts/tests/test-context-meter.sh` | **auto-accept** (entra no gate via `scripts/run-tests.sh`). |

Pós-merge: `./scripts/run-tests.sh` deve listar `test-context-meter.sh` com `PASS=9 FAIL=0`.

## Avisos conhecidos

- **Operadores em modelo de 200k:** definam `CLAUDE_GOV_CTX_WINDOW=200000` (env), senão os avisos do guard chegam tarde. Alternativa melhor: ativar o statusLine (`docs/statusline-optional.md`) — aí o `%` vem oficial e a janela é irrelevante.
- Substitui o conselho inverso (`CLAUDE_GOV_CTX_WINDOW=1000000`) da nota `2026-06-context-guard.md` → agora 1M é o default.
