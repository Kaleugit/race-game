# Lançamento Manual de Agentes/Times com Segurança de Worktree

Este guia é para **operadores humanos** que lançam agentes do Claude Code
**fora** das skills do boilerplate (por exemplo, criando um *agent team*
manualmente, ou disparando um agente ad-hoc com `isolation: worktree`).

## Por que isso importa

Há bugs confirmados no Claude Code em que o isolamento por worktree **falha
silenciosamente** — o agente nasce no repositório/branch errado sem nenhum erro:

- **anthropics/claude-code #33045** — `isolation: worktree` é **ignorado** quando
  o spawn também passa `team_name`. O agente nasce na raiz do repo primário, na
  branch atual (ex.: `main`).
- **anthropics/claude-code #51596** — `isolation: worktree` pode **reusar
  silenciosamente** uma worktree antiga/contaminada por colisão do prefixo do
  `agentId` (mesmo sem `team_name`).

O resultado é *commit bleed*: um agente commita no trabalho de outra sessão.
No incidente INC-2026-06-14 isso colocou um agente na branch `main` de outra
worktree.

## Regras (sempre)

1. **Nunca** combine `team_name` com `isolation: worktree` esperando isolamento.
   Ou use `isolation: worktree` **sem** `team_name`, ou provisione uma worktree
   explícita por agente com `git worktree add` e passe o caminho no prompt.
2. **Nunca** afirme ao agente "você está numa worktree isolada" como premissa.
   Instrua-o a **verificar** antes do primeiro write.
3. Se um agente reportar que não está isolado, **ABORTE** a execução dele.
   Nunca responda "pode commitar". O agente **nunca** deve adivinhar uma worktree
   a partir da lista de worktrees existentes.

## Como tornar isso obrigatório (forçado)

Instale o hook de pre-commit do boilerplate **uma vez** no repositório:

```bash
./scripts/install-pre-commit-hook.sh
```

O hook é instalado no diretório de hooks **compartilhado**
(`git rev-parse --git-common-dir`/hooks), então vale para **todas** as worktrees
— inclusive as criadas manualmente. Em cada commit ele roda:

1. `scripts/assert_isolated.sh --pre-commit` — **bloqueia** qualquer commit numa
   branch `TASK-*` feito a partir da worktree primária (a assinatura dominante do
   bleed). Commits em `main`/branches não-task a partir do primário (fluxo
   docs/humano) continuam permitidos; commits a partir de worktrees linkadas
   continuam permitidos.
2. `scripts/validate-all.sh` — validação de governança.

## Verificação cooperativa (no prompt do agente)

Instrua todo agente que vai escrever/commitar a rodar, **antes do primeiro
write**:

```bash
./scripts/assert_isolated.sh --expected-branch <sua-branch-de-task> --require-clean
```

- Saída `0`: isolamento confirmado, pode prosseguir.
- Saída `2`: isolamento **FALHOU** — ABORTE e reporte (não commite, não dê `cd`
  para nenhuma outra worktree).
- Saída `1`: erro de uso/contexto (não é um repo git, args inválidos).

## Limitação honesta

Um agente que faz `cd` para a worktree de **outra sessão** e commita lá produz
um commit internamente consistente com aquela worktree — isso é um problema de
*identidade de sessão* que **não** é detectável mecanicamente por um git hook.
Essa janela é coberta pela verificação cooperativa (`--require-clean`) e pelos
detectores de contaminação do `skills/delivery` (`detect_cross_task_file_contamination`,
`detect_overlapping_task_commits`), que são o gate final no merge. O hook força o
caso dominante: trabalho de task commitado a partir do repositório compartilhado.
