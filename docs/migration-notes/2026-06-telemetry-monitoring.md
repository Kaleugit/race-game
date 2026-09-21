# Migration: Telemetria de Monitoramento — Fase 1 (captura) (2026-06, redesign)

**Quando aplicar:** ao sincronizar com upstream após 2026-06-24 (redesign).
**Para quem:** projetos derivados de `eduoda/agents` que rodam `/update-upstream`.
**Escopo:** a skill `skills/telemetry/` (hooks-only) captura **dois streams** —
uso/limites (tap no `statusLine`) e governança/atividade (hooks) — numa **branch
órfã `telemetry`** por repo (não mais em `events.d/` no `main`), mais um alerta
in-session de desvio estratégico e uma guarda de runtime. A **ativação** (`install-hooks.sh`)
agora escreve hooks **e** `statusLine` no `.claude/settings.json` e é idempotente —
prefira rodar o instalador a editar à mão. **Sem regenerar `.governance/`.**
Requer **reiniciar a sessão do Claude Code** após ativar (statusLine e hooks novos
só carregam em sessão nova).

> **Mudança vs. a versão anterior desta nota (2026-06-22):** o design antigo
> gravava fragmentos em `memory-system/telemetry/events.d/*.ndjson` versionados
> no `main`. O **novo design não usa `events.d/` nem versiona telemetria no
> `main`** — tudo vai para a branch órfã via git plumbing. Se você aplicou a
> versão antiga: ver "Migrando de events.d/" abaixo.

## Contexto

Primeira fase de um sistema central de monitoramento/fiscalização dos projetos
derivados (design completo em `MONITORING-DESIGN.md` do boilerplate). A captura
roda em cada derivado e grava na branch órfã `telemetry` do próprio repo; um
subprojeto agregador (Fases 2–4, fora deste boilerplate) consome por
`git fetch origin telemetry` + `git show telemetry:<path>`.

RTFM (confirmado na doc oficial do Claude Code):
- **Nenhum payload de hook carrega tokens/custo/limites.** Por isso o uso/limite
  é capturado no **`statusLine`** (única fonte local de `rate_limits` 5h/7d
  `used_percentage`+`resets_at` e dos totais de token por sessão), não num hook.
- **`statusLine` pode ser definido no `.claude/settings.json` do projeto** (a
  precedência Project > User faz o tap ser escopado ao projeto — preferível por
  footprint). O wrapper preserva o `statusLine` do operador como *delegate*.
- Campos de payload de hook: `session_id`, `cwd`, `hook_event_name`; `PreToolUse`
  traz `tool_name`+`tool_input`; `SessionStart` traz `source`; `SessionEnd` traz
  `reason`.

## O que mudou no boilerplate

1. **Transporte — branch órfã `telemetry`** (`skills/telemetry/scripts/append-to-orphan.sh`):
   append de fragmentos NDJSON via git plumbing (hash-object/read-tree/write-tree/
   commit-tree/update-ref em índice temporário), **sem tocar working tree/HEAD/
   índice**. Não polui o `main`. Concurrency-safe (lock portável **flock no Linux,
   `mkdir`-lock no macOS** — que não tem flock — + CAS no update-ref), fork-safe
   (re-roota a `telemetry` herdada de outro repo), push best-effort assíncrono,
   silencioso.
2. **Tap de uso no `statusLine`** (`hooks/statusline-tap.sh`): wrapper
   não-destrutivo que emite uma amostra `[dev, repo, session, in/out, ctx%,
   h5_pct/reset, d7_pct/reset]` (throttle 60s) para `usage/<session>.ndjson` na
   órfã e **repassa o statusLine original inalterado** (delegate em
   `.claude/telemetry-statusline.json`). Sem original → barra mínima.
3. **Stream de governança** (`hooks/record-event.sh`): 1 linha NDJSON por evento
   em `governance/<session>.ndjson` na órfã, com `detail` semântico **curto**
   (cap 280, não 4000) e `repo` = slug `owner/repo`.
4. **Guarda de runtime** (`hooks/session-guard.sh`): no `SessionStart`, se o tap
   caiu, injeta `<system-reminder>` com remediação (falha-visível; nunca reescreve
   `settings.json` sozinho).
5. **`drift-guard.sh`** inalterado (consumidor; produtor é Fase 3).
6. **`scripts/install-hooks.sh`** agora wira hooks + guarda + tap num passo
   idempotente e self-healing.
7. **`MONITORING-DESIGN.md`** (raiz) — design das 4 fases.

> **O boilerplate NÃO ativa nada no próprio `.claude/settings.json`** — telemetria
> é feature de derivado; o boilerplate não gera telemetria sobre si mesmo.

### Esquemas NDJSON

Uso (`usage/<session>.ndjson`):
```json
{"ts":"...","dev":"<git-email>","session":"<uuid>","repo":"<owner/repo>","branch":"<b>","in":12000,"out":3400,"ctx_pct":42.7,"h5_pct":55,"h5_reset":1750800000,"d7_pct":12,"d7_reset":1751300000}
```
Governança (`governance/<session>.ndjson`):
```json
{"ts":"...","session":"<uuid>","repo":"<owner/repo>","branch":"<b>","category":"tool","event":"PreToolUse","actor":"agent","name":"backend","detail":"fix auth bug"}
```

## Como aplicar no seu projeto derivado

### 1. Rodar `/update-upstream` e resolver conflitos por arquivo

| Arquivo | Política |
|---|---|
| `skills/telemetry/` (skill inteira) | **auto-accept** (atualizada). |
| `skills/telemetry/scripts/append-to-orphan.sh` e `scripts/tests/test-telemetry-*.sh` | **auto-accept** (novos; os testes rodam no seu `validate-all`/CI). |
| `MONITORING-DESIGN.md` | **auto-accept** — ou **keep-local** se você mantém docs de boilerplate fora do seu repo de produto. |
| `.claude/settings.json` | **gerado pelo instalador** (passo 2). Não edite à mão; rode `install-hooks.sh` (idempotente, preserva seus hooks e seu statusLine como delegate). |
| `.governance/*` | **não precisa regenerar**. |

### 2. Ativar (idempotente — preferido sobre edição manual)

```bash
./skills/telemetry/scripts/install-hooks.sh
jq -e . .claude/settings.json     # confere JSON válido
```
Pode rodar quantas vezes quiser — não duplica e auto-cura metades faltantes. Ele:
- wira `SessionStart` (record + `session-guard.sh`), `UserPromptSubmit`
  (record + `drift-guard.sh`), `PreToolUse` `Task|Agent|Skill`, `SessionEnd`;
- aponta `statusLine.command` para `statusline-tap.sh` e captura seu statusLine
  atual (do projeto, ou do `~/.claude` global) em `.claude/telemetry-statusline.json`;
- adiciona `.claude/telemetry-statusline.json` ao `.gitignore` (é **por-máquina**:
  pode conter caminho absoluto; não deve ser commitado).

`bootstrap` (projetos novos) e `update-upstream` (existentes) já rodam isto
automaticamente — ambiente sai completamente configurado, sem passo manual.

### 3. Verificar (sem reiniciar)

```bash
chmod +x skills/telemetry/hooks/*.sh skills/telemetry/scripts/*.sh
bash skills/telemetry/scripts/smoke.sh     # deve terminar com ALL PASS
```

### 4. Reiniciar a sessão do Claude Code

statusLine e hooks novos só carregam em sessão nova. Após reiniciar, confira que
a captura está viva:
```bash
git show telemetry:usage/<sua-sessao>.ndjson        # amostra de uso
git show telemetry:governance/<sua-sessao>.ndjson   # eventos de governança
```

### 5. Validar e entregar

```bash
./scripts/validate-all.sh
```
Entregue via fluxo normal (`/delivery`). Nada a regenerar.

## Migrando de `events.d/` (quem aplicou a versão antiga)

- O novo `record-event.sh` **não escreve mais** em
  `memory-system/telemetry/events.d/`. Os fragmentos antigos versionados no
  `main` podem ser **mantidos** (histórico) ou removidos numa entrega de limpeza —
  o agregador novo lê a branch órfã, não `events.d/`.
- Se você adicionou `memory-system/telemetry/` ao `.gitignore` por causa do
  design antigo, pode remover essa entrada: a telemetria não vai mais para o
  working tree do `main`.
- **Os comandos de hook não mudaram** (`record-event.sh session_start|prompt|tool|
  session_end`), só o conteúdo do script — então a captura migra para a órfã
  automaticamente ao sincronizar. O `install-hooks.sh` é idempotente e
  **acrescenta o `session-guard.sh` mesmo num projeto que já tinha os hooks do
  design antigo** (o wiring do guard é independente). Basta re-rodar
  `./skills/telemetry/scripts/install-hooks.sh`.

## Avisos conhecidos

- **A órfã `telemetry` é uma branch real do repo.** Não a delete achando que é
  lixo. `git show telemetry:<path>` lê os fragmentos. A história é
  rotacionável/squashável (retenção) sem tocar o `main`.
- **`requires jq` e `git`.** Sem eles a captura falha silenciosa (não quebra o
  turno). `jq` já é dependência do gate de governança.
- **Push best-effort.** Se a órfã divergir no remote (ex.: vários devs no mesmo
  repo), o push pode ser rejeitado silenciosamente; o ref local mantém tudo e o
  agregador reconcilia (Fase 2). Sem custo para o turno.
- **`statusline-tap.sh` é per-máquina via delegate.** O `statusLine.command`
  (wrapper) é portável e versionado; o **delegate** (`.claude/telemetry-statusline.json`)
  é por-máquina e gitignorado. Num clone novo sem rodar o instalador, o wrapper
  cai na barra mínima até `install-hooks.sh` rodar; o `session-guard.sh` avisa.
- **Sem custo/tokens no stream de governança.** Por design e por limitação dos
  payloads de hook (RTFM). Uso/limite vem do tap; custo preciso vem do agregador.
- **`drift.flag` ainda não é produzido** (chega na Fase 3). Até lá o
  `drift-guard.sh` fica silencioso — correto.
</content>
