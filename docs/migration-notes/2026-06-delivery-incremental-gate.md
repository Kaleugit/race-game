# Migration: gate de delivery incremental + modelo otimista no gohorse (2026-06)

**Quando aplicar:** ao sincronizar com upstream após 2026-06-25.
**Para quem:** projetos derivados de `eduoda/agents` que rodam `/update-upstream`.
**Escopo:** o gate de governança por-task do delivery passa de **repo-wide** (`validate-all.sh`) para **incremental** (`validate-changed.sh`); o `gohorse` ganha modelo de delivery **otimista** (merge-first + validação na fronteira de wave + revert-on-red). Mais correções menores em telemetry (#63), gohorse preflight (#59) e gen-tasks/ep-check (#60). **Não-breaking para a maioria**, mas **conflito provável** se você customizou `skills/delivery/scripts/deliver-to-main.sh` ou `scripts/validate-links.sh`, e há **uma dependência de configuração que VOCÊ precisa garantir** (H1, abaixo).

## Contexto

Evidência EP-057 (artboss): o `deliver-to-main.sh` rodava o `validate-all.sh` repo-wide **2× por delivery** no caminho serial por-task (`validate-links` ~46s + `validate-placeholders` ~71s + `validate-conventions` >90s, O(task-files × git-log) + suíte de testes). Num épico de 9 tasks isso queimava horas revalidando arquivos intactos, e um campo de conclusão faltante numa task **irmã** bloqueava a delivery de todas as outras (#58). Issues #57/#58/#62.

## O que mudou no boilerplate

| Arquivo | Mudança |
|---|---|
| `scripts/validate-changed.sh` | **NOVO**. Gate incremental: valida só `base...tip ∪ working-tree` — `validate-conventions --completion-preflight` nos `TASK-*.md` alterados + link-check escopado nos `.md` alterados. Exit 0/1/2. |
| `scripts/validate-links.sh` | Refatorado para aceitar **lista opcional de arquivos** (modo escopado, usado pelo `validate-changed`). **Sem args = comportamento repo-wide idêntico ao anterior.** |
| `skills/delivery/scripts/deliver-to-main.sh` | Os 2 call sites de `validate-all` (pré-merge + commit de metadata) agora usam o helper `run_governance_gate`, que escolhe o escopo: incremental quando o CI é a rede; **`validate-all` full local** quando `ci-mode=off` ou `origin/main` indisponível. Faz `fetch origin main` antes do gate. |
| `skills/delivery/SKILL.md` | Passo 1 do gate documenta o modo incremental + a dependência de rede repo-wide (H1). |
| `skills/gohorse/references/parallel-delta.md` | Modelo otimista (O1): repo-wide `validate-all` sai do caminho por-task → **1× por wave na fronteira**, com **revert-on-red atribuível** (não faz mass-revert em red não-atribuível). + check de preflight "Unpushed epic-setup commits" (#59). |
| `skills/gohorse/SKILL.md` | Allowlist do Preflight inclui `./scripts/validate-changed.sh`; referência ao modelo otimista; check de push pré-wave-1 (#59). |
| `skills/gen-tasks/SKILL.md` | Novo princípio "Wiring/entrypoint ownership" (#60). |
| `skills/ep-check/SKILL.md`, `skills/ep-check/references/validation-dimensions.md` | Check "Production wiring reachability" na dimensão Testing (#60). |
| `skills/telemetry/hooks/session-guard.sh` | Self-heal do sidecar `telemetry-statusline.json` no SessionStart quando ausente/corrompido (#63). |
| `skills/telemetry/scripts/capture-delegate.sh` | **NOVO**. Lógica de captura do delegate compartilhada (DRY) por `install-hooks.sh` + `session-guard.sh`. |
| `skills/telemetry/scripts/install-hooks.sh` | Usa o `capture-delegate.sh` (refactor DRY; comportamento idêntico). |

## Mudança de semântica/configuração que você PRECISA saber

**(H1 — AÇÃO NECESSÁRIA) A rede repo-wide migrou para o CI.** O gate por-task agora é incremental e barato; o `validate-all` repo-wide **não roda mais por-task**. Para que isso seja seguro, a rede repo-wide tem de existir em algum lugar:

- **Se `governance.yml` é a sua rede**: garanta que ele é um **required status check** na branch protection do `main`. Senão, um merge pode passar sem nenhuma validação repo-wide.
- **Se você roda `ci-mode=off`** (`.governance/ci-mode.conf` = `off`): nenhuma ação — o `deliver-to-main.sh` detecta isso e roda o **`validate-all` full local** automaticamente (mais lento, mas é a rede correta na ausência de CI).
- O `gohorse` (proper) adiciona uma terceira rede: o `validate-all` na **fronteira de cada wave** após os merges.

**`gohorse` delivery agora é otimista**: pré-merge barato → merge → validação repo-wide 1× por wave → revert-on-red **só do culpado atribuível** (red não-atribuível, ex. teste/`validate-dates`, faz halt+surface, não mass-revert). O revert assume merge commit (`gh pr merge --merge`/`-m 1`); se o seu projeto usa squash/rebase merge, é um `git revert` plano (documentado no spec).

## Como aplicar no seu projeto derivado

| Item | Política |
|---|---|
| `scripts/validate-changed.sh` (novo) | **auto-accept**. |
| `scripts/validate-links.sh` | **auto-accept** se não customizou. Se customizou, **merge manual**: preserve suas regras e mantenha o despacho `if [[ "$#" -gt 0 ]]` (escopado) vs. `find` (repo-wide). |
| `skills/delivery/scripts/deliver-to-main.sh` | **merge manual se você customizou** (maior risco de conflito): porte suas mudanças e mantenha `run_governance_gate` nos 2 call sites. Senão **auto-accept**. |
| `skills/delivery/SKILL.md`, `skills/gohorse/*`, `skills/gen-tasks/SKILL.md`, `skills/ep-check/*` | **auto-accept**; **merge manual** se você customizou esses skills. |
| `skills/telemetry/hooks/session-guard.sh`, `skills/telemetry/scripts/capture-delegate.sh` (novo), `skills/telemetry/scripts/install-hooks.sh` | **auto-accept** (idempotente, self-healing). |
| `.governance/meta.yaml`, `CORE.md`, `MINI.md`, `SUBAGENT.md` | **keep-local** — derivados das SUAS fontes; regenere (passo abaixo) só se o seu `AGENTS.md` mudou no merge. |

### Passos pós-merge (obrigatórios)

1. **(H1) Garanta a rede repo-wide:** torne `governance.yml` um *required status check* no `main`, OU confirme `ci-mode=off` (o script roda o full local nesse caso). Sem um dos dois, o gate por-task fica mais fraco que antes.
2. **Allowlist (se você roda `gohorse`):** adicione `Bash(./scripts/validate-changed.sh:*)` (ou equivalente) à allowlist de delivery — o `deliver-to-main.sh` agora o invoca.
3. Rode `bash scripts/validate-all.sh` (deve passar; inclui o novo `test-validate-changed.sh`).
4. **(telemetry #63)** O self-heal do sidecar no SessionStart agora cobre o gap em máquinas onde o `install-hooks.sh` nunca rodou — o `install-hooks.sh` continua sendo o ativador idempotente, mas deixou de ser o único caminho de recuperação. Nenhuma ação além de aceitar o merge.

## Avisos conhecidos

- `validate-changed.sh` exige `origin/main` presente; o `deliver-to-main.sh` faz `fetch origin main` antes do gate. Em delivery standalone offline sem `origin/main`, ele cai no `validate-all` full (fallback correto).
- O `validate-links.sh` repo-wide é byte-compatível com o anterior (auditado); a refatoração só adiciona o modo escopado.
- O PoC de referência do artboss (`f77316dd`, "incremental delivery gate") foi auditado e é **subsumido** por esta entrega (que ainda corrige o link-check stub do PoC, adiciona o `fetch` e o fallback ci-off, e cobre por teste). Não há nada a portar dele.
