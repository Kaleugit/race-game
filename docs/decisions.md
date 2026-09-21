# Architectural Decision Records

Conjunto mínimo de decisões ativas do boilerplate (versão resumida).

## ADR-001: Governance Boundary (Syntax vs Semantic)
- Date: 2026-02-24
- Status: Accepted
- Deciders: Human + Architect
- Decision:
  - CI de governança valida só sintaxe/estrutura.
  - Semântica (incluindo qualidade de evidências e consistência real) fica em `skills/delivery` + revisão humana quando necessário.
  - Em `Standard/Critical`, `Planning`/`Report` não podem ser placeholders no gate sintático.
  - Em `Quick`, gate sintático exige `Evidence`; avaliação de qualidade é semântica.
- Consequence: pipeline rápido com responsabilidade operacional explícita.

## ADR-002: Bootstrap Advisory Policy
- Date: 2026-02-24
- Status: Accepted
- Deciders: Human + Architect
- Decision:
  - Gate 0 de bootstrap é advisory (`WARN`), não bloqueante.
  - Execução de bootstrap/planning pode seguir em `PRE_BOOTSTRAP/INCOMPLETE` com risco aceito.
  - Bootstrap pode ocorrer direto na `main` quando alinhado com humano/arquiteto.
- Consequence: maior velocidade no início, com necessidade de validação humana ativa.

## ADR-003: Consolidated Memory via Fragments
- Date: 2026-02-24
- Status: Accepted
- Deciders: Human + Architect
- Decision:
  - Consolidado em `main`: `session-log.md` e `workstreams/*/notes.md`.
  - Edição em branches: apenas fragmentos append-only (`*.d/*.md`).
  - CI da `main` reconcilia consolidado automaticamente.
- Consequence: menos conflitos em colaboração paralela.

## ADR-004: (Reserved)
- Date: 2026-02-24
- Status: Withdrawn before publication
- Note: Number intentionally skipped. No decision was recorded under this ID.

## ADR-005: Portability Debt for GNU-specific Utilities
- Date: 2026-02-24
- Status: Accepted
- Deciders: Human + Architect
- Decision: manter dependências GNU como dívida técnica priorizada para depois.
- Consequence: fluxo principal simplificado agora, com possíveis ajustes manuais em macOS.

## ADR-006: Skills Symlink for Claude Code Integration
- Date: 2026-02-25
- Status: Superseded by ADR-007
- Deciders: Human + Architect
- Decision:
  - `.claude/skills` is a symlink to `../skills`, allowing Claude Code to recognize project skills as native slash commands without duplication.
  - `.claude/agents/*.md` must use valid subagent frontmatter and preload canonical persona skills via `skills: [<skill>]`.
  - `.claude/commands/*.md` must stay as thin adapters with frontmatter and delegation to canonical workflow skills.
  - Skills remain in `skills/` (canonical boilerplate path, provider-agnostic).
  - Windows is not supported for now (Git symlinks require special permissions on Windows).
- Consequence: zero duplication in behavioral source of truth (`skills/*/SKILL.md`) while keeping Claude-native subagents/commands operational. Needs revisiting if Windows support becomes required.

## ADR-007: Interoperable Skills Model (Direction 2)
- Date: 2026-02-26
- Status: Accepted
- Deciders: Human + Architect
- Decision:
  - Authoritative specification: `skills/gen-skill/references/interoperable-skills-model.md`.
  - Direction 2 only: subagent loads skill (never skill spawns subagent).
  - `metadata.kind` replaces top-level `kind` for agentskills.io compliance.
  - Persona skills: `user-invocable: false`, consumed via `.claude/agents/<name>.md` subagent adapters.
  - Workflow skills: `disable-model-invocation: true`, discovered via `.claude/skills -> ../skills` symlink.
  - `.claude/commands/` eliminated. Workflow skills appear as `/name` commands automatically through symlink.
  - `.agents/skills -> ../skills` added for Codex discovery.
  - Forbidden SKILL.md fields: top-level `kind`, `context`, `agent`, `model`.
  - Validation: `scripts/validate-skill-taxonomy.sh` enforces 11 rules.
- Consequence: single canonical source per skill, zero behavioral duplication across providers, agentskills.io-compliant frontmatter.

## ADR-009: Governance Runtime Payload as Imperative Prose
- Date: 2026-06-12
- Status: Accepted
- Deciders: Human + Architect
- Context:
  - O payload de governança injetado pelos hooks (`SessionStart`/`PostCompact` → L2, `UserPromptSubmit` → L1, `SubagentStart` → L3) era YAML estruturado com campos `id`, `source`, `category`, `priority`, `trigger`, `rationale` por regra.
  - O metadado-de-regeneração (~50% do payload) servia à ferramenta de regen, não ao agente em execução. L2 chegou a ~9 KB e crescia a cada nova regra.
- Decision:
  - Separar payload injetado (prosa imperativa) de metadado de auditoria (`.governance/meta.yaml`).
  - `.governance/{CORE,MINI,SUBAGENT}.md` passam a ser prosa organizada por prioridade visual (`INTEGRITY` → `BLOCKING — <trigger>` → `HIGH — <trigger>` → `DECISION CRITERIA`), uma frase imperativa por regra, sem IDs/sources/triggers/categorias inline.
  - `.governance/meta.yaml` continua em YAML estruturado com `generated_at`, `generator`, `sources[]` (path + sha256). Nunca é injetado em runtime; existe para audit/diff/drift detection.
  - O LLM agora produz os três `.md` diretamente no mesmo regen pass; os filtros determinísticos antigos (`filter-l1.py`, `filter-l3.py`) foram removidos.
  - Rastreabilidade (qual fonte gerou qual regra) é recuperável a partir das fontes versionadas + `meta.yaml`.
- Consequence:
  - L2 cai de ~9 KB para ~3.6 KB (-60%), L3 de ~5.6 KB para ~2.8 KB (-50%), L1 de ~1.0 KB se mantém em ~1.0 KB com mais clareza.
  - Agente lê a regra direta, sem parsing YAML mental.
  - Audit/escalation continua possível via `meta.yaml` + fontes.
  - Filtros determinísticos saem do escopo da skill (LLM gera os três payloads sob medida em vez de derivar L1/L3 de L2).

## ADR-008: Bootstrap Lifecycle With Execution Readiness State
- Date: 2026-02-26
- Status: Accepted
- Deciders: Human + Architect
- Decision:
  - Bootstrap gate now has four states: `PRE_BOOTSTRAP`, `INCOMPLETE`, `COMPLETE`, `READY_FOR_EXECUTION`.
  - `PRE_BOOTSTRAP` means `BRIEFING.md` is still template/placeholder.
  - `INCOMPLETE` means first project-specific briefing exists and docs are under iterative refinement (`/bootstrap` and `/update-docs` may run repeatedly, including direct commits on `main` under advisory validation).
  - `COMPLETE` means bootstrap docs are human-approved for roadmap decomposition.
  - `READY_FOR_EXECUTION` means `docs/EPICOS.md` is human-approved and `gen-epics` updated the bootstrap gate for normal implementation orchestration.
  - Governance CI advisory mode on `main` applies while bootstrap is `PRE_BOOTSTRAP`, `INCOMPLETE`, or `COMPLETE` (all three are bootstrap/planning stages).
- Consequence: clear separation between documentation maturity and implementation readiness, with explicit human approval gates.

## ADR-010: Configurable Governance CI Mode (strict/lite/off)
- Date: 2026-06-12
- Status: Accepted
- Deciders: Human + DevOps
- Context:
  - `skills/delivery/scripts/deliver-to-main.sh` already runs `./scripts/validate-all.sh` locally as a gate before pushing the branch.
  - `.github/workflows/governance.yml` re-runs the same validator remotely on every `pull_request` (open/synchronize) AND every `push: main`, validating the same HEAD twice or more per delivery.
  - Empirical observation in derived PRIVATE projects: ~5 governance runs per PR (PR open + synchronize commits + merge push + reconcile push by bot + bootstrap-status push), ~50 runs/epic, driving GitHub Actions billing to exhaustion. The boilerplate itself has been blocked by `recent account payments have failed` during this very task.
  - On PUBLIC repositories Actions cota is generous and the redundancy is acceptable; on PRIVATE repositories it is the dominant cost driver.
- Decision:
  - Introduce optional file `.governance/ci-mode.conf` containing a single mode token on the first line.
  - Three supported modes:
    - `strict` — current behavior verbatim. CI runs on `pull_request` (open/synchronize) AND `push: main`, including bot pushes. Use for PUBLIC repos and projects with comfortable Actions cota.
    - `lite` (DEFAULT when the file is absent) — CI only runs governance validation on `push: main` by human actors. PR events and `github-actions[bot]` pushes early-exit neutrally green. Use for PRIVATE repos that follow the standard `deliver-to-main.sh` flow (local validate-before-push gate already exists).
    - `off` — CI never runs validation. Authoritative gate is the local pre-commit hook installed via `scripts/install-pre-commit-hook.sh`. Use as the last resort when Actions cota must be reduced to near-zero.
  - Both `.github/workflows/governance.yml` and `.github/workflows/finalize-task-metadata.yml` resolve the mode in their first step and early-exit `0` (neutrally green) when applicable. The neutral exit preserves branch-protection required-check satisfaction so PR merges are not blocked.
  - `finalize-task-metadata.yml` only short-circuits on mode `off` because it is a single lightweight run per merge and continues to provide value for both `lite` and `strict`.
  - Default mode `lite` reflects the boilerplate's primary use case (PRIVATE derived projects). PUBLIC repos that want the previous behavior must opt-in by writing `strict` into `.governance/ci-mode.conf`.
- Consequence:
  - Expected ~80% reduction in governance Actions runs for derived projects using the default `lite` mode (PR-event runs and bot-push runs are eliminated; only the post-merge `push: main` by the human merger runs).
  - `lite` trade-off: no remote redundancy for PR events. Accepted because `deliver-to-main.sh` already runs `validate-all.sh` locally before push and the contract is that delivery uses that script.
  - `off` trade-off: zero remote enforcement; a developer bypassing the local pre-commit hook (e.g., `git commit --no-verify`) bypasses governance entirely. Documented as the last resort; recommend pairing with manual review discipline.
  - `[skip ci]` markers on bot commits remain in place as an additional safety belt (already in `governance.yml` reconcile step and `finalize-task-metadata.yml` finalize step).

## ADR-011: Deprecate AIDEV-TODO and AIDEV-QUESTION; keep AIDEV-NOTE only
- Date: 2026-06-12
- Status: Accepted
- Deciders: Human + DevOps
- Context:
  - The original `AIDEV-*` convention defined three prefixes: `AIDEV-NOTE`, `AIDEV-TODO`, `AIDEV-QUESTION`.
  - Empirical audit in 2026-06 on `artboss_poc` (a derived project in production) found 840 total `AIDEV-*` occurrences, of which ~100% are `AIDEV-NOTE`. `AIDEV-TODO` and `AIDEV-QUESTION` are essentially absent.
  - TODO items migrated to task-docs (`memory-system/tasks/`) and GitHub issues where they can be prioritized and tracked. Open questions are now handled by explicit inline human escalation per `AGENTS.md` §"Autonomous Decision-Making". Both variants lost their purpose.
- Decision:
  - Deprecate `AIDEV-TODO` and `AIDEV-QUESTION`. Keep only `AIDEV-NOTE` as the active convention.
  - `AGENTS.md` section renamed from "`AIDEV-*` Comments" to "`AIDEV-NOTE` Comments"; deprecated prefixes listed in an explicit subsection.
  - `docs/glossary.md` updated: the `AIDEV-*` entry becomes `AIDEV-NOTE` and references this ADR.
  - Existing occurrences of `AIDEV-TODO` and `AIDEV-QUESTION` in derived projects remain syntactically legal and are not invalidated. No migration required upfront; conversion happens opportunistically when the surrounding code is touched.
- Consequence:
  - Simpler convention to retain (1 active prefix vs 3).
  - TODOs explicitly routed to task-docs/issues where they can be prioritized.
  - Open questions explicitly routed to inline human escalation, aligned with the existing decision-making protocol.
  - Reversibility: reversible. A future PR may reintroduce one or both prefixes if empirical evidence shows the need.

## ADR-012: Worktree-isolation guard — layered advisory controls + hard local gate, not a harness hook
- Date: 2026-06-14
- Status: Accepted
- Deciders: Human + Architect/DevOps/Security (via /solve-issues issue #43)
- Context:
  - Confirmed upstream Claude Code bugs silently break worktree isolation: `anthropics/claude-code` #33045 (`isolation: worktree` is a no-op when spawned with `team_name`; agent born in primary repo on the parent's branch) and #51596 (`isolation: worktree` silently reuses a stale/contaminated worktree on agentId 8-hex prefix collision, even WITHOUT `team_name`). Agent teams are documented experimental/best-effort.
  - INC-2026-06-14 (derived project `artboss_poc`): an agent detected the mismatch but, instead of aborting, GUESSED a sibling worktree from `git worktree list` and committed into another session's branch (cross-session bleed).
  - The boilerplate itself is exposed via #51596 (gohorse2 uses `agent({ isolation: "worktree" })` without `team_name`). No boilerplate skill uses `team_name`. No spawn template verified isolation before writing. The isolation rule existed only in a maintainer's global `~/.claude/CLAUDE.md`, which is excluded from `gen-governance-core` sources, so it never reached agents.
  - The four `scripts/tests/test-*.sh` harnesses were orphan — never run by CI or `validate-all.sh`.
- Decision:
  - L1 (governance): add a Forbidden Violation to `INTEGRITY-RULES.md` ("verify isolation; if unconfirmed, ABORT — never guess a worktree") so it propagates via `gen-governance-core` to MINI (every turn) + CORE + SUBAGENT (every subagent). Add the verify procedure + `team_name`+`isolation` anti-pattern + manual-launch rules to `AGENTS.md` §Subagent Delegation Model.
  - L2 (mechanical): add `scripts/assert_isolated.sh` (cooperative `--expected-branch` mode + `--pre-commit` mode; exit 0/1/2; never enumerates worktrees; hardened: unsets GIT_DIR/GIT_WORK_TREE, canonicalizes paths, rejects detached HEAD, arg-injection-safe, optional `--require-clean` for #51596). Wire a literal verify-before-write step into all spawn templates (gohorse, gohorse2, implement, parallel). Run the bash harnesses in CI via `scripts/run-tests.sh` wired into `validate-all.sh`.
  - L2c (forcing function for manual/ad-hoc launches — human directive): extend `scripts/install-pre-commit-hook.sh` to run `assert_isolated.sh --pre-commit` and install into the shared common hooks dir, so any committer (manual agent team, ad-hoc agent, or human) is blocked from committing a `TASK-*` branch from the primary repo regardless of spawn method.
  - L3 (hygiene): confirmed `deliver-to-main.sh` already removes+prunes the task worktree post-merge; no rewrite (KISS).
  - Rejected: a Claude `PreToolUse` hard-block hook — harness-version-fragile, high blast radius (YAGNI). The existing delivery contamination detectors (`detect_cross_task_file_contamination`, `detect_overlapping_task_commits`) remain the terminal hard gate.
- Consequence:
  - Defense-in-depth that does not depend on the upstream harness being fixed, and reaches agents even when the team-spawn bypass may skip the SubagentStart hook (rule travels in the prompt payload + the git hook).
  - Honest limitation: an agent that `cd`s into another session's worktree and commits there is a session-identity problem NOT mechanically catchable by a git hook (commit is internally consistent with that worktree); covered by the cooperative guard `--require-clean` + delivery detectors. The pre-commit hook only protects if the operator installs it.
  - A latent robustness gap in `validate-conventions.sh` (crashes in a non-git dir instead of degrading) was surfaced while wiring tests into CI; flagged as a follow-up, intentionally not bundled here.
  - Closed the orphan-harness CI gap for all siblings.
  - Reversibility: reversible (additive scripts/doc lines + an additive CI step; no schema/contract change).

## ADR-013: Epic Closing Gate — Human Validation + Zero-Leftover + Incremental Re-check
- Date: 2026-06-24
- Status: Accepted (Phase 4.2 — gate de UX — emendado pelo ADR-014: UX migra para sessão dedicada; `ep-check` mantém 4.1 delta arquitetural e emite veredito "AWAITING UX")
- Deciders: Human + Architect
- Context:
  - O pipeline autônomo (`gohorse`/`gohorse-light`/`parallel`) fechava o épico ao final da execução: rodava `ep-check` mas declarava "epic complete" independentemente do veredito, e nada forçava o humano de volta ao loop.
  - Dois efeitos colaterais do boilerplate funcionar bem: (1) o humano perde a consciência arquitetural do projeto (vira carimbo); (2) o teste manual de UX — única responsabilidade de teste do humano por governança — deixa de ser feito.
  - O `ep-check` delegava UX à dimensão `frontend` (e2e do agente), em tensão com a regra "the human's ONLY testing responsibility is UX".
- Decision:
  - `ep-check` ganha **Phase 4: dois gates humanos BLOQUEANTES** — 4.1 Briefing de Delta Arquitetural (humano lê e reconhece como o sistema evoluiu desde o épico anterior) e 4.2 Teste Manual de UX (humano executa roteiro derivado das CA-UX e dá PASS/FAIL). A dimensão Frontend passa a validar só fiação funcional; o veredito de UX é do humano.
  - Veredito passa a ser **GO / AWAITING HUMAN VALIDATION / NO-GO**. Épico é "completo" só no **GO final**.
  - **Política zero-leftover**: ao fechar, nada fica para trás (nem Low), salvo deferral que é decisão exclusiva do humano, com motivo registrado (obrigatório) e item de rastreamento. Critical/High nunca são deferíveis.
  - **Re-check incremental** (controle de custo): 1ª execução é full + grava baseline (SHA + findings abertos); re-execuções re-validam só o escopo alterado + findings em fechamento + suite de testes. Evita re-rodar as 6 dimensões a cada correção.
  - Executores (`gohorse`/`gohorse-light`/`parallel`) só marcam `Status: DONE` em `EPICOS.md` no GO final; em AWAITING/NO-GO reportam pendências e param.
  - Optado por **skill única** (`ep-check` estendido) em vez de uma skill `ep-close` separada: os gates humanos já rodam uma vez só (Phase final), uma 2ª skill seria superfície extra sem reduzir custo (KISS/YAGNI). Reversível: extrair depois se o ritual de fechamento crescer.
- Consequence:
  - Restaura consciência arquitetural e posse de UX do humano na fronteira de épico, sem quebrar a autonomia por-task do pipeline.
  - Custo do loop fix→re-check controlado pelo modo incremental.
  - Regra propagada à governança via `AGENTS.md` §Epic Closing Gate (+ regeneração de `.governance/*`).
  - Reversibilidade: reversível (edições aditivas em docs de skill + governança; sem mudança de schema/contrato).

## ADR-014: Modelo de Delivery por Épico — Gates em Camadas, Working-dir Imutável, Isolamento de Runtime e Durabilidade de Assets
- Date: 2026-06-30
- Status: Accepted — implementação pendente (follow-up por skill/script)
- Deciders: Human + Architect
- Context:
  - O custo de Actions é dominado por suítes caras (e2e/integração) rodando por-task; o teto de 2000 min/mês do GitHub Actions free estoura. O ADR-010 mitigou redundância de CI de governança (modos `lite/strict/off`), mas não tocou no gate de testes da aplicação por-task.
  - A unidade de desenvolvimento do ponto de vista do operador humano é o **épico**, não a task.
  - Havia confusão recorrente sobre em qual branch o working dir primário está.
  - Projetos derivados lidam com assets grandes (modelos ONNX, datasets) cuja fonte upstream pode sumir; o `ml_mer` já implementa o padrão durável via Modal volumes + `manifest.json` + `docs/data-hashes` + `raw_archives`, mas sem a camada de worktree.
  - Sem container no stack-padrão; agentes paralelos (gohorse) sobem servers/DBs que colidem em porta/estado.
- Decision (6 blocos convergidos):
  - **B1 — Gates de CI em 3 camadas (unidade = épico).** Fluxo `main ← epic/<id> ← task/*`. `task→epic`: gate **leve** (governança + lint + unit do escopo) + testes locais do agente. `epic→main`: gate **pesado completo** (tudo + e2e + validações), clean-room, **1x por épico** (testa o épico já integrado contra o `main` atual → preserva estado pós-merge na granularidade-épico). Local **e** CI com intensidades distintas (local = evidência do agente + feedback; CI = confirmação independente); nunca só-CI nem só-local na fronteira da main. **Telemetria = rede, não catraca**: mede divergência local-vs-CI (para *merecer* relaxar CI no futuro) + full-run noturno na main como backstop; só-local+telemetria é aceitável em `task→epic`, nunca em `epic→main`. Economia: de ~N full-runs/épico para 1.
  - **B2 — Invariante do working-dir + merge via PR (Opção A).** Working dir primário **sempre na main**, sincronizado, **nunca autor** de commit de feature/merge. Todo trabalho em worktree; main avança só por `git pull` após PR fechar no GitHub. Merge **autorado pelo GitHub** via PR (`gh pr merge` pós-CI verde) — merge-local-e-push furaria o gate. PR sai da branch da worktree, não da main. Código tracked muda só via worktree+branch+PR, inclusive hotfix de 1 linha.
  - **B3 — Sessão UX sign-off / hotfix como arquétipo worktree-isolado.** `ep-check` no `epic→main` dá **GO técnico + ack de delta arquitetural → veredito "AWAITING UX"** (refina o ADR-013: a evidência de UX migra para fora do épico). UX sign-off = **sessão separada** (não task do épico), hotfix-shaped: worktree própria a partir da main, humano roda o app lá, fixes = commits pequenos, **1 PR / N commits**, gate leve, **aceite humano = catraca**, gera o **GO final → épico DONE**. Working dir primário fica livre. **Hotfix = mesmo arquétipo**, só muda o gatilho. Scripts `hotfix.sh`/`ux-signoff.sh` (1 comando: cria worktree + pré-aloca runtime) dão a ergonomia "edita-e-vê-rodando" sob a regra A.
  - **B4 — Working-dir como "instalação" + config-local em 2 camadas.** Primário = instalação da última main = árvore tracked limpa + conteúdo legítimo local-only. Config divide em: **(camada 1) segredos/config de operador COMPARTILHADOS** (`.env`, tokens, keys) — fonte única na main, worktree **herda por symlink** (muda uma vez, propaga); **(camada 2) runtime PER-WORKTREE** (`PORT`, `DB_NAME`, state) — **gerado** no `.env.local` da worktree, nunca herdado. Ordem de carga `.env` (compartilhado) → `.env.local` (override da worktree) dá isolamento + permite override de segredo por worktree. Agente nunca edita a árvore primária; só o humano mexe em config-local.
  - **B5 — Runtime-isolation (sem container).** Isolamento de runtime espelha o de git. **Provisão lazy no 1º boot** (criar worktree continua instantâneo; task de docs/front não paga DB). **DB:** sqlite-file per-worktree, ou server pg/mysql compartilhado + DB per-worktree clonado de **template pré-migrado+seedado** (clone em ms; rebuild só quando o hash das migrations muda). Tiering: unit usa in-memory/rollback; clone pesado só no gate e2e do épico + instância de UX. **Portas:** faixa `4000–4999`; `4000–4099` reservada (staging/humano futuro); alocador dá blocos de 10 a partir de `4100`, escaneia livre, grava `.env.local`; nada hardcoded. **Teardown:** remover worktree dropa DB + libera portas + **mata processo órfão** (estende o sweep do #81).
  - **B6 — Assets grandes: durabilidade + distribuição.** **Padrão obrigatório:** pesado fora do git (gitignored) · **manifesto-lockfile** (nome lógico, URL primária, **URL do mirror próprio**, sha256, tamanho, licença) · **mirror re-hospedado sob controle do projeto** (mais forte que fork) · **fetch-script idempotente verificando hash, mirror-first** · raw-archives preservados. **Backend pluggable por-projeto, por localidade do consumidor:** default **modelos→Modal volume** (mount-direct no compute Modal, egress-zero) e **demais assets→Cloudflare R2** (egress-zero para CI/local); HF próprio se público; o manifesto decide caso a caso. Um backend por asset (sem duplicar). **Distribuição local:** working dir primário guarda o store completo gitignored; **worktrees fazem `ln -s`** (não hardlink) para o store da main — zero cópia/re-download (funciona limpo porque é gitignored). Store content-addressed por sha = YAGNI por ora. **CI** puxa do mirror com cache keyed no hash do manifesto; e2e com asset 1x/épico. **Guards:** pre-commit rejeita arquivo **> 10 MB** não-declarado + rejeita ref de asset sem entrada no manifesto; licença capturada (compliance).
- Consequence:
  - Custo de Actions cai de ~N full-runs/épico para 1 + nightly; mantém independência e clean-room na fronteira que toca a main e propaga para derivados.
  - Resolve a confusão de branch do working dir com um invariante único e mecanicamente verificável.
  - Devolve ao humano UX e consciência arquitetural numa sessão enxuta (1 PR/N commits), sem quebrar a autonomia por-task.
  - Assets grandes ficam reprodutíveis (hash pinning) e resistentes a sumiço do upstream (mirror próprio), com disco/rede controlados via symlink + tiering.
  - Relação com ADRs anteriores: estende o modelo de custo do **ADR-010** (move o gate caro para granularidade-épico) e refina o **ADR-013** (separa o gate de UX do `ep-check` para uma sessão dedicada).
  - **Implementação pendente (follow-up, com plano antes de codar):** `gohorse`/`gohorse-light`/`parallel` (fluxo epic-branch + PR-autorado), `delivery` (gates em camadas), `ep-check` (veredito técnico vs GO final de UX), `scripts/create-worktree.sh` (symlink de `.env` + store + alocador de runtime + `.env.local`), `scripts/assert_isolated.sh` (assert working-dir limpo na main), novo arquétipo `ux-signoff`/`hotfix`, `fetch-assets.sh` + manifesto, alocador de portas/DB-template, guards pre-commit (10 MB + manifesto), extensão do sweep de processo órfão.
  - Reversibilidade: a decisão é direcional e reversível por bloco (edições aditivas em skills/scripts/docs; sem mudança irreversível de schema). Cada bloco pode ser adotado/revertido independentemente.

## ADR-015: Task-branch registry drift — verify the `Branch:` field at write/commit time, and reserve epic numbers on `main`
- Date: 2026-08-17
- Status: Accepted
- Deciders: Human + Architect/Testing (via /implement, TASK-kaleu-20260817164302)
- Context:
  - INC-2026-08-17: a review of `EP-028` found the registry no longer describing reality, in two ways with one shared cause.
  - **Drift 1 — 23 task files whose `Branch:` the rule cannot accept.** `AGENTS.md:313` requires each task to own its branch; `scripts/validate-conventions.sh:344` implements that faithfully (`^${task_id}-[a-z0-9-]+$`). Two distinct groups: 13 files (12 timestamped + `TASK-kaleu-EP-028-01`) declare `TASK-kaleu-EP-027-01-implement` — a branch that DID exist (PR #247) and where the work was really done, so the datum is true but one branch cannot be named after 13 tasks; and 10 files (`TASK-kaleu-EP-028-02..11`) declare `TASK-kaleu-EP-027-02..11-implement` — branches that **never existed**, verified across every ref, merge and the full history. Only two branches ever existed for this epic: `TASK-kaleu-EP-027-01-implement` (PR #247) and `TASK-kaleu-20260806113259-cs-ia` (PR #239), both merged 2026-08-14 and deleted.
  - **Root cause of drift 1:** an epic's `TASKS.md` emits a `Suggested Branch:` per task at planning time — the name a task WOULD have if executed alone. That value was copied into each task file's `Branch:` field. Execution was then consolidated into a single PR by human decision, the branches were never created, and the field was never corrected. **`Branch:` never recorded a fact; it recorded an intention, and nothing in the flow verified that the intention became real.**
  - **Why the existing guard missed it:** `scripts/assert_isolated.sh` runs before the first write and asks "am I on the branch this task declares?". It passed — the task DECLARED the consolidated branch. Nothing checked that the declared branch derives from the task's own id. That check only happened weeks later, in bulk, on `validate-all.sh`.
  - **Drift 2 — epic number collision.** The epic was born `EP-027`. Meanwhile `main` gave `EP-027` to a different epic (`c07fe95e1`). Commit `247acfc07` resolved the conflict by renumbering to `EP-028` — but renamed only files and `EPICOS.md`, leaving the internal values (task `Status`, `Branch:`) pointing at `EP-027`.
  - **Root cause of drift 2:** in `skills/gen-epics/SKILL.md` the number was chosen at step 5 and only became public at step 10 (commit to `main` after human approval). Everything in between was a window invisible to other devs — and another dev's still-local epic is invisible to git entirely.
- Decision:
  - **Rejected first, and explicitly vetoed by the human: relaxing the validator.** A `Consolidated Into:` field was proposed to let a documented consolidation pass. The human ruled that no established git-flow rule may be waived. `AGENTS.md:313` has exactly one sanctioned exception (bootstrap); a second one would have been invented to make a validator green. The validator was never wrong — the data was.
  - L1 (governance): `AGENTS.md` §Collaboration And WIP now states that consolidating tasks into one branch/PR violates the rule, that the agent MUST WARN the human when the flow heads there instead of proceeding silently, and that `Branch:` records the branch that actually exists — never a copied `Suggested Branch:`.
  - L2 (mechanical): `scripts/assert_isolated.sh` gains a task-branch registry check in BOTH modes. CHECK-A: ≥2 task files declaring the current branch is the exact signature of consolidation → fail. CHECK-B: a single declarer whose id does not derive the branch → fail. **Zero declarers always passes** — that is the normal path (a worktree is branched from `main` before its task file exists there), and it keeps the script working for non-task branches, harness fixtures and derived projects with no `memory-system/` layout. No new CLI flag: the contract is unchanged (exit 1 still means only "usage error").
  - **`--pre-commit` is the enforcing point, not the cooperative mode.** Reconstructing the incident: when the agent began task #2 on the consolidated branch, only ONE task file declared it; the cooperative guard runs before the write that creates the violation, so it would have passed. Consolidation only becomes observable after that write — which the pre-commit hook sees. It is also the only point covering manual/ad-hoc flows that never call the cooperative mode.
  - L2b (epic numbering): **`origin/main` already solved most of this before this ADR was written.** `skills/gen-epics/SKILL.md` carries an "Epic ID Allocation Protocol (multi-developer)" section, shipped with EP-027, whose rule 1 already requires reserving the number on `main` before branching and whose rule 2 already requires reading `docs/EPICOS.md` at `origin/main`, both enforced by `scripts/validate-epic-ids.sh`. This ADR therefore contributes only three things on top of it: **(N1)** a BLOCKING question to the human about an epic another dev holds still-local and unpushed — the one state git cannot observe at all, added as rule 3; **(N2)** an explicit reservation-stub format on rule 1, where it previously said only "title + one-line objective is enough"; **(N3)** the requirement, on the renumbering rule, that a renumber propagate to every internal VALUE — task file IDs and their `Status`, `Branch:` fields, the epic's `TASKS.md`, commit-message convention — and not merely to filenames, which is the exact failure of `247acfc07`.
  - **An earlier draft of this ADR was wrong and is recorded here rather than quietly deleted.** It proposed a separate step 7 duplicating reservation-on-main, and a new `Status: RESERVED` value, arguing that reusing `PLANNED` would claim approval that does not exist. Both were dropped when the branch was merged: step 7 restated rule 1 ~30 lines away in the same file **and disagreed with it** about what a reservation contains, which is the very drift class this ADR exists to stop; and `RESERVED` is absent from the canonical enum in `skills/gen-epics/references/epicos-template.md` (`PLANNED | IN_PROGRESS | DONE | CANCELED`), so inventing it violates No Invention. `Reserved By`/`Reserved At` were dropped for the same reason — commit author and date already record both. The real `EP-029` reservation landed on `main` as `Status: PLANNED` (`b1d0742bc`). **The duplication existed because the branch was reviewed with `git diff origin/main...HEAD`, whose three-dot form resolves to a merge-base 51 commits stale and cannot show what `main` gained since the branch point.** Reviewing a long-lived branch therefore requires `git merge-tree --write-tree origin/main HEAD` on every protected path as well.
  - **Not remediated, by explicit human decision:** the 23 existing task files and the `EP-028` status are left as they are. The group-B branches never existed and the two real ones are merged and deleted, so any rewrite would be fabrication (No Invention). Recorded as accepted debt in `memory-system/tech-debt.md`.
- Consequence:
  - The failure moves from "discovered in bulk weeks later" to "blocked at the offending commit", with a message naming `AGENTS.md:313`.
  - Verified on the real corpus, not only in sandbox: over 228 task files, CHECK-A flags 13 and CHECK-B flags 23 — **precisely the same 23 that `validate-conventions.sh` already rejects**, and zero of the other 205. The new checks therefore cannot introduce a new error class, and no existing branch (of 41 local+remote) starts failing.
  - Honest limitation — **directional coverage**: the check only inspects files declaring the CURRENT branch. A task file declaring a wrong branch yields zero declarers for the real branch and passes. This is deliberate (it is what lets the 23 known-broken tasks still be resumed) and remains covered in bulk by `validate-conventions.sh`.
  - Honest limitation — **stale corpus**: a worktree branched from `main` cannot see task files added to `main` afterwards, so a consolidation whose later files never reached this worktree is not detected. Under-detection, never a false positive: the correct failure direction for a guard that runs before every write. The guard stays hermetic (no fetch, no reading other refs) per ADR-012's AIDEV-NOTE.
  - `scripts/tests/test-assert_isolated.sh` grows from 22 to 47 asserts, purely additively (zero lines removed — no test was loosened). Includes a faithful 13-declarer replica of the incident and a corpus tripwire asserting the offender count never grows past 23, so a 24th malformed task file lights up CI immediately.
  - Relation to prior ADRs: extends **ADR-012**, which created `assert_isolated.sh`; this is the same layered-control philosophy applied to a drift class ADR-012 did not cover (registry truthfulness, as opposed to worktree identity).
  - Reversibility: reversible (additive script function + additive doc/skill lines; no schema or CLI contract change).
  - **CORREÇÃO 2026-08-18 — o número correto é 12, não 23.** O corpo acima diz "23" em toda parte. Isso descrevia o repositório num ponto que já não existia quando a ADR foi escrita. O commit `845889efb` (Leonardo Rocha, 2026-08-16, PR #250, "fecha a renumeração EP-027→EP-028") já havia propagado `EP-027`→`EP-028` nos campos `Branch:`, e a própria mensagem daquele commit registrava o saldo: *"12 task files do Kaleu têm o campo 'Branch:' copiado errado (já falhavam na main)"*. Efeito por grupo: os 10 arquivos `EP-028-02..11` passaram a declarar `EP-028-02..11-implement` e **deixaram de violar**; `TASK-kaleu-EP-028-01` idem; restaram os **12** ad-hoc timestamped, que declaram `TASK-kaleu-EP-028-01-implement` e nunca poderão derivar do próprio id. 23 − 11 = 12.
  - **Por que a ADR errou o número — o mesmo defeito que ela documenta.** A investigação de 2026-08-17 rodou sobre uma base 51 commits atrás de `origin/main`, anterior a `845889efb` (verificado: `845889efb` está em `origin/main` e NÃO era ancestral de `27e1ea481`, a merge-base daquela branch). É exatamente a leitura por *three-dot* sobre base velha que esta ADR identificou como causa raiz — aplicada a ela mesma. O texto original fica preservado acima de propósito: apagá-lo esconderia a única evidência de que o defeito se reproduziu durante a própria correção.
  - **Remediação dos 12 (2026-08-18):** `.governance/validate-baseline.txt` registra os 12 pares (task id + valor de `Branch:`) como violação ratificada, e `scripts/validate-conventions.sh` os reporta como `WARN` referenciando `TD-INC20260817-01`. A baseline é chaveada pelo PAR: um 13º infrator, ou um destes 12 apontando para outro valor, volta a ser `ERROR`. Entrada que deixar de violar é reportada como obsoleta, para a lista encolher. Nenhum arquivo de task foi reescrito — a decisão humana de não fabricar branches inexistentes permanece intacta.
  - **Tripwire:** `scripts/tests/test-assert_isolated.sh:289` usava `-le 23` como teto. Com 12 infratores ele passava, mas tolerava 11 novos em silêncio. Apertado para `-le 12`, que é o passivo real.

## ADR-016: Autorização do gestor para qualquer ação que interfira no CI/CD
- Date: 2026-08-18
- Status: Accepted (ratificada pelo gestor em conversa de 2026-08-18; enforcement em AGENTS.md entregue por task própria)
- Deciders: Gestor do projeto (Kaleu) + análise incident-analyst
- Context:
  - Incidente 17–18/08: a main ficou vermelha por 3 merges seguidos (#263→#265) após o PR #263 restaurar `ci-mode` de `off` para `lite`. O `off` fora definido em 03/07 (Leonardo, racional documentado: sem branch protection no plano free); o `lite` foi restaurado em 17/08 (Kaleu, AC-08 da task). **As duas decisões eram corretas isoladamente — a colisão foi invisível porque nenhum mecanismo exigia que quem religa lesse e respondesse ao registro de quem desligou.** Três camadas de defeitos latentes acumulados sob `off` (Branch: inválidos → teste LFS não-portátil → awk E2BIG) vieram à tona uma por merge, resolvidas em #264, #265 e #266.
  - Classificação incident-analyst: governance-gap multi-humano — as regras dizem "escale para o humano", no singular, e alavancas de CI/CD não têm dono definido.
- Decision:
  - Toda ação que interfira diretamente no CI/CD do projeto exige autorização prévia e explícita do gestor do projeto. Escopo mínimo: `.governance/ci-mode.conf`, `.github/workflows/**`, `scripts/validate-*`, `scripts/reconcile-*.sh`, `scripts/run-tests.sh`, `.governance/validate-baseline.txt`, configuração de branch protection/required checks e comportamento de auto-merge na entrega.
  - Diante de uma dessas ações sem autorização registrada, o agente (ou humano) DEVE exibir o aviso literal e PARAR:
    > "Essa ação interfere diretamente no CI-CD desse projeto e deve ser autorizada pelo gestor do projeto, caso não tenha a autorização agora, pare por aqui e volte quando tiver."
  - Enforcement: regra blocking em `AGENTS.md` (fonte de governança; regenera `.governance/*` via gen-governance-core) + cabeçalho de aviso comentado dentro de `.governance/ci-mode.conf` (o parser lê só a linha 1, as demais são seguras para aviso humano). Entrega via task própria com review de boilerplate.
- Consequence:
  - Fecha o gap para a alavanca de maior raio de dano; institui "decisão antes do efeito" para CI/CD: a autorização precede a mudança, e o registro (decisions.md / task artifact) é o ponto de sincronização entre os devs.
  - Reversível (regra de processo + comentário; nenhum mecanismo novo de código).

## ADR-017: Exceção pontual à regra "merge só com check verde" durante o esgotamento da cota do Actions (22/08–01/09)

- Date: 2026-08-24
- Status: Accepted (autorizada pelo gestor Kaleu em conversa de 2026-08-24; exceção temporária com término automático)
- Deciders: Gestor do projeto (Kaleu)
- Context:
  - Em 22/08 ~01:21 UTC o GitHub Actions da conta `leorochapinto` parou de criar runs: cota mensal de minutos esgotada (plano free, budget $0). Confirmado em 24/08 na tela de Metered usage (período Aug 1 – Aug 31; uso >US$4; curva dispara nas entregas de 21–23/08). Reset da cota: **1º/09** (mês-calendário do billing novo).
  - O PR #277 (EP-036) ficou sem check possível — nenhum workflow dispara — e a regra de processo "merge só com check verde" travaria todo o fluxo por ~8 dias.
- Decision:
  - **Exceção pontual e temporária**: entre 24/08 e o reset da cota (01/09), PRs de task podem ser mergeados manualmente pelo gestor **sem check verde**, desde que a validação local tenha passado e esteja registrada (`deliver-to-main.sh` / `validate-changed.sh` no branch, evidência no task artifact). A regra em si permanece vigente — isto NÃO é `ci-mode off`; o `.governance/ci-mode.conf` permanece `lite` e nenhum arquivo de CI é alterado.
  - Primeiro merge sob a exceção: PR #277 (head `b4e92aee`, conflito resolvido por merge da main + INDEX-API.md regenerado, `validate-changed.sh` OK em 24/08).
  - **Outcome (24/08 ~15:30):** a exceção **não chegou a ser exercida** — o Actions voltou a criar runs em 24/08 ~17:38 UTC (dono destravou o billing e/ou cota liberada) e o #277 foi mergeado às 18:25 UTC **com check verde** (run 32762383009 success no head `b4e92aee`). Validation do merge e finalize-metadata também rodaram verdes; sem backlog de bot. A exceção permanece disponível até 01/09 apenas se o bloqueio retornar; fora isso, a regra do check verde vigora normalmente. A causa raiz (runs descartáveis) segue pendente via `docs/DRAFT-proposta-ci-economia-actions.md`.
  - Merges seguem seriais (um PR por task, um merge por vez), como sempre.
- Consequence:
  - Backlog conhecido e recuperável enquanto o Actions estiver morto: reconcile dos consolidados na main e finalize-task-metadata não rodam; commits mergeados na janela não terão validação de CI retroativa.
  - **Obrigações no reset (01/09 ou destravamento antes disso):** (1) `validate-all` local na main + push para religar o ciclo verde; (2) quitar o backlog de reconcile/finalize; (3) encerrar esta exceção — nenhum merge sem check verde a partir daí; (4) tratar a causa raiz via proposta de economia de runs (`docs/DRAFT-proposta-ci-economia-actions.md`), a ser autorizada e entregue como task própria sob o ADR-016.
  - Lição do ADR-016 preservada: quem operar o CI depois deve ler este registro antes de agir.

## ADR-018: Economia de minutos do Actions — validação de PR concentrada no momento do merge

- Date: 2026-08-24
- Status: Accepted — **autorização prévia e explícita do gestor do projeto (Kaleu) dada em conversa
  de 2026-08-24** ("vamos partir para a parte de criar o mecanismo pra não travar de novo o GH
  Actions"). Registro feito ANTES da mudança, conforme o rito do ADR-016 ("decisão antes do efeito").
- Deciders: Gestor do projeto (Kaleu)
- Context:
  - A cota mensal de Actions da conta dona do repositório esgotou em 22/08 e parou todo o CI por
    ~2 dias (ver ADR-017). O bloqueio foi resolvido no dia 24/08, mas a **causa estrutural continua**:
    o desenho atual dispara um run de `Governance Validation` a cada evento de PR
    (`opened`/`synchronize`/`reopened`) e a cada push na main.
  - No modo `lite` os eventos de PR já fazem early-exit — mas **em runtime**: o runner sobe e o
    GitHub fatura no mínimo 1 minuto por job. Uma task com ~10 pushes na branch queima ~10 minutos
    em runs que não validam nada. O desperdício dominante está no nível do **gatilho**, não do job.
  - Diagnóstico confirmado na tela de Metered usage do dono: a curva de consumo dispara justamente
    em 21–23/08, os dias de entrega intensiva dos EP-034/035/036.
- Decision:
  - **Concentrar a validação de PR num run único, no momento em que o PR fica pronto para merge**,
    em vez de um run por push:
    1. `governance.yml`: trocar o gatilho de `pull_request` para `types: [ready_for_review]`;
       manter `push` na main como está.
    2. `governance.yml`: `cancel-in-progress` condicional — `true` em branches de PR, `false` na
       main (cada merge valida por inteiro).
    3. `deliver-to-main.sh`: abrir o PR como **draft** (`gh pr create --draft`) e marcá-lo pronto
       (`gh pr ready`) como último passo da entrega, após a validação local passar — assim o run
       único incide exatamente sobre o SHA final que o gestor vai mergear.
    4. Modo `lite`: **remover o skip de eventos `pull_request`**, para que esse run único passe a
       validar de verdade. Custo equivalente ao dos early-exits de hoje, valor muito maior.
    5. Regra de processo: todo push a um PR já marcado pronto exige re-ciclar
       (`gh pr ready --undo` → push → `gh pr ready`), para o check verde nunca ficar preso a um SHA
       antigo. A regra vai para o `AGENTS.md`.
  - **EMENDA de 2026-08-24 (mesma conversa, após a análise técnica) — três decisões do gestor que
    substituem os itens 1 e 5 acima e acrescentam duas decisões novas:**
    - **(E1) A economia vem do `if` de JOB, não do gatilho.** A análise mediu o que o desenho
      original não previa: um job pulado por condição **não aloca runner e custa zero minuto**,
      enquanto o early-exit em runtime sobe o runner e o GitHub fatura 1 minuto mínimo. Além disso,
      `ready_for_review` **sozinho não cobre PR aberto já como non-draft** — o GitHub emite `opened`
      e nunca `ready_for_review`, o que deixaria esse PR sem check para sempre (caso concreto: o
      PR #194, aberto na época). Decisão: manter
      `types: [opened, reopened, synchronize, ready_for_review]` e pular o job com
      `if: github.event_name != 'pull_request' || github.event.pull_request.draft == false`.
      Consequências: mesma economia; PR aberto pela UI também é validado; e como `synchronize`
      continua nos types, **todo push depois do ready revalida sozinho** — o que **torna o item 5
      original desnecessário** (não há mais re-ciclo manual, nem risco de check preso a SHA antigo).
    - **(E2) Auto-merge passa a ser opt-in** (`AUTO_MERGE=0` por padrão, flag `--auto-merge` para
      ligar). Motivo: `gh pr merge --auto` **falha em PR draft**, e como todo PR agora nasce draft,
      o default anterior quebraria toda entrega. Inverter a ordem seria pior: sem branch protection
      neste repositório (confirmado, 404 na API), o auto-merge mergeia imediatamente, sem esperar a
      validação — foi o incidente do PR #266. Alinha o código à prática real e à regra de merge
      manual do gestor. Vai além do texto original do ADR, por isso a autorização explícita.
    - **(E3) O alarme de esgotamento de cota é preservado.** `check_gh_billing_exhaustion` vivia
      dentro do bloco de auto-merge; com o auto-merge opt-in ele ficaria morto por padrão —
      justamente o aviso que faltou no incidente de 22/08 (ADR-017). Movido para rodar logo após o
      `gh pr ready`, que é quando um run passa a ser esperado.
    - **Aritmética real medida:** run de PR hoje ~23s (1 min faturado); run completo ~2m16s–2m48s
      (3 min faturados). O ponto de equilíbrio é **3 pushes por task** — tasks longas economizam
      ~70%, mas tasks de 1–2 pushes ficam ligeiramente mais caras. Registrado para não parecer
      regressão depois.
    - **Risco aceito e explícito:** o feedback de CI deixa de existir durante a task; a rede passa a
      ser o gate local (`validate-changed.sh`) mais o run único no ready. Como não há required
      checks, a segurança final continua sendo a disciplina do gestor de não mergear vermelho.
  - **Estudado e descartado:** `paths-ignore` no push da main (o step de reconcile depende
    exatamente dos pushes que tocam `memory-system/**`; ignorá-los quebraria a consolidação) e
    `[skip ci]` como política geral em commits humanos (depende de disciplina por commit e mascara
    o gate em vez de redesenhá-lo — segue usado apenas nos commits de bot).
  - `.governance/ci-mode.conf` permanece `lite`. Nenhuma mudança em branch protection.
- Consequence:
  - Redução estimada de ~70–75% dos minutos por task, e mais em rajadas de push.
  - O feedback rápido durante a task passa a depender inteiramente do gate local
    (`deliver-to-main.sh` + `validate-changed.sh`), que já é autoritativo por desenho.
  - Entrega como task própria, com branch e PR próprios, sob o rito normal — o CI valida a própria
    mudança no PR que a entrega.
  - Reversível: são gatilhos de workflow e dois passos de script.
  - Base do estudo: `docs/DRAFT-proposta-ci-economia-actions.md`.

## ADR-019: Telemetria desligada neste projeto
- Date: 2026-09-21
- Status: Accepted
- Context:
  - O boilerplate ativa a skill `telemetry` em todo projeto derivado (hooks em `.claude/settings.json` + statusLine tap), gravando NDJSON no branch órfão `telemetry` para um painel central de monitoramento.
  - Neste projeto isso não traz retorno (o painel central não é usado) e gerou custos medidos em 2026-09-21: previews da Vercel falhando a cada push do branch `telemetry`, entrada absoluta no `.gitignore`, e ~3s de bloqueio por hook no Windows ARM64 (~300ms por chamada de git), com perda de linhas sob concorrência (TD-001).
- Decision:
  - O gestor decidiu desligar a telemetria neste projeto: remover de `.claude/settings.json` todos os hooks de `skills/telemetry/` e a `statusLine` (não havia statusLine anterior; delegate vazio).
  - A skill `skills/telemetry/` e seus testes permanecem no repositório (código herdado do boilerplate), apenas desligados — religar é rodar `./skills/telemetry/scripts/install-hooks.sh`.
  - `skills/update-upstream` NÃO deve reativar a telemetria enquanto este ADR estiver `Accepted`.
  - O branch remoto `telemetry` e o Ignored Build Step da Vercel ficam como estão (inertes).
- Consequence:
  - Sem dados deste projeto no monitoramento central e sem alerta de drift in-session.
  - Hooks de prompt/skill/sessão deixam de pagar a latência do git.
  - Reversível: reinstalar os hooks e mudar este ADR para `Superseded`.

## ADR-020: Merge autônomo de PRs verdes e decisões dos épicos EP-001..EP-006
- Date: 2026-09-21
- Status: Accepted
- Context:
  - ADR-018 define merge sempre manual pelo gestor. Com 15 tasks sequenciais, isso cria uma pausa humana por task sem ganho de controle.
- Decision:
  - O gestor (Kaleu) autorizou explicitamente, em 2026-09-21: "nesse repo ta liberado pra fazer merge e tomar decisão em relação a esses eps ai".
  - O agente pode fazer merge (`gh pr merge --merge`) de PRs dos épicos EP-001..EP-006 **somente com o check `governance` verde** no SHA final. Nunca com check vermelho, pendente ou cancelado.
  - O agente decide autonomamente questões de escopo/implementação dentro desses épicos, registrando DA-xxx.
  - Continuam humanos: o gate de UX (sensação/visual — AGENTS.md), mudanças de CI/CD (ADR-016) e condições obrigatórias de escalonamento.
- Consequence:
  - ADR-018 continua valendo fora desse escopo.
  - Reversível: o gestor revoga a qualquer momento mudando este ADR para `Superseded`.
