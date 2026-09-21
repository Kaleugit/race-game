# EPICO-EP-002-motor-estagios-TASKS

## Metadata
- Epic ID: EP-002
- Epic Title: Motor de estágios data-driven
- Last Updated: 2026-09-21
- Owner: Architect
- Status: APPROVED

## Epic Context
- Objective: Carregar pista, relevo, hazards, fundo, paleta e dificuldade do bot a partir de um arquivo de dados por estágio em `src/stages/`, sem código por bioma no motor.
- Scope Boundaries: formato de dados + registro + consulta de pista (altura/inclinação/superfície) + cena da pista montada a partir dos dados. Fora: efeito da superfície na tração (EP-003), conteúdo novo e tuning (EP-005), tela de mapa (EP-006).
- Key Dependencies: EP-001 (`npm test`, `tests/e2e/smoke.spec.js`).
- Dono da fiação de `src/main.js` neste épico: **TASK-kaleugit-EP-002-02** (única task do épico que edita `src/main.js`).

## Contrato de dados de estágio (referência para todas as tasks)
Arquivo `src/stages/<id>.stage.js`, `export default`:
```js
{
  id: 'mata-atlantica',            // string única, kebab-case
  name: 'Mata Atlântica',          // rótulo PT-BR
  order: 1,                        // ordem de desbloqueio (EP-006)
  hidden: false,                   // true = fora do mapa, só via ?stage=<id>
  track: {
    finishX: 620,
    noise: [{ amp: 0.18, freq: 0.06, phase: 0 }, ...],   // termos senoidais de trackHeight
    slopes: [{ x, w, dh }, ...],
    features: [{ x, type: 'bell'|'valley'|'plateau'|'wave'|'asym', w, h, count?, leftFactor? }, ...],
  },
  surfaces: { default: 'dirt', zones: [{ from, to, type: 'dirt'|'mud'|'sand' }] },
  visuals: { background: '/img/misty-tropical-jungle.jpg', mudLayer: true,
             palette: { ground: 0x1a2818, zones: { mud: 0x..., sand: 0x... } } },
  bot: { difficulty: 0.5 },         // 0..1, consumido pelo EP-004
}
```
- `SURFACE_TYPES = ['dirt', 'mud', 'sand']` é exportado por `src/track/track.js` e é o contrato com a física (consumidor: EP-003-03).

## Approved Task List

### Task 01 - Formato de estágio, registro e consulta de pista (sem render)
- Task ID: TASK-kaleugit-EP-002-01
- Status: PENDING
- Priority: 1
- Execution Mode: Standard
- Domain: Estágios (dados e consulta de pista)
- Description:
  - Criar `src/track/track.js` (puro, sem `three`, sem DOM): `export function createTrack(stage)` → `{ heightAt(x), slopeAt(x), surfaceAt(x), finishX }`; `export const SURFACE_TYPES`. Mover para cá, sem alterar a matemática, `featureContribution`, `rampEase`, `baseElevation` e o corpo de `trackHeight` de `src/main.js` (os termos senoidais viram `stage.track.noise`). `slopeAt(x) = (heightAt(x+1) - heightAt(x-1)) / 2` (mesma fórmula usada hoje em `updateSpeed`).
  - Criar `src/stages/registry.js` (puro): `createRegistry(modules)` → `{ getStage(id), listStages(), getDefaultStage() }`; `listStages()` ordena por `order` e exclui `hidden`; `validateStage(stage)` lança erro para `feature.type` ou `surface.type` desconhecido, `id` duplicado ou `finishX` ausente.
  - Criar `src/stages/index.js`: `import.meta.glob('./*.stage.js', { eager: true })` → `createRegistry(...)`; exporta `getStage`, `listStages`, `getDefaultStage`.
  - Criar `src/stages/mata-atlantica.stage.js` com `SLOPES`, `FEATURES`, `FINISH_LINE_X`, ruído, fundo `/img/misty-tropical-jungle.jpg`, cor do chão `0x1a2818`, `mudLayer: true`, `surfaces.zones: []` (sem hazard físico novo — preserva a sensação), `bot.difficulty: 0.5`.
  - Criar `tests/sim/load-stages.js` (Node): lê `src/stages/*.stage.js` via `fs.readdirSync` + `import()` e chama `createRegistry` (o `import.meta.glob` só existe no Vite).
  - Adicionar script `"test:sim": "node --test tests/sim/"` em `package.json` (sem nova dependência — `node:test` é nativo).
  - Gerar `tests/sim/fixtures/mata-atlantica-heights.json` a partir do `trackHeight` **pré-migração** (código de `src/main.js` no commit `d399713`), x de -40 a 900 passo 0,5.
  - `src/main.js` NÃO é editado nesta task (continua com as constantes antigas até a Task 02).
- Depends On: TASK-kaleugit-EP-001-01
- Canonical File: memory-system/tasks/TASK-kaleugit-EP-002-01.md
- Suggested Branch: TASK-kaleugit-EP-002-01-implement
- Input Context (max 5 files):
  - docs/EPICO-EP-002-motor-estagios-TASKS.md (seção "Contrato de dados de estágio")
  - src/main.js (linhas 38-157: `SLOPES`, `FEATURES`, `FINISH_LINE_X`, `trackHeight`; 185-243: lama; 300-303: fundo)
  - package.json
- Done Criteria:
  - `npm run test:sim` sai com código 0 e inclui: (a) `createTrack(mataAtlantica).heightAt(x)` igual ao fixture com tolerância 1e-9 em todos os pontos; (b) `validateStage` rejeita `feature.type: 'x'` e `surface.type: 'x'`; (c) `listStages()` ordena por `order` e omite `hidden: true`; (d) `surfaceAt(x)` retorna `'dirt'` fora de zonas e o tipo da zona dentro dela.
  - `grep -nE "document|window|from 'three'" src/track/track.js src/stages/registry.js` não retorna nada.
  - `git diff --name-only` não contém `src/main.js`.
  - `npm test` (e2e EP-001) continua verde.
- Escalation Conditions:
  - To human: algum elemento da pista atual só puder ser expresso com código específico de bioma.
  - To orchestrator: EP-001 não entregue (`npm test` ausente); fixture não reproduzível a partir do commit `d399713`.

### Task 02 - Cena da pista a partir dos dados + fiação no `src/main.js`
- Task ID: TASK-kaleugit-EP-002-02
- Status: PENDING
- Priority: 1
- Execution Mode: Standard
- Domain: Estágios (cena e integração no loop)
- Description:
  - Criar `src/track/track-scene.js`: `createTrackScene({ scene, skyScene, stage, track })` → `{ update(scroll), dispose() }`. Move de `src/main.js`: estrada (`roadGeo`/`deformRoad`), faixa de lama (`makeMudTexture`/`deformMud`, só se `visuals.mudLayer`), chão (`visuals.palette.ground`), fundo do céu (`visuals.background`), portal de chegada (posicionado em `track.finishX`) e malhas genéricas por zona de superfície (cor de `visuals.palette.zones[type]`, sem ramo por bioma).
  - `dispose()` remove malhas/texturas da cena — requisito para troca de estágio em tempo de execução (consumido por EP-006-04).
  - Em `src/main.js`: remover `SLOPES`, `FEATURES`, `FINISH_LINE_X`, `BOT_FINISH_TIME` (constante não usada), `trackHeight` e o código movido; substituir toda chamada `trackHeight(x)` por `track.heightAt(x)` e `FINISH_LINE_X` por `track.finishX`.
  - Seleção de estágio: `?stage=<id>` na URL (default `getDefaultStage()`); `function setStage(id)` em `src/main.js` chama `dispose()` do estágio anterior e recria `track` + `trackScene`.
  - A física continua em `src/main.js` (extração é EP-003-01); nenhum valor de física muda.
- Depends On: TASK-kaleugit-EP-002-01
- Canonical File: memory-system/tasks/TASK-kaleugit-EP-002-02.md
- Suggested Branch: TASK-kaleugit-EP-002-02-implement
- Input Context (max 5 files):
  - docs/EPICO-EP-002-motor-estagios-TASKS.md
  - src/main.js
  - src/track/track.js
  - src/stages/index.js
  - src/textures.js
- Done Criteria:
  - `grep -nE "SLOPES|FEATURES|FINISH_LINE_X|BOT_FINISH_TIME|function trackHeight|misty-tropical-jungle" src/main.js` não retorna nada.
  - `grep -n "createTrackScene\|setStage" src/main.js` mostra a chamada real no fluxo de início de corrida e `trackScene.update(state.scroll)` dentro de `tick`.
  - `npm test` verde (smoke EP-001 na Mata Atlântica migrada); `npm run test:sim` verde.
  - Gate de UX humano (não é PASS do agente): Kaleu confirma que pista, lama, fundo e sensação de direção na Mata Atlântica são indistinguíveis do protótipo.
- Escalation Conditions:
  - To human: a migração mudar de forma perceptível a sensação de direção ou o visual (gatilho do épico).
  - To orchestrator: necessidade de editar `src/car.js` ou `src/lobby.js`; mais de 6 arquivos alterados.

### Task 03 - Prova do CA-003: estágio de teste só com dados + e2e
- Task ID: TASK-kaleugit-EP-002-03
- Status: PENDING
- Priority: 2
- Execution Mode: Quick
- Domain: Testes (verificação do motor de estágios)
- Description:
  - Criar `src/stages/teste-plano.stage.js`: `hidden: true`, `order: 99`, pista quase plana, `finishX: 200`, uma zona `{ type: 'sand' }` e uma `{ type: 'mud' }` (valida render genérico de zonas), `bot.difficulty: 0.5`, fundo existente em `public/img/`.
  - Criar `tests/e2e/stage-data.spec.js`: abre `/?stage=teste-plano`, clica `#lobby-play`, espera `#countdown-overlay` sumir, segura `ArrowUp`, espera `#end-overlay` visível em até 60s; falha em `pageerror`/`console.error`.
  - Nenhum arquivo fora de `src/stages/` e `tests/` pode ser alterado (essa é a prova do CA-003).
- Depends On: TASK-kaleugit-EP-002-02
- Canonical File: memory-system/tasks/TASK-kaleugit-EP-002-03.md
- Suggested Branch: TASK-kaleugit-EP-002-03-implement
- Input Context (max 5 files):
  - docs/EPICO-EP-002-motor-estagios-TASKS.md
  - src/stages/mata-atlantica.stage.js
  - tests/e2e/smoke.spec.js
- Done Criteria:
  - CA-003: `git diff --name-only main...HEAD` lista apenas `src/stages/teste-plano.stage.js`, `tests/e2e/stage-data.spec.js` e o arquivo de task em `memory-system/`.
  - `npm test` sai com código 0 com `smoke.spec.js` e `stage-data.spec.js` passando.
- Escalation Conditions:
  - To human: nenhuma prevista.
  - To orchestrator: o estágio de teste exigir edição de `src/main.js` ou de `src/track/*` (CA-003 FAIL → reabrir EP-002-02).

## Planning Notes
- Default policy: create `planning/report` on demand as tasks move to execution.
- Each task must be self-contained: the canonical task file + listed input context must be sufficient for execution without implicit knowledge from prior tasks.
- Ordem: 01 → 02 → 03 (sequencial; só a 02 toca `src/main.js`).

## Decisoes Autonomas
- DA-001: Descoberta de estágios via `import.meta.glob('./*.stage.js')` + registro puro separado (`registry.js`) — Criterio: CA-003 + CDC-003 — Racional: adicionar um arquivo basta para o estágio existir no jogo, sem lista manual; o registro puro permite carregar os mesmos estágios no Node (`tests/sim/load-stages.js`), onde `import.meta.glob` não existe. Alternativa rejeitada: lista de imports em `index.js` (exigiria editar um arquivo do motor por estágio).
- DA-002: Regressão da pista migrada provada por fixture numérico de `trackHeight` gerado do commit `d399713` — Criterio: CDC-001 — Racional: torna "preservar a sensação" verificável por máquina para o relevo; sensação de direção fica como gate de UX humano.
- DA-003: Testes de unidade/simulação com `node --test` (`npm run test:sim`), separado do `npm test` do EP-001 — Criterio: CDC-003 — Racional: runner nativo do Node 24, zero dependência; não altera o contrato `npm test` = e2e definido no EP-001.
- DA-004: A Mata Atlântica migrada tem `surfaces.zones: []`; a lama atual é só visual (`mudLayer`) — Criterio: CDC-006 + escopo do épico — Racional: hoje a lama não afeta a física; criar zonas físicas agora mudaria a sensação. Hazards à mão entram no EP-005.
- DA-005: Seleção de estágio por `?stage=<id>` antes da tela de mapa — Criterio: CDC-005 — Racional: flag de URL inerte permite e2e e jogo manual de qualquer estágio sem esperar o EP-006; o EP-006 mantém o parâmetro como atalho de teste.
- DA-006: Estágio de teste versionado em `src/stages/` com `hidden: true` — Criterio: CA-003 — Racional: o CA exige arquivo em `src/stages/`; `hidden` o mantém fora do mapa de produção.
- DA-007: Task 03 em modo Quick — Criterio: `mode-selection-rules.md` — Racional: 2 arquivos novos, sem contrato novo, baixo risco.
