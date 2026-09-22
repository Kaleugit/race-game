# EPICO-EP-004-bot-ia-TASKS

## Metadata
- Epic ID: EP-004
- Epic Title: Bot com IA
- Last Updated: 2026-09-21
- Owner: Architect
- Status: APPROVED

## Epic Context
- Objective: Substituir o oponente fantasma de tempo fixo por um bot que dirige uma instância real do carro via inputs simulados.
- Scope Boundaries: controlador de IA, preset de peças do bot, dificuldade lida do estágio, remoção do fantasma, posição do bot exposta para o HUD. Fora: renderização do bot na pista, mini-mapa (EP-006), tuning final por estágio (EP-005).
- Key Dependencies: EP-002 (`createTrack`, `stage.bot.difficulty`, `?stage=<id>`, `teste-plano`), EP-003 (`createCarPhysics`, `step(dt, input)`, auto-desvira, `resolveCarParams`, `TIRES`/`GEARBOXES`, `tests/sim/harness.js`).
- Dono da fiação de `src/main.js` neste épico: **TASK-kaleugit-EP-004-02** (a Task 01 não toca `src/main.js`).

## Approved Task List

### Task 01 - Controlador de IA, preset do bot e calibração no harness
- Task ID: TASK-kaleugit-EP-004-01
- Status: COMPLETED
- Priority: 1
- Execution Mode: Standard
- Domain: Bot (IA de pilotagem)
- Description:
  - Criar `src/bot/prng.js`: `createPrng(seed)` → `() => number` em [0,1) (mulberry32). Proibido `Math.random` em `src/bot/`.
  - Criar `src/bot/bot-driver.js`: `createBotDriver({ track, difficulty, seed })` → `{ decide(carState, dt) → input }`, com `input` no formato `{ up, down, left, right, space, locked: false }`. Regras mínimas: acelera; usa turbo conforme combustível e terreno; no ar, inclina para casar `rot` com a inclinação no ponto de pouso previsto (`track.slopeAt`); erros (atraso de reação, alívio de acelerador, turbo mal usado) com frequência que cai com `difficulty` (0..1), sorteados pelo PRNG.
  - Criar `src/bot/bot-preset.js`: `BOT_DEFAULT_PARTS`; `resolveBotParams(stage)` = `resolveCarParams(BASE_PARAMS, stage.bot.parts ?? BOT_DEFAULT_PARTS)` — nunca recebe a escolha do jogador.
  - `runBotToFinish({ car, driver, track, dt = 1/60, maxTime = 180 })` em `src/bot/bot-driver.js`: avança só o bot até cruzar `track.finishX`; retorna `finishTime` (usado quando o jogador termina antes — ver EP-004-02).
  - Criar `tests/sim/reference-driver.js`: input de referência "acelerar + turbo, correções mínimas" (`up` sempre; `space` enquanto houver combustível; no ar só corrige se `|rot - inclinação| > 0.6 rad`). Reutilizado por EP-005 (CA-009).
- Depends On: TASK-kaleugit-EP-003-03
- Canonical File: memory-system/tasks/TASK-kaleugit-EP-004-01.md
- Suggested Branch: TASK-kaleugit-EP-004-01-implement
- Input Context (max 5 files):
  - docs/EPICO-EP-004-bot-ia-TASKS.md
  - src/physics/car-physics.js
  - src/parts/presets.js
  - src/track/track.js
  - tests/sim/harness.js
- Done Criteria:
  - CA-004 (Mata Atlântica) em `tests/sim/bot.test.js`: 10 corridas com seeds 1..10 — todas `finished: true` em até 180s; todos os tempos dentro de ±15% da mediana; mediana do bot > tempo do `reference-driver` no mesmo estágio.
  - CA-005 (bot): carro dirigido pelo bot iniciado invertido e parado desvira em t ∈ [1,3s; 1,7s].
  - Mesma seed → mesmo tempo de chegada (reprodutibilidade, CDC-106).
  - `resolveBotParams(stage)` retorna o mesmo objeto independentemente de qualquer escolha de garagem (teste com `stage.bot.parts` ausente e presente).
  - `grep -n "Math.random" src/bot/*.js` não retorna nada; `npm run test:sim` verde.
- Escalation Conditions:
  - To human: o bot só terminar com física especial ou rubber-banding (proibido — PROJECT_SPECS §7); tempo de referência do jogador (item pendente em `docs/PREREQUISITES.md`) divergir da percepção do Kaleu no gate de UX.
  - To orchestrator: bot travar/capotar em loop num trecho da Mata Atlântica que só se resolva mudando a pista (EP-005) ou a física (EP-003).

### Task 02 - Bot real no loop do jogo (remove o fantasma)
- Task ID: TASK-kaleugit-EP-004-02
- Status: COMPLETED
- Priority: 1
- Execution Mode: Standard
- Domain: Bot (integração na corrida)
- Description:
  - Em `src/main.js`: remover `updateBot`, `BOT_BASE_SPEED`, `BOT_TURBO_MULT`, `BOT_CYCLE`, `BOT_TURBO_ON` e os campos `botSpeed`/`botTurboActive`/`botTurboCycle` do `state`.
  - Criar no início de cada corrida `botCar = createCarPhysics({ track, params: resolveBotParams(stage) })` e `botDriver = createBotDriver({ track, difficulty: stage.bot.difficulty, seed: raceIndex })`; em `tick`, com a corrida em andamento, `botCar.step(dt, botDriver.decide(botCar.state, dt))`.
  - `state.botScroll` passa a ser `botCar.state.x`; `state.botFinishTime` é gravado ao cruzar `track.finishX`; `#race-bar-bot` e `#bot-dist` leem essa posição. Brilho de turbo do `#race-bar-bot` segue `botCar.state.turboActive`.
  - Se o jogador cruzar a chegada antes do bot: `runBotToFinish(...)` calcula `state.botFinishTime` antes de `showEndScreen`.
  - O bot não tem malha na cena (nenhum `scene.add` para ele).
- Depends On: TASK-kaleugit-EP-004-01
- Canonical File: memory-system/tasks/TASK-kaleugit-EP-004-02.md
- Suggested Branch: TASK-kaleugit-EP-004-02-implement
- Input Context (max 5 files):
  - docs/EPICO-EP-004-bot-ia-TASKS.md
  - src/main.js (`state`, `updateBot`, `tick`, `showEndScreen`, `showDefeatScreen`, `updateHUD`)
  - src/bot/bot-driver.js
  - src/bot/bot-preset.js
  - tests/e2e/smoke.spec.js
- Done Criteria:
  - `grep -nE "BOT_FINISH_TIME|BOT_BASE_SPEED|BOT_CYCLE|function updateBot" src/main.js` não retorna nada; `grep -n "botCar.step" src/main.js` mostra a chamada dentro de `tick`.
  - Novo `tests/e2e/bot.spec.js`: `/?stage=teste-plano`, clica `#lobby-play`, não pressiona nada; `#end-overlay` fica visível com `#end-result` = `DERROTA` e `#end-bot-time` numérico em até 60s; sem `pageerror`/`console.error`.
  - `npm test` (smoke + stage-data + bot) e `npm run test:sim` verdes.
  - Gate de UX humano: Kaleu joga a Mata Atlântica e confirma que o bot na barra de corrida é plausível e vencível.
- Escalation Conditions:
  - To human: queda de performance perceptível com a segunda instância de física (sem alvo numérico — DA-004 do PROJECT_SPECS).
  - To orchestrator: necessidade de editar `index.html` ou `src/physics/*`.

## Planning Notes
- Default policy: create `planning/report` on demand as tasks move to execution.
- Each task must be self-contained: the canonical task file + listed input context must be sufficient for execution without implicit knowledge from prior tasks.
- Ordem: 01 → 02.

## Decisoes Autonomas
- DA-001: Aleatoriedade do bot por PRNG semeado (mulberry32) — Criterio: CDC-106 — Racional: erros do bot variam entre corridas sem `Math.random`, e a calibração no harness fica reproduzível por seed.
- DA-002: Tempo do bot quando o jogador vence é obtido simulando o bot até a chegada (`runBotToFinish`) — Criterio: RF-006 + CDC-002 — Racional: a física é independente do DOM, então simular o restante é barato e dá o tempo real do bot para a diferença com sinal; alternativa rejeitada: mostrar "—" (quebraria CA-006).
- DA-003: `reference-driver` vive em `tests/sim/`, não é o bot com dificuldade máxima — Criterio: CA-004/CA-009 — Racional: o CA descreve um input de referência simples ("acelerar + turbo, correções mínimas"); acoplá-lo à IA tornaria "bot mais lento que a referência" trivial.
- DA-004: A barra de corrida existente (`#race-bar`) é o canal de posição do bot neste épico — Criterio: DA-004 (EPICOS) — Racional: o EP-004 só expõe a posição; o mini-mapa é decisão do EP-006.
- DA-005: Seed do bot = contador de corridas da sessão — Criterio: CDC-002 + CDC-106 — Racional: varia entre revanches sem relógio como fonte de aleatoriedade.
