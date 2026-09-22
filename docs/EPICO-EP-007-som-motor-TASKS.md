# EPICO-EP-007-som-motor-TASKS

## Metadata
- Epic ID: EP-007
- Epic Title: Som do motor realista
- Last Updated: 2026-09-21
- Owner: Architect
- Status: APPROVED

## Epic Context
- Objective: som do motor derivado de RPM real, com trocas de marcha realistas e timbre mais grave.
- Scope Boundaries: `src/audio/` + `src/sound.js` + a chamada de `engineSound.update` em `src/main.js`; física intocada.
- Key Dependencies: EP-003 (preset de câmbio em `src/physics/params.js`).

## Approved Task List

### Task 01 - Modelo de motor (RPM, marchas, troca) puro e testado
- Task ID: TASK-kaleugit-EP-007-01
- Status: COMPLETED
- Priority: 1
- Execution Mode: Standard
- Domain: Áudio (modelo de motor)
- Description:
  - Criar `src/audio/engine-model.js` (sem Web Audio, sem DOM): `createEngineModel({ gearRatios, finalDrive, wheelRadius, idleRpm, redlineRpm, upshiftRpm, downshiftRpm, gearboxPreset })` -> `{ update(dt, { speed, throttle, airborne }) -> { rpm, gear, load, shifting, firingHz } }`.
  - Defaults de um 4 cilindros diesel 4 tempos: idle ~800, corte ~4000 RPM; relações genéricas (ex.: 3.2, 2.1, 1.5, 1.18, 0.96) escaladas pelo preset de câmbio (Curta/Padrão/Longa) do EP-003.
  - Troca para cima em `upshiftRpm`; na troca, RPM cai pela razão `ratio[n+1]/ratio[n]`, com curta janela de "shifting" (carga zero); redução quando RPM < `downshiftRpm`.
  - No ar: RPM sobe rápido com acelerador (roda livre) e volta ao pousar.
  - `firingHz = rpm / 60 * cylinders / 2`.
  - Teste `tests/sim/engine-model.test.js` rodando o modelo sobre `runRace` (harness do EP-003) na Mata Atlântica.
- Depends On: TASK-kaleugit-EP-003-03
- Canonical File: memory-system/tasks/TASK-kaleugit-EP-007-01.md
- Suggested Branch: TASK-kaleugit-EP-007-01-implement
- Input Context (max 5 files):
  - src/sound.js
  - src/physics/params.js
  - tests/sim/harness.js
  - docs/EPICOS.md (EP-007)
- Done Criteria:
  - `npm run test:sim` verde, com: RPM sempre em [idle, corte]; cada troca para cima reduz RPM pela razão das relações (±5%); `firingHz` em [25, 140] Hz; preset Curta troca mais cedo (em velocidade) que Longa.
  - `src/audio/engine-model.js` sem `AudioContext`, `window` ou `document` (grep vazio).
- Escalation Conditions:
  - To human: nenhum previsto.
  - To orchestrator: preset de câmbio do EP-003 não expor relação utilizável.

### Task 02 - Síntese por ordens do motor + fiação
- Task ID: TASK-kaleugit-EP-007-02
- Status: PENDING
- Priority: 1
- Execution Mode: Standard
- Domain: Áudio (síntese)
- Description:
  - Reescrever `src/sound.js` para consumir `engine-model`: osciladores nas ordens 0.5, 1, 2 e 4 da rotação (com leve detune), ganhos por ordem dependentes da carga; lowpass acompanhando RPM e carga; ruído de combustão leve modulado pela frequência de disparo; blow-off do turbo mantido.
  - Remover a tabela `GEARS`, `virtualSf`, `shiftDip` fixo e o overdrive artificial.
  - Pitch mais grave: frequência de disparo 27–133 Hz na faixa normal.
  - `src/main.js`: `engineSound.update(...)` passa `{ speed, throttle, airborne, turboActive, gearboxPreset }` (única linha de fiação + import do preset atual).
  - API pública de `initEngineSound()` mantida: `{ start, update, stop }`.
- Depends On: TASK-kaleugit-EP-007-01
- Canonical File: memory-system/tasks/TASK-kaleugit-EP-007-02.md
- Suggested Branch: TASK-kaleugit-EP-007-02-implement
- Input Context (max 5 files):
  - src/sound.js
  - src/audio/engine-model.js
  - src/main.js (chamadas de engineSound)
- Done Criteria:
  - grep de `GEARS\|virtualSf\|overdriveFreq` em `src/sound.js` vazio.
  - `npm test` verde (sem erro de console com áudio ativo).
  - Gate de UX humano: realismo das trocas e tom mais grave aprovados pelo Kaleu.
- Escalation Conditions:
  - To human: tom/realismo reprovado no gate de UX.
  - To orchestrator: necessidade de mudar a física para obter RPM.

## Planning Notes
- Default policy: create `planning/report` on demand as tasks move to execution.
- Each task must be self-contained: the canonical task file + listed input context must be sufficient for execution without implicit knowledge from prior tasks.

## Decisoes Autonomas
- DA-001: Modelo separado da síntese — Criterio: CDC-001 — Racional: o modelo é testável em Node sem Web Audio; a síntese só precisa de teste de UX.
- DA-002: Perfil 4 cilindros diesel 4 tempos (idle 800 / corte 4000) — Criterio: pedido do gestor (mais grave) + CDC-101 — Racional: o Bandeirante original era diesel 4 cilindros; a faixa de disparo 27–133 Hz é mais grave que os 50–175 Hz atuais.
- DA-003: Relações genéricas 3.2/2.1/1.5/1.18/0.96 como ponto de partida — Criterio: CDC-005 — Racional: referência comum em simuladores de motor; afinadas no gate de UX.
