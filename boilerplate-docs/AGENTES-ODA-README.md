# agentes-oda

Boilerplate do time de agentes extraído de `cmsp-validacao-web`. Contém **as 31 skills**
(8 personas + 23 workflows), os adapters de subagente do Claude Code, o runtime de
governança, os scripts de validação/entrega e o esqueleto do `memory-system`.

Sem código de produto: só a estrutura de agentes, pronta para um projeto novo.

---

## Personas (8) — `.claude/agents/*.md` + `skills/<nome>/`

| Persona | Função |
|---|---|
| `architect` | Design de sistema, fronteiras, contratos, ADRs e planos de migração. |
| `backend` | APIs, regra de negócio, acesso a dados, migrações, jobs, integrações. |
| `frontend` | Arquitetura de componentes, estado, rotas, formulários, a11y, performance de UI. |
| `devops` | CI/CD, build/deploy, IaC, observabilidade, release e rollback. |
| `security` | Threat model, authn/authz, segredos, vulnerabilidades, critérios de aceitação de segurança. |
| `testing` | Estratégia de teste, mapa requisito→teste, evidência de aceitação. |
| `review` | Revisão técnica, risco de regressão, achados ranqueados por severidade. |
| `incident-analyst` | Diagnostica violações de regra e drift de governança a partir das conversas. |

## Workflows (23) — `skills/<nome>/`

### Ciclo de vida do projeto

| Skill | Função |
|---|---|
| `bootstrap` | Inicializa o projeto a partir do `BRIEFING.md` e gera os artefatos de partida. |
| `gen-epics` | Propõe, refina com o humano e fecha o roadmap de épicos em `docs/EPICOS.md`. |
| `gen-tasks` | Quebra um épico aprovado na lista priorizada de tasks. |
| `gen-executive-summary` | Gera `docs/RESUMO-EXECUTIVO.md` para stakeholders. |
| `update-docs` | Atualiza a documentação existente por edições pontuais, nunca sobrescrevendo o arquivo. |

### Execução

| Skill | Função |
|---|---|
| `implement` | Orquestra uma task ponta a ponta: contexto → análise por persona → gates → execução → validação. |
| `gohorse` | Executa um épico inteiro em waves paralelas com worktrees isolados e entrega serial. |
| `gohorse-light` | Mesma entrega, sequencial e sem dependências — fallback estável do `gohorse`. |
| `parallel` | Executa tasks de um épico em várias instâncias do Claude Code via tmux. |
| `xgh` | MVP automatizado do `BRIEFING.md` ao fim: bootstrap → épicos → tasks → gohorse. |
| `solve-issues` | Analisa issues/PRs, propõe melhorias para aprovação e orquestra a implementação. |

### Qualidade e entrega

| Skill | Função |
|---|---|
| `delivery` | Validação semântica de governança + entrega por PR para a `main` com gate de CI. |
| `ep-check` | Fecha o épico: checagem multidimensional + gate humano de arquitetura e de UX manual. |
| `review-spec` | Revisão exaustiva de UMA spec com subagentes paralelos por dimensão. |
| `review-all` | Roda `review-spec` em todas as specs, em ordem de dependência, com commit por spec. |
| `release` | Release controlado: versão, changelog, tag, smoke pós-deploy e gate de rollback. |

### Governança e manutenção

| Skill | Função |
|---|---|
| `gen-governance-core` | Regenera `.governance/CORE.md`, `MINI.md` e `SUBAGENT.md` a partir dos docs fonte. |
| `gen-api-index` | Regenera `docs/INDEX-API.md` a partir das tags JSDoc, com header honesto de cobertura. |
| `gen-skill` | Cria ou atualiza uma skill do projeto (taxonomia, SKILL.md, recursos, validação). |
| `housekeeping` | Limpeza segura e mínima de estrutura, memória e docs. |
| `telemetry` | Hooks de telemetria em branch órfã (NDJSON) + alerta de drift estratégico em sessão. |
| `cc-watch` | Triagem diária dos releases do Claude Code, filtrando o que afeta este boilerplate. |
| `update-upstream` | Puxa e reconcilia atualizações do boilerplate upstream preservando decisões do projeto. |

---

## Estrutura

```
.claude/agents/       8 adapters finos de persona (frontmatter + 1-3 linhas)
.claude/settings.json wiring dos hooks de governança e telemetria
.claude/skills        junction → skills/   (descoberta de skills)
.agents/skills        junction → skills/   (provider-agnóstico)
skills/               31 skills (SKILL.md + scripts/ + references/ + hooks/)
.governance/          runtime de governança (CORE/MINI/SUBAGENT são gerados)
.github/workflows/    governance.yml + finalize-task-metadata.yml
scripts/              validadores, reconcilers, worktree, task-id, entrega
scripts/tests/        testes dos scripts de infraestrutura
memory-system/        contexto, tasks, session log, workstreams, templates
docs/                 specs, épicos, ADRs de processo, políticas
boilerplate-docs/     guias humanos (não consumidos pelos agentes)
taste-skill/          13 skills de design/frontend de terceiro (ver taste-skill/UPSTREAM.md)
AGENTS.md             contrato de workflow multi-AI (fonte da verdade)
INTEGRITY-RULES.md    regras inegociáveis
CLAUDE.md / SUB_CLAUDE.md  overrides do provider Claude
```

### taste-skill

Cópia achatada de [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) @ `b177427`
— pacote anti-slop de skills de design (`brandkit`, `taste-skill`, `gpt-taste`,
`imagegen-frontend-web/mobile`, `image-to-code`, `redesign`, `minimalist`,
`brutalist`, `stitch`, `soft`, `output`). Instale com `bash taste-skill/skill.sh`.
Não tem histórico git próprio; para atualizar, clone o upstream e substitua o diretório.

## Como começar um projeto novo

```bash
git clone ~/dev/agentes-oda ~/dev/<projeto>    # ou: cp -r
cd ~/dev/<projeto>
bash scripts/setup-links.sh                    # OBRIGATÓRIO — cria .claude/skills e .agents/skills
```

Para começar com histórico limpo em vez de herdar os commits do boilerplate:

```bash
rm -rf .git && git init && git add -A && git commit -m "chore: bootstrap a partir do agentes-oda"
```

Depois, dentro do Claude Code:

1. Preencha `BRIEFING.md`.
2. Ajuste `.governance/IDENTITY.md` (identidade Tier A, mantida à mão).
3. Rode `/gen-governance-core` — `CORE.md`, `MINI.md` e `SUBAGENT.md` ainda não existem
   e o health check do SessionStart vai apontar isso até você gerar.
4. Rode `/bootstrap` e siga o fluxo: `/gen-epics` → `/gen-tasks` → `/implement`.

### Por que `setup-links.sh` é obrigatório

`.claude/skills` e `.agents/skills` são links para `skills/` — é assim que o Claude Code
descobre as 31 skills. Eles **não são versionados**: no Windows são junctions, que o git
atravessa e duplicaria as skills três vezes no índice; e symlink real exige Developer Mode
ou privilégio de administrador. O script cria junction no Windows e symlink no Unix.
Sem ele, o projeto novo não enxerga nenhuma skill.

## O que ficou de fora, de propósito

- Código do produto (`app/`, `lib/`, `components/`, `supabase/`, `tests/`, `migrations/`).
- Scripts de negócio do CMSP (`ep027-*`, `ep030-*`, `coletar-cdp`, `gen-pdf-*`, …).
- Histórico do `memory-system` (session log, tasks, handoffs, notes) — estrutura mantida, conteúdo zerado.
- Docs de produto (`PROJECT_SPECS`, `EPICOS`, `PREREQUISITES`, `BRIEFING`) — viraram templates.
- ADRs de produto (`ADR-P01..P08`). Os ADRs de processo `ADR-001..018` foram mantidos.
- Artefatos gerados de governança — serão regerados no primeiro `/gen-governance-core`.

## Pontos de atenção herdados

- `ADR-017` em `docs/decisions.md` registra uma exceção datada de CI do projeto de origem;
  revise se ela faz sentido no projeto novo.
- `.governance/ci-mode.conf` está em `lite`. Mudar CI/CD exige autorização do gestor (ADR-016).
- `scripts/validate-all.sh` é lento no Windows; o gate por task é `scripts/validate-changed.sh`.
