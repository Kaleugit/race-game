# Migration: Context-Exhaustion Guard + Session Handoff (2026-06)

**Quando aplicar:** ao sincronizar com upstream após 2026-06-18.
**Para quem:** projetos derivados de `eduoda/agents` que rodam `/update-upstream`.
**Escopo:** guard de contexto por turno que avisa em 75%/85% e oferece gerar um documento de handoff; novos `scripts/context-meter.sh` e `hooks/context-guard.sh`; wiring no `user-prompt.sh` existente; ponteiro de handoff no `project-state.sh`; snippet opcional de statusline. **Sem mudança em `.claude/settings.json`** e **sem necessidade de regenerar `.governance/`**.

## Contexto

Sessões longas esgotam o contexto e o operador perde o trabalho ao precisar recomeçar do zero. Este guard monitora o consumo de contexto e, ao se aproximar do limite, encaminha a sessão para um fechamento limpo e mantém um documento de handoff versionado para retomada em sessão nova.

RTFM (confirmado nos docs do Claude Code): o `%` de contexto é exposto **apenas** ao comando de *statusLine*, **nunca** a hooks. Por isso a medição é híbrida (statusLine grava o número oficial; o hook cai no parse do transcript como fallback) — ver `## Avisos conhecidos`.

## O que mudou no boilerplate

1. **Novo `scripts/context-meter.sh`** — ecoa o `%` de contexto (inteiro) ou nada. Híbrido, fail-open:
   - autoritativo: lê `.governance/.context-pct` (gravado pelo statusline opcional) enquanto fresco (TTL `CLAUDE_GOV_CTX_PCT_TTL`, padrão 60s);
   - fallback: soma o `usage` (`input + cache_creation + cache_read`) da última mensagem do transcript ÷ janela.
2. **Novo `scripts/tests/test-context-meter.sh`** (9 casos) — entra automaticamente no gate via `scripts/run-tests.sh`.
3. **Novo `skills/gen-governance-core/hooks/context-guard.sh`** — roda a cada turno:
   - `≥ CLAUDE_GOV_CTX_WARN` (padrão 75%): warning — encerrar unidade atual, não iniciar trabalho grande;
   - `≥ CLAUDE_GOV_CTX_CRIT` (padrão 85%): pergunta ao operador se gera o handoff (ou, se já existe, atualiza a cada turno) e encaminha o fechamento.
4. **`skills/gen-governance-core/hooks/user-prompt.sh`**: passa a ler o payload do stdin para extrair `transcript_path` e chama `context-guard.sh` **antes** do `footer.sh` (footer permanece por último).
5. **`skills/gen-governance-core/hooks/project-state.sh`**: emite `LATEST HANDOFF DOC` no `<project-state>`, para a sessão nova retomar do handoff anterior.
6. **`docs/statusline-optional.md`**: snippet que grava `.context-pct` (perna autoritativa) + documentação das env vars.
7. **`.gitignore`**: ignora `.governance/.context-pct` (marcador runtime). **`memory-system/handoff/` é versionado de propósito** (handoff commitável → retomada cross-máquina).
8. **`skills/gen-governance-core/SKILL.md`**: seção "Runtime Hooks (context guard + handoff)".

## Como aplicar no seu projeto derivado

### 1. Rodar `/update-upstream` e resolver conflitos por arquivo

| Arquivo | Política |
|---|---|
| `scripts/context-meter.sh` | **auto-accept** (novo). |
| `scripts/tests/test-context-meter.sh` | **auto-accept** (novo). |
| `skills/gen-governance-core/hooks/context-guard.sh` | **auto-accept** (novo). |
| `skills/gen-governance-core/hooks/user-prompt.sh` | **merge manual** — adote (a) a captura `payload="$(cat …)"` + extração de `transcript_path`, e (b) a chamada `context-guard.sh "$transcript"` **antes** de `footer.sh`. Preserve customizações locais (ex.: seu `CLAUDE_GOV_MINI_EVERY`). |
| `skills/gen-governance-core/hooks/project-state.sh` | **merge manual** — adote a linha `LATEST HANDOFF DOC`. Preserve customizações da sua Tier B. |
| `.gitignore` | **merge manual** — adicione `.governance/.context-pct`. **Não** ignore `memory-system/handoff/`. |
| `docs/statusline-optional.md` | **auto-accept** (ou merge manual se você customizou). |
| `skills/gen-governance-core/SKILL.md` | **merge manual** — adote a nova seção; preserve o resto. |
| `.claude/settings.json` | **nenhuma mudança** — o guard pega carona no hook `UserPromptSubmit` já registrado. Não há novo bloco para adicionar. |
| `.governance/*` | **não precisa regenerar** — `AGENTS.md`/`INTEGRITY-RULES.md`/`CLAUDE.md` não mudaram. |

### 2. (Pós-merge) Conferir que o teste roda no gate

```bash
./scripts/run-tests.sh   # deve listar "Running tests/test-context-meter.sh" com PASS=9 FAIL=0
```

### 3. (Pós-merge, RECOMENDADO) Ativar a medição autoritativa via statusline

Sem isso o guard **ainda funciona** (fallback do transcript cobre toda sessão), mas a medição fica exata. Adicione ao seu `~/.claude/statusline.sh` (se ele já faz `input=$(cat)`):

```bash
ctx_pct=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
if [ -n "$ctx_pct" ] && [ -d ".governance" ]; then
  printf '%.0f' "$ctx_pct" > .governance/.context-pct 2>/dev/null || true
fi
```

Detalhes em `docs/statusline-optional.md`.

### 4. (Opcional) Ajustar thresholds e janela por env var

| Variável | Padrão | Função |
|---|---|---|
| `CLAUDE_GOV_CTX_WARN` | `75` | threshold de warning (%) |
| `CLAUDE_GOV_CTX_CRIT` | `85` | threshold crítico / handoff (%) |
| `CLAUDE_GOV_CTX_WINDOW` | (auto) | override do tamanho da janela em tokens |
| `CLAUDE_GOV_CTX_PCT_TTL` | `60` | validade (s) do `.governance/.context-pct` |

### 5. Validar e entregar

```bash
./scripts/validate-all.sh
```

Entregue via fluxo normal (`/delivery`). Nada a regenerar.

## Avisos conhecidos

- **Inferência de janela no fallback (1M):** o transcript grava o id base do modelo (ex.: `claude-opus-4-8`) **sem** o marcador `[1m]`, então o fallback não distingue janela de 200k vs 1M na faixa 150k–200k tokens. Em sessões de **1M sem o statusline** (passo 3), defina `CLAUDE_GOV_CTX_WINDOW=1000000` para evitar warnings falsos. Com o statusline ativo o ponto é irrelevante (o `%` vem oficial).
- **Fail-open por design:** se o `%` não puder ser determinado (sem transcript e sem `.context-pct`, ou parse falho), o guard fica **silencioso** — nunca bloqueia o turno.
- **`memory-system/handoff/` é versionado:** os handoffs entram no git de propósito (retomada cross-máquina). Se preferir handoffs locais/efêmeros, adicione `memory-system/handoff/` ao seu `.gitignore` — mas então a retomada só funciona na mesma máquina.
