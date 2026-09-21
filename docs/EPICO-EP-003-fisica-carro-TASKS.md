# EPICO-EP-003-fisica-carro-TASKS

## Metadata
- Epic ID: EP-003
- Epic Title: Carro com física configurável
- Last Updated: 2026-09-21
- Owner: Architect
- Status: APPROVED

## Epic Context
- Objective: Transformar a física do carro numa instância independente e parametrizável por pneus e câmbio, com interação por superfície e auto-desvira.
- Scope Boundaries: módulo de física por instância, harness de simulação, auto-desvira (RF-005), presets de pneu/câmbio e aderência por superfície (RF-008, RF-009). Fora: garagem/persistência (EP-006), IA do bot (EP-004), determinismo/lockstep (DA-005 do PROJECT_SPECS).
- Key Dependencies: EP-002 (`src/track/track.js`: `createTrack`, `heightAt`, `slopeAt`, `surfaceAt`, `SURFACE_TYPES`; `tests/sim/load-stages.js`; `npm run test:sim`).
- Dono da fiação de `src/main.js` neste épico: **TASK-kaleugit-EP-003-01** (extração e loop). EP-003-02 e EP-003-03 editam `src/main.js` só em pontos delimitados e estritamente em sequência (01 → 02 → 03).

## Contrato do módulo de física (referência para todas as tasks)
```js
// src/physics/car-physics.js — sem DOM, sem three, sem Math.random
createCarPhysics({ track, params }) → {
  state,               // { x, speed, y, vy, rot, angVel, airborne, airTime, lean, slopeRotVisual,
                       //   suspY, suspVy, fuel, turboActive, bounceLevel, finished, ... }
  step(dt, input),     // input: { up, down, left, right, space, locked }
  reset(),
}
// step retorna eventos do frame: { chassisContact, landed, righted }
```
- `input` tem o mesmo formato de `keys` em `src/main.js` + `locked` (contagem/crash). O bot (EP-004) produz o mesmo formato.

## Approved Task List

### Task 01 - Extrair física por instância + harness de simulação
- Task ID: TASK-kaleugit-EP-003-01
- Status: COMPLETED
- Priority: 1
- Execution Mode: Critical
- Domain: Carro (física)
- Description:
  - Criar `src/physics/params.js`: `BASE_PARAMS` com as constantes atuais de `src/main.js` (`maxSpeedNormal`, `maxSpeedTurbo`, `maxSpeedTurboOnly`, `accelNormal`, `accelTurbo`, `accelTurboOnly`, `brake`, `reverseAccel`, `maxReverse`, `drag`, `GRAVITY`, `TURBO_DEPLETE`, `TURBO_RECHARGE`, `GROUND_LEAN`, `AIR_TORQUE`, `BOUNCE_*`, `SUSP_K`, `SUSP_DAMP`, `CAR_HALF_HEIGHT`) e `CHASSIS_HITBOX`/`SUSP_*` movidos de `src/car.js` (que passa a reexportá-los para manter os imports atuais).
  - Criar `src/physics/car-physics.js` com o contrato acima, portando `updateTurbo` (sem efeitos visuais), `updateSpeed`, `updatePhysics`, `checkChassisHitbox`, `updateRotation`, `updateSuspension` na mesma ordem e com a mesma matemática. `carPivot.rotation.z` vira `state.rot`; `bodyGroup.position.y` vira `state.suspY`; `trackHeight` vira `track.heightAt`.
  - Em `src/main.js`: `playerCar = createCarPhysics({ track, params: BASE_PARAMS })`; `tick` chama `playerCar.step(dt, { ...keys, locked })` e só renderiza a partir de `playerCar.state` (rotação, suspensão, molas, rodas, chama, farol, fumaça, som, câmera, HUD). Fluxo de crash atual (`triggerCrash`/`finalizeCrash`/reset) é mantido, disparado por `chassisContact`.
  - Criar `tests/sim/harness.js`: `runRace({ stage, params, driver, dt = 1/60, maxTime = 180 })` → `{ finished, finishTime, maxSpeed, samples }`, onde `driver(state, t) → input`.
- Depends On: TASK-kaleugit-EP-002-03
- Canonical File: memory-system/tasks/TASK-kaleugit-EP-003-01.md
- Suggested Branch: TASK-kaleugit-EP-003-01-implement
- Input Context (max 5 files):
  - docs/EPICO-EP-003-fisica-carro-TASKS.md (seção "Contrato do módulo de física")
  - src/main.js (linhas 479-545 estado/constantes; 727-960 física; 1027-1110 `tick`)
  - src/car.js (linhas 1-20: constantes de suspensão e `CHASSIS_HITBOX`)
  - src/track/track.js
  - tests/sim/load-stages.js
- Done Criteria:
  - `grep -nE "document|window|from 'three'|Math\.random" src/physics/*.js` não retorna nada.
  - `grep -nE "function (updateSpeed|updatePhysics|updateRotation|updateSuspension|checkChassisHitbox)" src/main.js` não retorna nada; `grep -n "playerCar.step" src/main.js` mostra a chamada dentro de `tick`.
  - `npm run test:sim` verde com: (a) `up` constante em `teste-plano` estabiliza em `maxSpeedNormal` ±2%; (b) `up+space` com turbo infinito estabiliza em `maxSpeedTurbo` ±2%; (c) `up` constante termina `mata-atlantica` (`finished: true`); (d) duas instâncias com inputs diferentes no mesmo loop não interferem (estado de uma idêntico ao de uma execução isolada).
  - `npm test` verde.
  - Gate de UX humano (não é PASS do agente): Kaleu confirma sensação de direção, pulo, pouso, suspensão e crash idênticos ao protótipo.
- Escalation Conditions:
  - To human: alguma divergência perceptível de sensação que não se resolva mantendo a matemática original.
  - To orchestrator: a extração exigir mudar valores de física; `src/car.js` precisar de mudança além de reexportar constantes; mais de 6 arquivos alterados.

### Task 02 - Auto-desvira (RF-005) no lugar do reset por crash
- Task ID: TASK-kaleugit-EP-003-02
- Status: COMPLETED
- Priority: 1
- Execution Mode: Standard
- Domain: Carro (física — recuperação)
- Description:
  - Em `src/physics/car-physics.js`: `state.upsideDownTime` acumula enquanto `cos(state.rot - slopeAt(x)) < 0` e o carro está em contato com o chão (rodas ou chassi); ao atingir `params.autoRightDelay` (= 1,5 em `BASE_PARAMS`) o carro volta a `rot = atan(slopeAt(x))`, `angVel = 0`, `y` no chão, `speed = 0`, mantendo `x`; `step` retorna `righted: true` nesse frame.
  - Contato do chassi com o chão deixa de encerrar a física: o carro repousa sobre o chassi (clamp vertical pelos pontos de `CHASSIS_HITBOX`) com atrito de chassi `params.chassisFriction`.
  - Em `src/main.js`: remover `triggerCrash`, `finalizeCrash`, `CRASH_AUTO_RESET`, `CRASH_SETTLE_DURATION` e o reset da corrida por crash; `#crashfade`/`#crashtitle`/`#crashprompt` deixam de ser acionados. Não existe DNF por capotagem.
- Depends On: TASK-kaleugit-EP-003-01
- Canonical File: memory-system/tasks/TASK-kaleugit-EP-003-02.md
- Suggested Branch: TASK-kaleugit-EP-003-02-implement
- Input Context (max 5 files):
  - docs/EPICO-EP-003-fisica-carro-TASKS.md
  - src/physics/car-physics.js
  - src/physics/params.js
  - src/main.js (crash: `triggerCrash`, `finalizeCrash`, ramos `state.crashed`/`state.crashSettling` em `tick`)
  - tests/sim/harness.js
- Done Criteria:
  - CA-005: teste em `tests/sim/` com o carro iniciado em `rot = Math.PI`, `speed = 0`, no chão de `teste-plano`, sem input: `righted` ocorre em t ∈ [1,3s; 1,7s] e depois `cos(rot) > 0.9`.
  - Teste de sequência: capotar durante `up` constante em `mata-atlantica` nunca reinicia `x` para 0 e a corrida termina (`finished: true`).
  - `grep -nE "triggerCrash|finalizeCrash|CRASH_AUTO_RESET" src/main.js` não retorna nada.
  - `npm run test:sim` e `npm test` verdes.
  - Gate de UX humano: Kaleu valida o momento/efeito visual do desvira.
- Escalation Conditions:
  - To human: se "de cabeça para baixo" precisar de definição diferente de `cos(rot - inclinação) < 0` (ex.: capotagem de lado).
  - To orchestrator: repouso sobre o chassi causar instabilidade numérica (tremor/atravessar o chão) não resolvível dentro do módulo.

### Task 03 - Presets de pneus/câmbio e aderência por superfície
- Task ID: TASK-kaleugit-EP-003-03
- Status: PENDING
- Priority: 2
- Execution Mode: Standard
- Domain: Carro (peças e aderência)
- Description:
  - Criar `src/parts/presets.js`: `TIRES = { estrada, misto, offroad }` com `{ label, topSpeedMult, grip: { dirt, mud, sand } }`; `GEARBOXES = { curta, padrao, longa }` com `{ label, accelMult, topSpeedMult }`; `DEFAULT_PARTS = { tire: 'misto', gearbox: 'padrao' }`; `resolveCarParams(base, { tire, gearbox, upgrades = [] })` → params (upgrades = lista de multiplicadores, espaço para motor/turbo/chassi).
  - `misto` + `padrao` são identidade (todos os multiplicadores = 1 e `grip.dirt = 1`), preservando a sensação atual.
  - Valores iniciais sugeridos (calibrar pelo harness): Estrada `topSpeedMult 1.05, grip {dirt 1.0, mud 0.6, sand 0.55}`; Off-road `topSpeedMult 0.94, grip {dirt 0.95, mud 0.95, sand 1.0}`; Curta `accelMult 1.15, topSpeedMult 0.93`; Longa `accelMult 0.88, topSpeedMult 1.06`.
  - Em `src/physics/car-physics.js`: aceleração efetiva = `accel * accelMult * grip[track.surfaceAt(x)]`; `params.surfaceDrag = { dirt: 0, mud, sand }` (arrasto extra por superfície, em dados).
  - Em `src/main.js`: uma linha — `params: resolveCarParams(BASE_PARAMS, DEFAULT_PARTS)` (a garagem do EP-006 troca o argumento).
  - Criar `tests/sim/fixtures/areia.stage.js` (fixture Node, fora de `src/stages/`): trecho de terra + trecho de areia.
- Depends On: TASK-kaleugit-EP-003-02
- Canonical File: memory-system/tasks/TASK-kaleugit-EP-003-03.md
- Suggested Branch: TASK-kaleugit-EP-003-03-implement
- Input Context (max 5 files):
  - docs/EPICO-EP-003-fisica-carro-TASKS.md
  - src/physics/car-physics.js
  - src/physics/params.js
  - src/track/track.js (`SURFACE_TYPES`, `surfaceAt`)
  - tests/sim/harness.js
- Done Criteria:
  - CA-008 em `tests/sim/parts.test.js`, input idêntico (`up` constante): cada troca de pneu e cada troca de câmbio (vs. `misto`/`padrao`) muda tempo de corrida ou velocidade máxima em ≥ 3%; no trecho de areia da fixture, `offroad` é mais rápido que `estrada`.
  - CDC-102 em teste: para cada par de pneus e cada par de câmbios existe ao menos um terreno (`dirt`, `mud`, `sand`) ou métrica (tempo, velocidade máxima) em que cada um vence.
  - `resolveCarParams(BASE_PARAMS, DEFAULT_PARTS)` é deep-equal a `BASE_PARAMS` (teste).
  - `npm run test:sim` e `npm test` verdes.
  - Gate de UX humano: Kaleu confirma que as diferenças são perceptíveis e que Misto/Padrão mantém a sensação atual.
- Escalation Conditions:
  - To human: algum preset ficar estritamente superior em todos os terrenos após calibração (viola CDC-102).
  - To orchestrator: necessidade de novo tipo de superfície (mudança de contrato do EP-002).

## Planning Notes
- Default policy: create `planning/report` on demand as tasks move to execution.
- Each task must be self-contained: the canonical task file + listed input context must be sufficient for execution without implicit knowledge from prior tasks.
- Ordem: 01 → 02 → 03 (sequencial; as três editam `src/physics/car-physics.js`).
- CA-008 "no Cerrado" é verificado aqui com fixture de areia e reverificado no Cerrado real em EP-005-02.

## Decisoes Autonomas
- DA-001: Task 01 em modo Critical — Criterio: `mode-selection-rules.md` ("high regression risk") + PROJECT_SPECS §8 — Racional: move ~250 linhas do núcleo de física acoplado a objetos `three` (`carPivot.rotation.z`, `bodyGroup.position.y`) em `src/main.js`; qualquer desvio muda a sensação de direção, principal ativo do protótipo.
- DA-002: Extração preserva a matemática e o fluxo de crash; mudança de comportamento só na Task 02 — Criterio: CDC-006 — Racional: separa refactor (sem mudança de comportamento) de feature, permitindo atribuir regressões a uma task só.
- DA-003: Invariantes analíticas (velocidade máxima = constantes atuais) em vez de trace dourado do código antigo — Criterio: CDC-001/CDC-002 — Racional: o código antigo é acoplado ao DOM e ao `three`; reproduzi-lo no Node custaria uma segunda extração. Sensação fica como gate de UX humano.
- DA-004: `input` do módulo = formato de `keys` + `locked` — Criterio: CDC-002 + CDC-103 — Racional: jogador e bot usam exatamente a mesma interface, sem física especial para o bot.
- DA-005: Auto-desvira instantâneo aos 1,5s, sem reset de posição — Criterio: RF-005/CA-005 + CDC-002 — Racional: satisfaz "volta à posição normal em 1,5s ± 0,2s"; animação visual opcional fica para o gate de UX.
- DA-006: Câmbio automático modelado como trade-off aceleração × velocidade final (multiplicadores), sem simular marchas — Criterio: CDC-002 + RF-009 — Racional: RF-009 exige o trade-off e troca automática; marchas discretas não mudam o critério de aceitação (YAGNI).
- DA-007: Harness em `tests/sim/` (não em `src/`) com `dt` fixo de 1/60 — Criterio: CDC-002 + DA-005 do PROJECT_SPECS — Racional: harness é ferramenta de teste; `dt` fixo torna a simulação reproduzível sem implantar o fixed timestep no jogo.
