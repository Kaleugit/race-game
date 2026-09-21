# Worktree Collaboration Guide

Guia mínimo para colaboração com múltiplos agentes sem corromper contexto.

## Objetivo
- Isolar cada tarefa em diretório/branch próprios.
- Reduzir conflito em arquivos de runtime (`memory-system/tasks/*.md`, `session-log` e notas por workstream).

## Fluxo recomendado
1. Manter `main` limpa e atualizada.
2. Para cada tarefa, criar branch dedicada (`TASK-<github-login>-<task-key>-[role|workstream]`).
3. Criar um worktree por branch.
4. Executar agente em seu próprio worktree.
5. Integrar via PR para `main` com `skills/delivery/scripts/deliver-to-main.sh --validation-note <path>` e CI obrigatório antes do merge.
   - quando a tip atual da branch da task já estiver contida em `origin/main`, o `delivery` remove automaticamente a worktree ligada;
   - se o merge ainda estiver pendente, a worktree permanece limpa na branch da task.
6. Exceções em `main`:
   - documentação (somente escopo doc-only): `./skills/delivery/scripts/deliver-to-main.sh --docs-main`

## Exemplo manual
```bash
git fetch origin
git switch main
git pull --ff-only
git worktree add ../wt-TASK-oda-20260224123000-backend -b TASK-oda-20260224123000-backend main
```

## Script utilitário
Use:
```bash
./scripts/create-worktree.sh --task TASK-oda-20260224123000 --suffix backend
```

## Mitigação de conflitos em memória
- Manter uma tarefa por arquivo em `memory-system/tasks/`.
- Tratar `memory-system/2-tasks.md` como artefato consolidado:
  - branches de task atualizam apenas `memory-system/tasks/*.md`;
  - `2-tasks.md` é reconciliado automaticamente no CI da `main`.
  - PR que altera `2-tasks.md` deve falhar no CI (enforcement de política).
- Tratar `memory-system/session-log.md` como artefato consolidado:
  - branches de task atualizam apenas `memory-system/session-log.d/*.md`;
  - `session-log.md` é reconciliado automaticamente no CI da `main`.
  - PR que altera `session-log.md` deve falhar no CI.
- Tratar `memory-system/workstreams/*/notes.md` como artefatos consolidados:
  - branches atualizam `memory-system/workstreams/*/notes.d/*.md`;
  - `notes.md` é reconciliado automaticamente no CI da `main`.
  - PR que altera `notes.md` deve falhar no CI.

## Merge strategy sugerida
- `memory-system/2-tasks.md`, `memory-system/session-log.md` e `workstreams/*/notes.md` usam `merge=ours` (consolidados).
- `memory-system/session-log.d/*.md` e `workstreams/*/notes.d/*.md` usam `merge=union` (fragmentos append-only).
- Nunca confiar apenas no merge automático para resolver conflito sem revisão humana.
