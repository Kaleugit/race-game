# Migration: consolidação da família gohorse → `gohorse` + `gohorse-light` (2026-06)

**Quando aplicar:** ao sincronizar com upstream após 2026-06-23.
**Para quem:** projetos derivados de `eduoda/agents` que rodam `/update-upstream`.
**Escopo:** renomeação/consolidação das skills `gohorse*`. **Breaking** — a semântica de `/gohorse` muda. **Regerar `.governance/` pós-merge** (passo abaixo): nenhuma regra de governança mudou, mas o `AGENTS.md` muda no catálogo de skills e o `meta.yaml` precisa fingerprintar o SEU `AGENTS.md`, não o do upstream.

## Contexto

O esquema numérico `gohorse`/`gohorse2`/`gohorse3` gerava confusão de "qual usar" e um alerta falso recorrente ("sem ganho de paralelismo → use gohorse"). A consolidação elimina os números e nomeia por capacidade.

## O que mudou no boilerplate

| Antes | Depois | Papel |
|---|---|---|
| `skills/gohorse3` (paralelo Workflow + claim-on-first-touch, experimental) | **`skills/gohorse`** | executor **padrão**, agora estável (sem `experimental`) |
| `skills/gohorse` (sequencial) | **`skills/gohorse-light`** | fallback sequencial, sem dependências |
| `skills/gohorse2` | *removido* | substrato Workflow dobrado para dentro do novo `gohorse` |

- **Comportamento do novo `gohorse` é IDÊNTICO ao antigo `gohorse3`** (verificado por diff normalizado dos reference docs + revisão independente). Os arquivos-base `references/orchestration-model.md` e `references/subagent-prompt-template.md` continuam byte-idênticos e agora vivem em `skills/gohorse/references/`; `gohorse-light` os referencia de lá.
- `AGENTS.md`: catálogo de skills e descrição do modelo de subagentes atualizados; aliases de workstream `gohorse2=development`/`gohorse3=development` removidos, `gohorse-light=development` adicionado.
- `xgh` continua invocando `gohorse` — **sem mudança de código**, mas agora é o executor paralelo (upgrade automático do autopilot de MVP).
- Cross-refs atualizadas: `boilerplate-docs/*`, `skills/gen-skill/references/interoperable-skills-model.md`, `skills/parallel/*`, `CHANGELOG.md`.

## Mudança de semântica que você PRECISA saber

`/gohorse` num projeto derivado **deixa de ser sequencial e passa a ser paralelo** (Workflow + worktrees isoladas + claim-on-first-touch). Implicações:

- Se você dependia do `/gohorse` sequencial (uma task por vez, sem o primitivo Workflow), passe a usar **`/gohorse-light`**.
- O novo `/gohorse` exige os primitivos Workflow/worktree. Quando o Preflight detecta que faltam, ele **recomenda cair para `gohorse-light`** — não degrada silenciosamente.
- Falha apenas do registro de locks (`git rev-parse --git-common-dir`) **não** derruba para sequencial: desliga só a camada claim-on-first-touch e segue em paralelo puro (rebase-net como backstop). Idêntico ao antigo gohorse3.

## Como aplicar no seu projeto derivado

`.claude/skills` é symlink para `../skills/`, então renomear os diretórios já propaga a descoberta das skills — não há symlink por-skill para mexer.

| Item | Política |
|---|---|
| `skills/gohorse3/` → `skills/gohorse/` | **auto-accept** o novo `skills/gohorse/` do upstream. |
| `skills/gohorse/` (seu sequencial) → `skills/gohorse-light/` | se você **não** customizou, **auto-accept** a renomeação. Se customizou o sequencial, **merge manual**: porte suas mudanças para `skills/gohorse-light/SKILL.md`. |
| `skills/gohorse2/`, `skills/gohorse3/` | **remover** (deletados no upstream). |
| `AGENTS.md` aliases/catálogo | **merge manual** se você customizou a lista; senão **auto-accept**. Garanta `gohorse-light=development` e remova `gohorse2/3`. |
| Scripts/automações que chamam `/gohorse2` ou `/gohorse3` | trocar para `/gohorse`. |
| Automações que chamam `/gohorse` esperando **sequencial** | trocar para `/gohorse-light`. |
| `CHANGELOG.md`, `boilerplate-docs/*`, `skills/gen-skill/references/interoperable-skills-model.md`, `skills/parallel/SKILL.md`, `skills/parallel/references/parallel-execution-model.md` | **auto-accept** (atualizações de cross-ref do upstream; se você customizou algum, **merge manual** preservando seu conteúdo). |
| `.governance/meta.yaml`, `.governance/CORE.md`, `.governance/MINI.md`, `.governance/SUBAGENT.md` | **keep-local** — NÃO aceite o snapshot do upstream; são derivados das SUAS fontes. Regenere (passo pós-merge). |

### Passos pós-merge (obrigatórios)

1. Confirme que `skills/` contém apenas `gohorse/` e `gohorse-light/` (sem `gohorse2`/`gohorse3`).
2. Rode `/gen-governance-core` — o `AGENTS.md` mergeado mudou no catálogo de skills; isso refingerprinta o `meta.yaml` com o SEU `AGENTS.md` e mantém os payloads consistentes (as regras não mudam).
3. Rode `bash scripts/validate-all.sh` (taxonomia de skills + links devem passar).

## Avisos conhecidos

- Supera as referências a `skills/gohorse2/...` na nota dated `2026-06-worktree-isolation.md`: o wiring do passo de verificação de isolamento que lá apontava para `skills/gohorse2/references/parallel-delta.md` agora vive em `skills/gohorse/references/parallel-delta.md`.
- Registros históricos (`docs/decisions.md`, notas dated anteriores, entradas antigas do `CHANGELOG`) foram deixados intactos de propósito — não os "corrija".
