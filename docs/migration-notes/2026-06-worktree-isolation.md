# Migration: Worktree-Isolation Guard + Governance Rule (2026-06)

**Quando aplicar:** ao sincronizar com upstream após 2026-06-14.
**Para quem:** projetos derivados de `eduoda/agents` que rodam `/update-upstream`.
**Escopo:** novo guard de isolamento de worktree, regra de governança, wiring nos spawn templates, hook de pre-commit forçador, e um fix de robustez em `validate-conventions.sh`.

## Contexto

Bugs confirmados no Claude Code quebram o isolamento de worktree **silenciosamente** (`anthropics/claude-code` #33045 — `team_name` derruba `isolation:worktree`; #51596 — reuso silencioso de worktree contaminada por colisão de prefixo do `agentId`). Ver ADR-012 em `docs/decisions.md`. Esta migração instala controles em camadas (defense-in-depth) que **não dependem** do bug ser corrigido upstream.

## O que mudou no boilerplate

1. **Novo `scripts/assert_isolated.sh`** — guard de isolamento. Dois modos:
   - cooperativo: `assert_isolated.sh --expected-branch <branch> [--require-clean] [--expected-worktree <path>]` (rodar antes do primeiro write);
   - `--pre-commit`: bloqueia commit em branch `TASK-*` feito a partir do repo primário.
   - Exit `0` ok / `1` erro de uso ou não-repo / `2` isolamento FALHOU. **Nunca** enumera worktrees. Endurecido (unset GIT_DIR/GIT_WORK_TREE, canonicaliza paths, rejeita detached HEAD, anti arg-injection).
2. **Novo `scripts/tests/test-assert_isolated.sh`** (22 casos) + **novo `scripts/run-tests.sh`** (glob runner) fiado em `scripts/validate-all.sh` — agora os harnesses `scripts/tests/test-*.sh` rodam no gate de governança/CI (antes eram órfãos).
3. **`scripts/install-pre-commit-hook.sh` estendido**: o hook passa a rodar `assert_isolated.sh --pre-commit` antes do `validate-all.sh`, e instala no **common hooks dir** (`git rev-parse --git-common-dir`/hooks) → cobre todas as worktrees.
4. **Regra de governança**: `INTEGRITY-RULES.md` §Forbidden Violations #6 (verificar isolamento; ABORTAR; nunca adivinhar worktree) + `AGENTS.md` §Subagent Delegation Model (procedimento verify-before-write, anti-pattern `team_name`+`isolation`, regras de lançamento manual).
5. **Wiring nos spawn templates**: `skills/gohorse/references/subagent-prompt-template.md`, `skills/gohorse2/references/parallel-delta.md`, `skills/implement/SKILL.md` (Phase 0 gate), `skills/parallel/SKILL.md` (cross-ref) — passo literal de verificação com ABORT.
6. **Fix de robustez** em `scripts/validate-conventions.sh`: o gate de prior-art rodava `git log | tail` que crashava (exit 128) fora de repo git sob `set -e`+pipefail; agora degrada gracioso (`|| true`). Test 3 de regressão adicionado.
7. **ADR-012** em `docs/decisions.md` + **guia de operador** `boilerplate-docs/manual-agent-launch-safety.md`.

## Como aplicar no seu projeto derivado

### 1. Rodar `/update-upstream` e resolver conflitos por arquivo

| Arquivo | Política |
|---|---|
| `scripts/assert_isolated.sh` | **auto-accept o upstream (v2).** Se seu projeto já tinha um `assert_isolated.sh` artesanal (ex.: a versão posicional do INC-2026-06-14), o merge vai conflitar — **pegue a versão upstream (v2, baseada em flags)**. Atualize qualquer call-site local do formato antigo `assert_isolated.sh <PRIMARY> <BRANCH>` para `--expected-branch <branch>`. |
| `scripts/run-tests.sh`, `scripts/tests/test-assert_isolated.sh` | **auto-accept** (novos). |
| `scripts/validate-all.sh` | **merge manual** — garanta a linha `run_check "run-tests.sh"`. |
| `scripts/install-pre-commit-hook.sh` | **auto-accept o upstream**, salvo customização local; veja passo 3. |
| `scripts/validate-conventions.sh` | **merge manual** — adote o `\| tail -1 \|\| true` no gate de prior-art; preserve customizações locais. |
| `INTEGRITY-RULES.md`, `AGENTS.md` | **merge manual** — adote a nova Forbidden Violation #6 e os bullets de §Subagent Delegation Model; preserve customizações do seu projeto. |
| `.governance/*` | **descarte o que veio do upstream**; você regenera no passo 4. |
| `skills/gohorse/...`, `skills/gohorse2/...`, `skills/implement/SKILL.md`, `skills/parallel/SKILL.md` | **merge manual** — adote o passo de verificação de isolamento; preserve customizações locais. |
| `docs/decisions.md` | **merge manual** — adicione ADR-012; preserve seus ADRs. |
| `boilerplate-docs/manual-agent-launch-safety.md` | **auto-accept** (novo). |

### 2. (Pós-merge, OBRIGATÓRIO) Re-instalar o pre-commit hook

Mesmo que você já tivesse o hook instalado, **re-rode** para ganhar o passo do guard e a instalação no common dir:

```bash
./scripts/install-pre-commit-hook.sh
```

Sem isso, a função forçadora (bloquear commit de task a partir do repo primário) **não fica ativa**. Verifique:

```bash
grep -q 'assert_isolated.sh --pre-commit' "$(git rev-parse --git-common-dir)/hooks/pre-commit" && echo "guard wired no hook" || echo "RE-INSTALE o hook"
```

### 3. (Pós-merge) Conferir que os testes rodam no gate

```bash
./scripts/validate-all.sh   # deve listar "Running tests/test-assert_isolated.sh" com FAIL=0 e terminar "Governance validation passed"
```

### 4. (Pós-merge, OBRIGATÓRIO) Regenerar `.governance/` a partir das SUAS fontes

`INTEGRITY-RULES.md`/`AGENTS.md` mudaram, então regenere para propagar a regra de isolamento ao SEU `.governance/*`:

```
/gen-governance-core
```

Confira que a regra entrou nos três níveis:

```bash
for f in CORE MINI SUBAGENT; do grep -qi 'never guess a worktree' .governance/$f.md && echo "$f ok" || echo "$f FALTA"; done
```

### 5. Validar e entregar

```bash
./scripts/validate-all.sh
bash skills/gen-governance-core/scripts/validate-size.sh
```

Entregue via fluxo normal (`/delivery`).

## Avisos conhecidos

- **Metadata pós-merge (DEVOPS-M2 / issue #12):** observado **determinístico** neste ambiente — o commit de metadata do `deliver-to-main.sh` pode ficar órfão (o merge captura o tip anterior), e a Action `finalize-task-metadata` pode estar bloqueada por billing. Se após o merge a task ficar `IN_PROGRESS` na `main`, faça backfill manual (cherry-pick do commit de metadata, ou edite os campos `Status: COMPLETED` + `Delivery *`).
- **CI bloqueado por billing (`gh-billing-exhausted`):** valide localmente (`validate-all.sh`) e prossiga conforme `AGENTS.md` §GitHub Network/Infrastructure Failures (incl. `gh pr merge --admin`).

## Limitação honesta (ADR-012)

O guard **não** captura o caso "agente faz `cd` para a worktree de outra sessão e commita lá" (problema de identidade de sessão, não detectável por git hook). Isso fica coberto pelo `--require-clean` cooperativo + os detectores de contaminação do `skills/delivery` (`detect_cross_task_file_contamination`, `detect_overlapping_task_commits`). O hook força o caso dominante: commit de task a partir do repo compartilhado. E o hook só protege se instalado (passo 2).
