# EPICO-EP-005-conteudo-estagios-TASKS

## Metadata
- Epic ID: EP-005
- Epic Title: Conteúdo de estágios: Mata Atlântica e Cerrado
- Last Updated: 2026-09-21
- Owner: Architect
- Status: APPROVED

## Epic Context
- Objective: Entregar os dois estágios do ciclo com hazards posicionados à mão, corridas de 60–90s e dificuldade do bot calibrada.
- Scope Boundaries: só dados de estágio (`src/stages/*.stage.js`) e testes. Fora: formato de dados/motor (EP-002), novos tipos de superfície/física (EP-003), biomas extras.
- Key Dependencies: EP-002 (contrato de estágio, `SURFACE_TYPES = dirt|mud|sand`, `?stage=<id>`), EP-003 (`tests/sim/harness.js`, presets `TIRES`), EP-004 (`createBotDriver`, `tests/sim/reference-driver.js`, `tests/sim/bot.test.js`).
- Dono da fiação de `src/main.js` neste épico: **nenhuma task** — o épico é só de dados; editar `src/main.js`, `src/track/*`, `src/physics/*` ou `src/bot/*` é gatilho de escalonamento (reforça CA-003).

## Approved Task List

### Task 01 - Mata Atlântica polida (60–90s, hazards à mão) + teste de duração
- Task ID: TASK-kaleugit-EP-005-01
- Status: PENDING
- Priority: 1
- Execution Mode: Standard
- Domain: Conteúdo (level design — Mata Atlântica)
- Description:
  - Editar apenas `src/stages/mata-atlantica.stage.js`: estender `track.finishX`, `slopes` e `features` para que o `reference-driver` termine em 60–90s; posicionar à mão zonas `mud` em `surfaces.zones` (RF-010); ajustar `bot.difficulty`.
  - Criar `tests/sim/stage-duration.test.js` genérico: para todo estágio de `listStages()` (exclui `hidden`), tempo do `reference-driver` com `DEFAULT_PARTS` ∈ [60s, 90s] (CA-009).
  - Estender `tests/sim/bot.test.js` para iterar todos os estágios de `listStages()` (CA-004 por estágio), mantendo N=10, ±15% da mediana e mediana > tempo de referência.
  - Ajustar `tests/e2e/smoke.spec.js`: timeout de espera de `#end-overlay` de 60s para 150s (corrida agora dura 60–90s).
- Depends On: TASK-kaleugit-EP-004-02
- Canonical File: memory-system/tasks/TASK-kaleugit-EP-005-01.md
- Suggested Branch: TASK-kaleugit-EP-005-01-implement
- Input Context (max 5 files):
  - docs/EPICO-EP-005-conteudo-estagios-TASKS.md
  - src/stages/mata-atlantica.stage.js
  - tests/sim/harness.js
  - tests/sim/reference-driver.js
  - tests/sim/bot.test.js
- Done Criteria:
  - CA-009 (Mata Atlântica): `stage-duration.test.js` passa.
  - CA-004 (Mata Atlântica): `bot.test.js` passa.
  - `git diff --name-only main...HEAD` não contém arquivos em `src/` além de `src/stages/mata-atlantica.stage.js`.
  - `npm run test:sim` e `npm test` verdes.
  - Gate de UX humano: Kaleu joga e aprova posicionamento dos hazards, ritmo e dificuldade do bot; o tempo de referência medido é registrado em `docs/PREREQUISITES.md` para validação do Kaleu.
- Escalation Conditions:
  - To human: atingir 60–90s exigir mudança no motor ou na física (gatilho do épico); o tempo de referência não bater com a percepção do Kaleu.
  - To orchestrator: CA-004 falhar por comportamento do bot (reabrir EP-004-01) e não por dados do estágio.

### Task 02 - Estágio Cerrado (areia/terra vermelha, bot mais difícil)
- Task ID: TASK-kaleugit-EP-005-02
- Status: PENDING
- Priority: 1
- Execution Mode: Standard
- Domain: Conteúdo (level design — Cerrado)
- Description:
  - Criar apenas `src/stages/cerrado.stage.js`: `id: 'cerrado'`, `name: 'Cerrado'`, `order: 2`, `visuals.background: '/img/cerrado.jpg'`, paleta de terra vermelha, relevo distinto da Mata Atlântica, zonas `sand` à mão (RF-011), `bot.difficulty` maior que a da Mata Atlântica.
  - Criar `tests/sim/cerrado.test.js`: (a) CA-008 no Cerrado real — com `up` constante, `offroad` percorre o trecho de areia mais rápido que `estrada`; (b) "um pouco mais difícil": `medianaBot / tempoReferência` no Cerrado < mesma razão na Mata Atlântica.
  - Criar `tests/e2e/cerrado.spec.js`: `/?stage=cerrado`, clica `#lobby-play`, segura `ArrowUp`; `#end-overlay` visível em até 150s sem `pageerror`/`console.error`.
- Depends On: TASK-kaleugit-EP-005-01
- Canonical File: memory-system/tasks/TASK-kaleugit-EP-005-02.md
- Suggested Branch: TASK-kaleugit-EP-005-02-implement
- Input Context (max 5 files):
  - docs/EPICO-EP-005-conteudo-estagios-TASKS.md
  - src/stages/mata-atlantica.stage.js
  - src/parts/presets.js
  - tests/sim/stage-duration.test.js
  - tests/sim/bot.test.js
- Done Criteria:
  - CA-009 (Cerrado) e CA-004 (Cerrado) passam automaticamente pelos testes genéricos da Task 01.
  - `tests/sim/cerrado.test.js` passa (CA-008 no Cerrado + dificuldade relativa).
  - CA-003 reverificado: `git diff --name-only main...HEAD` lista em `src/` apenas `src/stages/cerrado.stage.js`.
  - `npm run test:sim` e `npm test` verdes.
  - Gate de UX humano: Kaleu aprova visual (fundo, paleta, areia), dificuldade e performance no Cerrado.
- Escalation Conditions:
  - To human: performance cair de forma perceptível no Cerrado (sem alvo numérico — DA-004 do PROJECT_SPECS); areia exigir comportamento físico além de `grip`/`surfaceDrag`.
  - To orchestrator: necessidade de editar qualquer arquivo de `src/` além do novo estágio.

## Planning Notes
- Default policy: create `planning/report` on demand as tasks move to execution.
- Each task must be self-contained: the canonical task file + listed input context must be sufficient for execution without implicit knowledge from prior tasks.
- Ordem: 01 → 02 (a 02 reutiliza os testes genéricos criados na 01).

## Decisoes Autonomas
- DA-001: Testes de duração e de bot são genéricos sobre `listStages()` — Criterio: CDC-104 — Racional: qualquer estágio novo passa a ser coberto por CA-004/CA-009 sem teste novo, reforçando "dados antes de código".
- DA-002: Nenhuma task deste épico edita `src/main.js` ou módulos do motor — Criterio: CA-003 + escopo do épico — Racional: conteúdo é só dados; precisar do motor indica falha do EP-002/EP-003 e deve ser escalado, não contornado.
- DA-003: "Cerrado um pouco mais difícil" medido pela razão `medianaBot / tempoReferência` — Criterio: CDC-001 — Racional: comparar tempos absolutos entre estágios de extensões diferentes não mede dificuldade; a razão torna o requisito PASS/FAIL.
- DA-004: Timeout do smoke e2e sobe para 150s — Criterio: CA-009 — Racional: corrida de 60–90s com input simples no e2e (`ArrowUp` só) pode passar de 90s; 150s dá margem sem mascarar travamento.
- DA-005: Sem task dedicada de performance — Criterio: DA-004 do PROJECT_SPECS — Racional: não há alvo numérico nem dispositivo de referência; performance fica como gate de UX humano e gatilho de escalonamento.
