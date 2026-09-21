# Boilerplate Multi-IA para Desenvolvimento com Agentes

Guia operacional do boilerplate com workflow unificado e adapters por provider.

## Escopo deste diretório
Este diretório contém documentação sobre o próprio boilerplate (uso e evolução).

## Leitura Recomendada
- Guia completo consolidado: `GUIA-COMPLETO-BOILERPLATE.md`

## O que o boilerplate entrega
- Workflow padrão em `AGENTS.md`.
- Adapter específico para Claude em `CLAUDE.md`.
- Memória operacional em `memory-system/`.
- Placeholders de documentação de projeto em `docs/`.
- Bootstrap por briefing livre via `BRIEFING.md` + `skills/bootstrap/`:
  - scaffold de `docs/PROJECT_SPECS.md` e `memory-system/1-project-context.md`
  - substituição do `README.md` raiz por template inicial de projeto
  - refinamento semântico posterior via `skills/update-docs/` + humano+LLM
- Skills base: `skills/architect/`, `skills/testing/`, `skills/frontend/`, `skills/backend/`, `skills/security/` e `skills/devops/`.
- Skill transversal de entrega: `skills/delivery/` (PR + gate de CI antes do merge).
- Skill de release: `skills/release/` (versionamento, changelog, tag, smoke pós-deploy e gate de rollback).
- Skill de geração de skill: `skills/gen-skill/` (cria/atualiza uma skill por vez a partir de descrição breve).
- Skill de resumo executivo: `skills/gen-executive-summary/` (gera `docs/RESUMO-EXECUTIVO.md` a partir de `PROJECT_SPECS` e `EPICOS` para avaliação humana).
- Skill de execução autônoma de épico (padrão): `skills/gohorse/` (paralelismo orquestrado pela ferramenta Workflow do Claude Code — fan-out de subagentes de implementação em worktrees isoladas, entrega serial para `main`, e posse de arquivo "claim-on-first-touch": a task que disputa um arquivo já reservado adia para uma wave posterior em vez de colidir no rebase de merge).
- Skill de execução sequencial de épico (fallback): `skills/gohorse-light/` (variante sequencial e sem dependências do `gohorse`, uma task por vez via Agent tool; usar quando o primitivo Workflow/worktree não está disponível).
- Skill de autopilot completo de MVP: `skills/xgh/` (parte do `BRIEFING.md`, faz bootstrap, gera épicos/tasks e executa todos os épicos).
- Skill de execução paralela de épico: `skills/parallel/` (executa tasks de um épico em paralelo via tmux com agendamento por dependências).
- Skill de validação de épico: `skills/ep-check/` (quality gate end-to-end entre épicos — valida backend, frontend, testes, segurança, DevOps e code review).
- Skill de manutenção: `skills/housekeeping/`.
- Skill de otimização contínua: `skills/solve-issues/` (analisa issues/PRs, sugere melhorias para aprovação humana e orquestra implementação).
- Logs consolidados reconciliados no CI da `main`:
  - `memory-system/2-tasks.md`
  - `memory-system/session-log.md`
  - `memory-system/workstreams/*/notes.md`

## Setup Inicial
Pré-requisitos:
- `git` e `bash`
- `gh` (GitHub CLI) instalado e autenticado (`gh auth status`)

```bash
# Clone
git clone <boilerplate-repo> my-project
cd my-project

# Estrutura esperada (se necessário criar em projeto novo)
mkdir -p memory-system/{templates,task-docs,tasks}
mkdir -p docs
mkdir -p src
mkdir -p memory-system/workstreams/{architect,development,frontend,backend,testing,security,devops}
touch memory-system/{1-project-context.md,2-tasks.md,session-log.md}
touch docs/PROJECT_SPECS.md
touch BRIEFING.md
```

## Pós-Criação do Projeto (Obrigatório)
1. Preencher `BRIEFING.md` com descrição livre do projeto.
2. Executar bootstrap para gerar/preencher:
   - `docs/PROJECT_SPECS.md`
   - `memory-system/1-project-context.md`
   - `README.md` da raiz (template inicial de projeto)
3. (Opcional) Ajustar remotes manualmente:
   - `gh repo create <owner>/<repo> --private`
   - `git remote rename origin upstream`
   - `git remote set-url --push upstream DISABLED`
   - `git remote add origin <url-do-projeto>`
4. Executar `skills/update-docs/` para atualizar semanticamente o `README.md` (e demais docs necessários) com base em `PROJECT_SPECS` + `BRIEFING`.
5. Resolver dúvidas de bootstrap com o humano.
6. Bootstrap é exceção: pode usar commit/push direto na `main` com commits intermediários.
7. (Opcional) usar `skills/delivery/` com `--docs-main` para publicar bootstrap quando o escopo for somente documentação.
8. Tratar inconsistências do bootstrap como `WARN` até a decisão humana de marcar `READY_FOR_EXECUTION`.
9. Registrar tarefas iniciais em `memory-system/tasks/`.

## Fluxo Operacional
1. Ler `BRIEFING.md` (obrigatório no bootstrap, especialmente em `PRE_BOOTSTRAP`/`INCOMPLETE`).
2. Ler `docs/PROJECT_SPECS.md`.
3. Ler `memory-system/1-project-context.md`.
4. Verificar `Bootstrap Gate` em `memory-system/2-tasks.md`.
5. Ler `memory-system/2-tasks.md`.
6. Ler os fragmentos mais recentes quando existirem:
   - `memory-system/session-log.d/*.md`
   - `memory-system/workstreams/*/notes.d/*.md`
7. Escolher tarefa de maior prioridade e abrir o arquivo da tarefa em `memory-system/tasks/`.
8. Marcar `IN_PROGRESS` no arquivo da tarefa.
9. Criar planning doc com `memory-system/templates/planning-template.md` quando necessário.
10. Definir testes e critérios de aceite verificáveis (use `skills/testing/`).
12. Implementar e executar testes.
13. Criar report doc com template.
14. Marcar `COMPLETED` e atualizar logs/artefatos da task.
15. Para logs/notas, adicionar fragmentos em:
    - `memory-system/session-log.d/*.md`
    - `memory-system/workstreams/*/notes.d/*.md`
    (consolidação automática na `main`).

### Bootstrap em 4 estados
- `PRE_BOOTSTRAP`: `BRIEFING.md` ainda está em placeholder/template.
- `INCOMPLETE`: briefing real iniciado e bootstrap em iteração (`/bootstrap` + `/update-docs` quantas vezes necessário).
- `COMPLETE`: bootstrap aprovado para decomposição em roadmap (`/gen-epics` e `/gen-tasks`).
- `READY_FOR_EXECUTION`: epics/tasks aprovados; orquestração normal de implementação liberada.

## Regra de Clarificação de Testes
Se não estiver claro o que testar, comportamento esperado, ou o que define `PASS/FAIL`, o agente deve perguntar ao humano antes de implementar ou concluir a tarefa.

## Convenções
- Branch: `TASK-<github-login>-<task-key>-[role|workstream]`
- Commit: `<type>(task-<github-login>-<task-key>[-<scope>]): <description>`
- Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`
- Código fonte de aplicação: `src/` (ou `*/src/` em monorepo)

## Validação Automática
- Escopo dos scripts: validações sintáticas/estruturais fail-fast.
- Semântica de contrato: validação em linguagem natural na skill `skills/delivery/`
- Decisão de projeto: CI não valida semântica de negócio nem atesta resultado de testes de produto.
- Local: `./scripts/validate-all.sh`
- Pular validação apenas de forma explícita: `SKIP_GOVERNANCE_VALIDATION=1 ./scripts/validate-all.sh`
- CI: workflow `.github/workflows/governance.yml` roda por padrão em `push`/`pull_request` na branch `main`
- Escopo de validação:
  - links markdown locais
  - placeholders obrigatórios de task/modo
  - consistência de convenções e escopo
  - formato de datas
  - aviso (warning) para placeholders de bootstrap
  - aviso para consolidados desatualizados fora da `main`
  - avaliação semântica humana/arquitetural para Gate 0
  - referências de `Planning/Report` em tasks `Standard/Critical` com validação sintática real (sem placeholders)

## Colaboração Paralela (Opcional)
- Use `git worktree` para isolar contexto por tarefa/agente.
- Mantenha uma branch por tarefa (`TASK-<github-login>-<task-key>-[role|workstream]`).
- Consulte `docs/worktree-collaboration.md`.

## Providers
### Core (todos)
- Regras base e workflow: `AGENTS.md`

### Claude
- Instruções complementares: `CLAUDE.md`

### Codex
- Segue o core em `AGENTS.md`

## Checklist de Integridade
- [ ] Planejamento antes de código
- [ ] Testes sem manipulação
- [ ] Correção de causa raiz
- [ ] Relatório de execução entregue
- [ ] Memória e documentação atualizadas
- [ ] `docs/PROJECT_SPECS.md` atualizado quando escopo/requisitos mudarem
