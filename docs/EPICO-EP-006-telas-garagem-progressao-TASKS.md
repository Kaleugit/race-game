# EPICO-EP-006-telas-garagem-progressao-TASKS

## Metadata
- Epic ID: EP-006
- Epic Title: Telas, garagem e progressão
- Last Updated: 2026-09-21
- Owner: Architect
- Status: APPROVED

## Epic Context
- Objective: Entregar o fluxo completo Lobby → Garagem → Mapa → Contagem → Corrida → Resultado com garagem, desbloqueio e persistência local.
- Scope Boundaries: persistência em `localStorage`, visual de cor/pneu do carro, telas (garagem, mapa, resultado), fluxo e mini-mapa, e2e dos CAs de interface. Fora: economia/moeda/XP/contas; física das peças (EP-003); conteúdo (EP-005).
- Key Dependencies: EP-002 (`listStages`, `getStage`, `setStage(id)` + `dispose()`), EP-003 (`TIRES`, `GEARBOXES`, `DEFAULT_PARTS`, `resolveCarParams`), EP-004 (`state.botFinishTime` sempre preenchido via `runBotToFinish`, `botCar.state.x`), EP-005 (Mata Atlântica e Cerrado reais, `order` 1 e 2).
- Dono da fiação de `src/main.js` e `src/lobby.js` neste épico: **TASK-kaleugit-EP-006-04**. Dono de `index.html`: **TASK-kaleugit-EP-006-03**. Dono de `src/car.js`: **TASK-kaleugit-EP-006-02**.

## Approved Task List

### Task 01 - Perfil local: garagem e progresso em `localStorage`
- Task ID: TASK-kaleugit-EP-006-01
- Status: COMPLETED
- Priority: 1
- Execution Mode: Standard
- Domain: Persistência (perfil local)
- Description:
  - Criar `src/parts/colors.js`: `CAR_COLORS` = 10 cores fixas `{ id, label, hex }` (rótulos PT-BR); `DEFAULT_COLOR` = cor atual do Bandeirante.
  - Criar `src/profile/profile.js` (sem DOM além do `storage` injetado): `createProfile(storage = localStorage, stages)` → `{ getGarage(), saveGarage({ color, tire, gearbox }), getUnlocked(), isUnlocked(id), recordWin(stageId, time) }`.
  - Chave `race_profile_v1` = JSON `{ version: 1, garage: { color, tire, gearbox, upgrades: {} }, progress: { unlocked: ['mata-atlantica'], best: {} } }`; `upgrades` reservado para motor/turbo/chassi.
  - `recordWin(stageId)` desbloqueia o próximo estágio por `order` de `listStages()`; valores inválidos (JSON corrompido, id de peça/cor desconhecido) caem nos defaults sem lançar erro.
  - `race_best_time` existente não é apagado nem reescrito; na primeira leitura é copiado para `progress.best['mata-atlantica']` se este estiver vazio.
- Depends On: TASK-kaleugit-EP-005-02
- Canonical File: memory-system/tasks/TASK-kaleugit-EP-006-01.md
- Suggested Branch: TASK-kaleugit-EP-006-01-implement
- Input Context (max 5 files):
  - docs/EPICO-EP-006-telas-garagem-progressao-TASKS.md
  - src/parts/presets.js
  - src/stages/registry.js
  - src/main.js (só `showEndScreen`: uso atual de `race_best_time`)
- Done Criteria:
  - `tests/sim/profile.test.js` (storage em memória) passa: storage vazio → só `mata-atlantica` desbloqueado e garagem = `DEFAULT_COLOR` + `DEFAULT_PARTS`; `recordWin('mata-atlantica')` → `isUnlocked('cerrado') === true` após recriar o perfil sobre o mesmo storage; JSON corrompido → defaults; `race_best_time` preservado byte a byte.
  - `CAR_COLORS.length === 10`.
  - `npm run test:sim` verde.
- Escalation Conditions:
  - To human: estrutura exigir migração destrutiva de `race_best_time` (gatilho do épico).
  - To orchestrator: necessidade de editar `src/main.js` nesta task.

### Task 02 - Visual do carro: cor e pneus
- Task ID: TASK-kaleugit-EP-006-02
- Status: COMPLETED
- Priority: 2
- Execution Mode: Quick
- Domain: Carro (visual)
- Description:
  - Em `src/car.js`: `export function applyCarLook(carBuilt, { color, tire })` — `color` (hex de `CAR_COLORS`) aplica na(s) material(is) da carroceria; `tire` (`estrada`|`misto`|`offroad`) troca o aspecto do pneu (ex.: parâmetro de banda de rodagem em `makeTireSideTexture`), mantendo low-poly flat-shaded (CDC-101).
  - `makeCar()` sem argumentos continua idêntico ao atual (`misto` + `DEFAULT_COLOR`).
- Depends On: TASK-kaleugit-EP-006-01
- Canonical File: memory-system/tasks/TASK-kaleugit-EP-006-02.md
- Suggested Branch: TASK-kaleugit-EP-006-02-implement
- Input Context (max 5 files):
  - docs/EPICO-EP-006-telas-garagem-progressao-TASKS.md
  - src/car.js
  - src/parts/colors.js
- Done Criteria:
  - `grep -n "export function applyCarLook" src/car.js` retorna 1 linha; só `src/car.js` alterado em `src/`.
  - `npm run build` e `npm test` verdes.
  - Gate de UX humano: Kaleu aprova as 10 cores e os 3 pneus no visual do Bandeirante.
- Escalation Conditions:
  - To human: pneu visual distinto exigir geometria nova que fuja do estilo low-poly.
  - To orchestrator: mudança fora de `src/car.js`.

### Task 03 - Telas: garagem, mapa de estágios e resultado
- Task ID: TASK-kaleugit-EP-006-03
- Status: COMPLETED
- Priority: 1
- Execution Mode: Standard
- Domain: Interface (telas)
- Description:
  - Em `index.html`: overlays `#garage-overlay` (swatches `[data-color-id]`, botões `[data-tire]`, `[data-gearbox]` com rótulo do trade-off, `#garage-confirm`) e `#map-overlay` (itens `[data-stage-id]` com `data-locked="true|false"`); no `#end-overlay`: `#end-delta`, botões `#end-play-again` (rótulo REVANCHE, id mantido), `#end-map`, `#end-garage`; remover `#end-lobby-btn`. Estilo HUD monospace atual, textos PT-BR, cabe em mobile landscape.
  - Criar `src/ui/format.js`: `formatTime(s)` → `"63.42s"`; `formatDelta(player, bot)` → `"+1.34s"`/`"-0.80s"` (`player − bot`, sinal sempre, 2 casas).
  - Criar `src/ui/garage.js`: `showGarage({ selection, colors, tires, gearboxes, onChange, onConfirm })`, `hideGarage()`.
  - Criar `src/ui/stage-map.js`: `showStageMap({ stages, isUnlocked, onSelect })`, `hideStageMap()`; estágio bloqueado não dispara `onSelect`.
  - Criar `src/ui/result.js`: `showResult({ won, playerTime, botTime, bestTime, onRematch, onMap, onGarage })`; tempos com 2 casas e atributo `data-seconds` com o valor bruto em `#end-player-time`, `#end-bot-time`.
  - Módulos de UI não importam `src/main.js`, física nem perfil: recebem dados e callbacks.
- Depends On: TASK-kaleugit-EP-006-01
- Canonical File: memory-system/tasks/TASK-kaleugit-EP-006-03.md
- Suggested Branch: TASK-kaleugit-EP-006-03-implement
- Input Context (max 5 files):
  - docs/EPICO-EP-006-telas-garagem-progressao-TASKS.md
  - index.html
  - src/parts/colors.js
  - src/parts/presets.js
- Done Criteria:
  - `tests/sim/format.test.js` passa: `formatDelta(10, 8.66) === '+1.34s'`, `formatDelta(8, 8.8) === '-0.80s'`, `formatDelta(5, 5) === '+0.00s'` (CA-006, parte unitária).
  - `grep -nE "from '\.\./main|physics|profile" src/ui/*.js` não retorna nada.
  - `npm run build` verde.
  - Gate de UX humano: Kaleu aprova layout das três telas em desktop e mobile landscape com os controles touch.
- Escalation Conditions:
  - To human: layout não couber em mobile landscape com os controles touch atuais (gatilho do épico).
  - To orchestrator: necessidade de editar `src/main.js` ou `src/lobby.js` nesta task.

### Task 04 - Fluxo completo, mini-mapa e fiação no `src/main.js`/`src/lobby.js`
- Task ID: TASK-kaleugit-EP-006-04
- Status: COMPLETED
- Priority: 1
- Execution Mode: Standard
- Domain: Interface (fluxo e integração)
- Description:
  - `src/lobby.js`: `#lobby-play` → `showGarage` (preview no carro do lobby via `applyCarLook`) → `#garage-confirm` → `profile.saveGarage` → `showStageMap` → `onSelect(id)` → `setStage(id)` + `startCountdown()`.
  - `src/main.js`: carro do jogador com `resolveCarParams(BASE_PARAMS, profile.getGarage())` e `applyCarLook` a cada início de corrida; ao cruzar a chegada chama `showResult` com `botTime = state.botFinishTime`; vitória → `profile.recordWin(stageId, time)`; Revanche = mesmo estágio; Mapa/Garagem reabrem as telas sem `location.reload()`.
  - Bot terminando antes do jogador: mostra aviso de derrota no HUD (não o resultado) e o resultado abre quando o jogador cruzar a chegada.
  - Mini-mapa: `#race-bar` recebe o nome do estágio e continua mostrando jogador e bot (`botCar.state.x / track.finishX`); o bot não aparece na pista.
  - `?stage=<id>` continua como atalho de teste: `#lobby-play` vai direto à contagem nesse estágio (mantém `stage-data`, `bot`, `cerrado` e `smoke` e2e válidos).
  - Remover a leitura/escrita direta de `race_best_time` de `src/main.js` (passa pelo perfil).
- Depends On: TASK-kaleugit-EP-006-02, TASK-kaleugit-EP-006-03
- Canonical File: memory-system/tasks/TASK-kaleugit-EP-006-04.md
- Suggested Branch: TASK-kaleugit-EP-006-04-implement
- Input Context (max 5 files):
  - docs/EPICO-EP-006-telas-garagem-progressao-TASKS.md
  - src/main.js
  - src/lobby.js
  - src/profile/profile.js
  - src/ui/result.js
- Done Criteria:
  - `grep -nE "showGarage|showStageMap" src/lobby.js` e `grep -nE "showResult|recordWin|getGarage" src/main.js` mostram as chamadas reais no fluxo; `grep -n "location.reload\|race_best_time" src/main.js` não retorna nada.
  - `npm test` verde com todas as specs existentes (ajustar esperas das specs para o novo momento do resultado, segurando `ArrowUp`+`Space`).
  - `npm run test:sim` verde.
  - Gate de UX humano: Kaleu percorre o fluxo completo em desktop e mobile landscape.
- Escalation Conditions:
  - To human: fluxo exigir texto ou tela não previstos em RF-001.
  - To orchestrator: necessidade de editar `index.html` (dono: EP-006-03) ou `src/physics/*`; mais de 6 arquivos alterados.

### Task 05 - e2e dos critérios de interface (CA-001, CA-002, CA-006, CA-007)
- Task ID: TASK-kaleugit-EP-006-05
- Status: PENDING
- Priority: 2
- Execution Mode: Standard
- Domain: Testes (e2e de fluxo)
- Description:
  - `tests/e2e/flow.spec.js` (CA-001): Lobby → Garagem → Mapa → contagem → corrida → Resultado → Revanche; repetir saindo por Mapa e por Garagem; falha em `pageerror`/`console.error`.
  - `tests/e2e/progress.spec.js` (CA-002): storage limpo → só `[data-stage-id="mata-atlantica"][data-locked="false"]`; vence a Mata Atlântica segurando `ArrowUp`+`Space`; `page.reload()` → `cerrado` com `data-locked="false"`.
  - `tests/e2e/result.spec.js` (CA-006): após uma corrida, `#end-delta` === `formatDelta(data-seconds jogador, data-seconds bot)` e casa `^[+-]\d+\.\d{2}s$`.
  - `tests/e2e/garage.spec.js` (CA-007): escolhe cor/pneu/câmbio não-default, recarrega, garagem reabre com a mesma seleção. A parte "bot não herda" é coberta por `tests/sim/bot.test.js` (`resolveBotParams`).
  - Nenhuma mudança em `src/`.
- Depends On: TASK-kaleugit-EP-006-04
- Canonical File: memory-system/tasks/TASK-kaleugit-EP-006-05.md
- Suggested Branch: TASK-kaleugit-EP-006-05-implement
- Input Context (max 5 files):
  - docs/EPICO-EP-006-telas-garagem-progressao-TASKS.md
  - index.html
  - src/ui/format.js
  - tests/e2e/smoke.spec.js
- Done Criteria:
  - `npm test` sai com código 0 com `flow`, `progress`, `result` e `garage` passando (CA-001, CA-002, CA-006, CA-007).
  - `git diff --name-only main...HEAD` não contém arquivos em `src/` nem `index.html`.
- Escalation Conditions:
  - To human: nenhuma prevista.
  - To orchestrator: `progress.spec.js` instável porque o input `ArrowUp`+`Space` não vence o bot de forma consistente (reabrir calibração EP-005-01); qualquer CA exigir mudança em `src/`.

## Planning Notes
- Default policy: create `planning/report` on demand as tasks move to execution.
- Each task must be self-contained: the canonical task file + listed input context must be sufficient for execution without implicit knowledge from prior tasks.
- Ordem: 01 → (02 ∥ 03) → 04 → 05. 02 e 03 são disjuntas (`src/car.js` vs. `index.html` + `src/ui/*`).

## Decisoes Autonomas
- DA-001: Perfil versionado em chave nova `race_profile_v1`, sem tocar `race_best_time` — Criterio: PROJECT_SPECS §7 + CDC-006 — Racional: evita migração destrutiva; `version` e `upgrades` deixam espaço para motor/turbo/chassi.
- DA-002: O mini-mapa é a `#race-bar` existente (jogador + bot + nome do estágio) — Criterio: CDC-002 + CDC-105 — Racional: a barra já mostra a posição relativa dos dois; um perfil de relevo renderizado não é exigido por nenhum CA e custa render em Android de entrada.
- DA-003: O resultado abre quando o jogador cruza a chegada; derrota antecipada vira aviso no HUD — Criterio: RF-006/CA-006 — Racional: a diferença com sinal só existe com os dois tempos; o tempo do bot já está sempre disponível (DA-002 do EP-004).
- DA-004: `?stage=<id>` preservado como atalho de teste que pula garagem/mapa — Criterio: DA-005 (EP-002) + CDC-005 — Racional: mantém as specs e2e anteriores válidas sem reescrevê-las.
- DA-005: e2e separado da integração (Task 05) — Criterio: um domínio por task — Racional: a 04 prova a fiação por grep + specs existentes; a 05 cobre os CAs de interface sem editar `src/`.
- DA-006: UI por módulos que recebem dados e callbacks, fiados só na Task 04 — Criterio: regra de dono da fiação (gen-tasks) — Racional: evita tela "pronta" e nunca chamada; um único dono para `src/main.js`/`src/lobby.js`.
- DA-007: Task 02 em modo Quick — Criterio: `mode-selection-rules.md` — Racional: 1 arquivo, só visual, sem contrato novo.
- DA-008: "Bot não herda escolhas" (CA-007) verificado por teste de unidade em vez de e2e — Criterio: CDC-001 — Racional: o bot não tem representação visual na pista; expor seus parâmetros no DOM só para o e2e seria gancho de produção desnecessário.
