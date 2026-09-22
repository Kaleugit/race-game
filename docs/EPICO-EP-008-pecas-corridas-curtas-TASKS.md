# EPICO-EP-008-pecas-corridas-curtas-TASKS

## Metadata
- Epic ID: EP-008
- Epic Title: Corridas curtas, marchas longas e peças de performance
- Last Updated: 2026-09-22
- Owner: Architect
- Status: APPROVED

## Epic Context
- Objective: corridas 50% mais curtas, marchas mais longas no som e 3 motores / 3 chassis / 3 tanques de turbo na garagem.
- Scope Boundaries: dados dos estágios, modelo de motor do som, presets de peças + física, garagem/perfil/fiação.
- Key Dependencies: EP-005 (estágios), EP-006 (garagem/perfil), EP-007 (som).

## Approved Task List

### Task 01 - Corridas 50% mais curtas
- Task ID: TASK-kaleugit-EP-008-01
- Status: COMPLETED
- Priority: 1
- Execution Mode: Standard
- Domain: Conteúdo (level design)
- Description:
  - Encurtar `src/stages/mata-atlantica.stage.js` (2600 m) e `src/stages/cerrado.stage.js` (2800 m) em ~50%, mantendo os trechos mais característicos de cada bioma (Mata: abertura original, serra, atoleiro; Cerrado: uma chapada grande, areia).
  - Atualizar os limites de CA-009 em `tests/sim/stage-duration.test.js` para 30–45s.
  - Recalibrar a dificuldade do bot se preciso para manter CA-004 (Cerrado continua um pouco mais difícil = razão bot/referência menor que a da Mata).
  - Não mexer em `tests/e2e/*` (a EP-006-05 está alterando esses arquivos em paralelo; corridas mais curtas só deixam os timeouts com mais folga).
- Depends On: TASK-kaleugit-EP-005-02
- Canonical File: memory-system/tasks/TASK-kaleugit-EP-008-01.md
- Suggested Branch: TASK-kaleugit-EP-008-01-implement
- Input Context (max 5 files):
  - src/stages/mata-atlantica.stage.js
  - src/stages/cerrado.stage.js
  - tests/sim/stage-duration.test.js
  - tests/sim/bot.test.js
- Done Criteria:
  - CA-009 (30–45s) e CA-004 passam nos dois estágios em `npm run test:sim`.
  - Só arquivos de estágio e testes de simulação mudam em `src/`/`tests/`.
- Escalation Conditions:
  - To human: nenhum previsto.
  - To orchestrator: encurtar exigir mudança no motor de estágios.

### Task 02 - Marchas mais longas no som
- Task ID: TASK-kaleugit-EP-008-02
- Status: COMPLETED
- Priority: 1
- Execution Mode: Quick
- Domain: Áudio (modelo de motor)
- Description:
  - Em `src/audio/engine-model.js`, alongar todas as marchas: cada marcha cobre pelo menos ~30% mais velocidade que hoje (ex.: reduzir `finalDrive` e/ou espaçar relações), mantendo RPM em [idle, corte] e a queda proporcional na troca.
  - Atualizar `tests/sim/engine-model.test.js` com o novo critério (velocidade da 1ª troca e faixa por marcha maiores que as atuais).
- Depends On: TASK-kaleugit-EP-007-02
- Canonical File: memory-system/tasks/TASK-kaleugit-EP-008-02.md
- Suggested Branch: TASK-kaleugit-EP-008-02-implement
- Input Context (max 5 files):
  - src/audio/engine-model.js
  - tests/sim/engine-model.test.js
- Done Criteria:
  - Cada faixa de velocidade por marcha ≥ 1,3× a atual (teste); RPM em [800, 4000]; troca = razão das relações (±5%).
- Escalation Conditions:
  - To human: tom reprovado no gate de UX.
  - To orchestrator: nenhuma.

### Task 03 - Motores, chassis e tanques de turbo (dados + física + som)
- Task ID: TASK-kaleugit-EP-008-03
- Status: COMPLETED
- Priority: 1
- Execution Mode: Standard
- Domain: Carro (peças)
- Description:
  - Em `src/parts/presets.js`: `ENGINES` (3 potências), `CHASSIS` (3 pesos), `TANKS` (`pequeno`/`medio`/`grande`), com `DEFAULT_PARTS` estendido (atuais = padrão) e `resolveCarParams` aplicando-os; cada peça é trade-off (ex.: mais HP = mais aceleração/velocidade mas mais peso; chassi leve = acelera mais mas é menos estável no ar/pousos; tanque grande = mais turbo mas mais peso).
  - Em `src/physics/params.js` / `car-physics.js`: parâmetros novos (massa, capacidade do tanque) com o padrão idêntico ao atual (goldens 1e-9 continuam verdes).
  - Motor altera de leve o som: variante no modelo/síntese (ex.: RPM de corte, timbre ou faixa) via parâmetro vindo do preset.
  - Testes: CA-010 (≥3% por troca, não-dominância CDC-102, padrão = física atual).
- Depends On: TASK-kaleugit-EP-008-05
- Canonical File: memory-system/tasks/TASK-kaleugit-EP-008-03.md
- Suggested Branch: TASK-kaleugit-EP-008-03-implement
- Input Context (max 5 files):
  - src/parts/presets.js
  - src/physics/params.js
  - src/physics/car-physics.js
  - src/audio/engine-model.js
  - tests/sim/parts.test.js
- Done Criteria:
  - CA-010 em `npm run test:sim`; goldens EP-003-01 inalterados e verdes.
- Escalation Conditions:
  - To human: nenhum previsto.
  - To orchestrator: não-dominância impossível sem mudar pneus/câmbio.

### Task 05 - Turbo: recarga com espaço segurado + histerese; bot recalibrado para humanos
- Task ID: TASK-kaleugit-EP-008-05
- Status: COMPLETED
- Priority: 1
- Execution Mode: Standard
- Domain: Carro (física do turbo) + Bot (calibração)
- Description:
  - Bug achado na EP-006-05: em `updateTurbo` (`src/physics/car-physics.js`) o tanque não recarrega enquanto `space` está segurado, e o turbo acende com qualquer resto de combustível; alternar o espaço a cada quadro (60 Hz, inumano) mantém o turbo ~50% do tempo com tanque vazio. O motorista de referência depende disso, então o bot está calibrado contra um jogador impossível (humano: ~83–85s na Mata vs bot ~79s).
  - Corrigir: recarregar sempre que o turbo não estiver ativo (inclusive com espaço segurado) e exigir um mínimo de combustível para reacender depois de esvaziar (histerese, parâmetro em `BASE_PARAMS`).
  - Referência (`tests/sim/reference-driver.js`) passa a segurar o espaço; medir também um perfil "humano" (toques 0,1 s/0,1 s) e garantir que ambos vencem o bot.
  - Recalibrar `bot.difficulty` por estágio e/ou `TUNING` do bot para CA-004 (bot mais lento que a referência humana, Cerrado um pouco mais difícil).
  - Atualizar `tests/e2e/drive.js` para segurar espaço (política humana) e manter os e2e verdes.
  - Goldens do EP-003-01: se algum caso usa espaço segurado com tanque vazio, o valor muda por causa do bug corrigido — regravar a partir do código novo explicando exatamente qual caso mudou; tolerância 1e-9 mantida.
- Depends On: TASK-kaleugit-EP-008-01, TASK-kaleugit-EP-008-02
- Canonical File: memory-system/tasks/TASK-kaleugit-EP-008-05.md
- Suggested Branch: TASK-kaleugit-EP-008-05-implement
- Input Context (max 5 files):
  - src/physics/car-physics.js
  - src/physics/params.js
  - src/bot/bot-driver.js
  - tests/sim/reference-driver.js
  - tests/e2e/drive.js
- Done Criteria:
  - Teste: segurar espaço com tanque vazio recarrega; alternar a cada quadro não dá mais turbo que segurar.
  - CA-004 e CA-009 nos dois estágios com a referência segurando espaço; perfil de toques humanos também vence o bot.
  - `npm test` e `npm run test:sim` verdes.
- Escalation Conditions:
  - To human: nenhum previsto (correção de bug de mecânica).
  - To orchestrator: recalibração exigir mudar a física além do turbo.

### Task 04 - Garagem, perfil e fiação das peças novas
- Task ID: TASK-kaleugit-EP-008-04
- Status: COMPLETED
- Priority: 1
- Execution Mode: Standard
- Domain: Interface e fluxo do jogador
- Description:
  - `src/ui/garage.js` + `index.html`: seletores de motor, chassi e tanque com rótulos de trade-off derivados dos presets.
  - `src/profile/profile.js`: salvar/ler as 3 peças (sem migração destrutiva de `race_profile_v1`; valores ausentes = padrão).
  - `src/main.js`: aplicar as peças na física e o motor no som a cada corrida; HUD de turbo refletindo a capacidade do tanque.
  - e2e: escolhas das 3 peças sobrevivem ao reload e chegam à corrida.
- Depends On: TASK-kaleugit-EP-008-03, TASK-kaleugit-EP-006-05
- Canonical File: memory-system/tasks/TASK-kaleugit-EP-008-04.md
- Suggested Branch: TASK-kaleugit-EP-008-04-implement
- Input Context (max 5 files):
  - src/ui/garage.js
  - src/profile/profile.js
  - src/main.js
  - index.html
  - src/parts/presets.js
- Done Criteria:
  - `npm test` e `npm run test:sim` verdes; e2e das peças passa; perfil antigo sem as peças novas carrega com os padrões.
- Escalation Conditions:
  - To human: layout da garagem não caber em mobile landscape.
  - To orchestrator: conflito com a EP-006-05.

### Task 06 - Redesign do painel de peças da garagem
- Task ID: TASK-kaleugit-EP-008-06
- Status: COMPLETED
- Priority: 1
- Execution Mode: Standard
- Domain: Interface e fluxo do jogador
- Description:
  - Pedido do gestor (teste de UX, 2026-09-22): o painel de escolha de peças está feio e se sobrepõe ao carro, ao fundo da garagem e ao botão TELA CHEIA.
  - A cena da garagem (carro, fundo, botão) fica como está; só o painel de peças é redesenhado (layout, hierarquia, estética), usando as skills de design disponíveis (design-taste-frontend, redesign-existing-projects).
  - Sem sobreposição ao carro nem ao botão TELA CHEIA em desktop (1280x720, 1920x1080) e mobile landscape (640x360, 740x360).
  - Mantém os contratos da EP-008-04 (seletores data-*, perfil, fiação) e os e2e existentes.
- Depends On: TASK-kaleugit-EP-008-04
- Canonical File: memory-system/tasks/TASK-kaleugit-EP-008-06.md
- Suggested Branch: TASK-kaleugit-EP-008-06-implement
- Input Context (max 5 files):
  - index.html
  - src/ui/garage.js
  - src/lobby.js
  - src/parts/presets.js
  - tests/e2e/parts.spec.js
- Done Criteria:
  - `npm test` e `npm run test:sim` verdes; e2e prova ausência de sobreposição com o carro e o botão TELA CHEIA nas resoluções citadas; aprovação visual do gestor.
- Escalation Conditions:
  - To human: não haver espaço sem sobreposição em mobile landscape.

### Task 07 - HUD da corrida padronizado + gauges de velocidade e turbo
- Task ID: TASK-kaleugit-EP-008-07
- Status: COMPLETED
- Priority: 1
- Execution Mode: Standard
- Domain: Interface e fluxo do jogador
- Description:
  - Pedido do gestor (teste de UX, 2026-09-22): na tela de corrida, VEL, DIST, TURBO, barra do BOT, comandos e botões devem seguir a mesma fonte e tamanhos dos itens das telas iniciais (lobby/garagem, após a Task 06).
  - Velocidade e turbo viram gauges (mostradores) com transparência; o gauge de turbo continua refletindo a capacidade do tanque (Pequeno/Médio/Grande).
  - Testar em desktop e mobile landscape (controles touch não podem ser cobertos pelos gauges).
- Depends On: TASK-kaleugit-EP-008-06
- Canonical File: memory-system/tasks/TASK-kaleugit-EP-008-07.md
- Suggested Branch: TASK-kaleugit-EP-008-07-implement
- Input Context (max 5 files):
  - index.html
  - src/main.js
  - src/lobby.js
  - tests/e2e/parts.spec.js
  - tests/e2e/drive.js
- Done Criteria:
  - `npm test` e `npm run test:sim` verdes; e2e prova que gauges e HUD não se sobrepõem aos controles touch e à barra de corrida em 1280x720, 1920x1080, 640x360 e 740x360; aprovação visual do gestor.
- Escalation Conditions:
  - To human: não caber sem sobreposição em mobile landscape.

### Task 08 - Trocar o som dos motores 1.6 e 2.4
- Task ID: TASK-kaleugit-EP-008-08
- Status: COMPLETED
- Priority: 1
- Execution Mode: Quick
- Domain: Som
- Description:
  - Pedido do gestor (teste de UX, 2026-09-22): o som do motor 1.6 ficou muito bom; trocar o som do 1.6 com o do 2.4 (o 2.4 passa a soar como o 1.6 atual e vice-versa). Só som (`sound` + `timbre`); física das peças inalterada.
- Depends On: TASK-kaleugit-EP-008-03
- Canonical File: memory-system/tasks/TASK-kaleugit-EP-008-08.md
- Suggested Branch: TASK-kaleugit-EP-008-08-implement
- Input Context (max 5 files):
  - src/parts/presets.js
  - tests/sim/parts-rf012.test.js
- Done Criteria:
  - `npm run test:sim` e `npm test` verdes; aprovação auditiva do gestor.
- Escalation Conditions:
  - None

### Task 09 - Lobby com CORRIDA/GARAGEM + garagem em carrossel
- Task ID: TASK-kaleugit-EP-008-09
- Status: PENDING
- Priority: 1
- Execution Mode: Standard
- Domain: Interface e fluxo do jogador
- Description:
  - Pedido do gestor (UX, 2026-09-22): no lobby, dois botões: CORRIDA (vai para o mapa de estágios e daí para a corrida, usando a configuração salva) e GARAGEM (vai para as alterações e volta ao lobby).
  - Garagem: cada alteração (Motor, Câmbio, Pneu, Chassi, Tanque, Cor) num card único estilo carrossel (anterior/próximo, indicador de posição); o jogador mexe numa coisa de cada vez. A tela atual com tudo ao mesmo tempo está poluída demais.
  - Mantém: cena da garagem, não sobrepor o carro nem o TELA CHEIA, perfil/seletores data-*, resumo DESEMPENHO (compacto), mobile landscape.
- Depends On: TASK-kaleugit-EP-008-06
- Canonical File: memory-system/tasks/TASK-kaleugit-EP-008-09.md
- Suggested Branch: TASK-kaleugit-EP-008-09-implement
- Input Context (max 5 files):
  - index.html
  - src/lobby.js
  - src/ui/garage.js
  - tests/e2e/drive.js
  - tests/e2e/garage-layout.spec.js
- Done Criteria:
  - `npm test` e `npm run test:sim` verdes; e2e cobre CORRIDA→mapa→corrida, GARAGEM→carrossel→lobby e o carrossel sem sobreposição nas 4 resoluções; aprovação visual do gestor.
- Escalation Conditions:
  - To human: carrossel não caber em mobile landscape.

### Task 10 - HUD: só distância do jogador + posição 1º/2º; contagem de 1 s
- Task ID: TASK-kaleugit-EP-008-10
- Status: PENDING
- Priority: 1
- Execution Mode: Quick
- Domain: Interface e fluxo do jogador
- Description:
  - Pedido do gestor (UX, 2026-09-22): no HUD, remover a distância do bot; manter só a do jogador e mostrar a posição de cada um (1º / 2º) para jogador e bot.
  - Contagem pré-corrida passa de 3 s para 1 s.
- Depends On: TASK-kaleugit-EP-008-07
- Canonical File: memory-system/tasks/TASK-kaleugit-EP-008-10.md
- Suggested Branch: TASK-kaleugit-EP-008-10-implement
- Input Context (max 5 files):
  - src/ui/race-hud.js
  - src/main.js
  - index.html
  - tests/e2e/hud-layout.spec.js
  - tests/e2e/drive.js
- Done Criteria:
  - `npm test` e `npm run test:sim` verdes; e2e prova posição 1º/2º coerente com as distâncias e contagem de ~1 s; aprovação visual do gestor.
- Escalation Conditions:
  - None

### Task 11 - Bot fantasma opcional
- Task ID: TASK-kaleugit-EP-008-11
- Status: PENDING
- Priority: 1
- Execution Mode: Standard
- Domain: Interface e fluxo do jogador
- Description:
  - Pedido do gestor (UX, 2026-09-22): possibilidade de ver o bot como fantasma: o carro do bot desenhado semitransparente na pista, sem colisão, seguindo a física já existente dele.
  - Opção liga/desliga escolhida antes da corrida (tela do mapa), persistida no perfil; padrão desligado (comportamento atual: bot só na barra de corrida).
- Depends On: TASK-kaleugit-EP-008-09, TASK-kaleugit-EP-008-10
- Canonical File: memory-system/tasks/TASK-kaleugit-EP-008-11.md
- Suggested Branch: TASK-kaleugit-EP-008-11-implement
- Input Context (max 5 files):
  - src/main.js
  - src/lobby.js
  - src/profile/profile.js
  - index.html
  - src/bot/bot-driver.js
- Done Criteria:
  - `npm test` e `npm run test:sim` verdes; e2e prova fantasma visível/oculto conforme a opção e persistência; sem impacto no desempenho do jogador; aprovação visual do gestor.
- Escalation Conditions:
  - None

### Task 12 - Placa de aviso (!) 20 m antes de cada hazard
- Task ID: TASK-kaleugit-EP-008-12
- Status: PENDING
- Priority: 1
- Execution Mode: Quick
- Domain: Conteúdo e fluxo do jogador
- Description:
  - Pedido do gestor (UX, 2026-09-22): 20 m antes de cada faixa de areia, lama ou qualquer hazard, uma placa com ponto de exclamação.
  - Gerada a partir dos dados do estágio (zonas de hazard), em todos os estágios (inclusive o modo livre da Task 13); visual low-poly coerente, sem colisão.
- Depends On: TASK-kaleugit-EP-008-10
- Canonical File: memory-system/tasks/TASK-kaleugit-EP-008-12.md
- Suggested Branch: TASK-kaleugit-EP-008-12-implement
- Input Context (max 5 files):
  - src/stages/*.stage.js
  - src/main.js
  - src/textures.js
  - tests/sim/stages.test.js
  - tests/e2e/stage-data.spec.js
- Done Criteria:
  - `npm test` e `npm run test:sim` verdes; teste prova uma placa a 20 m antes de cada hazard de cada estágio; aprovação visual do gestor.
- Escalation Conditions:
  - None

### Task 13 - Modo livre: terreno de 5000 m
- Task ID: TASK-kaleugit-EP-008-13
- Status: PENDING
- Priority: 1
- Execution Mode: Standard
- Domain: Conteúdo e fluxo do jogador
- Description:
  - Pedido do gestor (UX, 2026-09-22): uma modalidade de andar livre num terreno de 5000 m.
  - Estágio data-driven de 5000 m com mistura de terra, lama, areia, subidas e saltos; sem bot, sem tempo/resultado de vitória, sem afetar o progresso; HUD mostra a distância; ao chegar ao fim, tela simples com VOLTAR/DE NOVO.
  - Acesso: card "MODO LIVRE" sempre desbloqueado na tela do mapa (após a Task 09); placas de aviso da Task 12 valem aqui.
- Depends On: TASK-kaleugit-EP-008-09, TASK-kaleugit-EP-008-11, TASK-kaleugit-EP-008-12
- Canonical File: memory-system/tasks/TASK-kaleugit-EP-008-13.md
- Suggested Branch: TASK-kaleugit-EP-008-13-implement
- Input Context (max 5 files):
  - src/stages/registry.js
  - src/main.js
  - src/lobby.js
  - index.html
  - tests/e2e/drive.js
- Done Criteria:
  - `npm test` e `npm run test:sim` verdes; e2e entra no modo livre pelo mapa, dirige e confirma que não há bot nem registro de vitória; aprovação do gestor.
- Escalation Conditions:
  - None

## Planning Notes
- Default policy: create `planning/report` on demand as tasks move to execution.
- Each task must be self-contained: the canonical task file + listed input context must be sufficient for execution without implicit knowledge from prior tasks.

## Decisoes Autonomas
- DA-001: Tasks 01 e 02 rodam em paralelo (arquivos disjuntos) — Criterio: CDC-005 — Racional: estágios vs. modelo de motor.
- DA-002: Task 03 depois da 02 — Criterio: um dono por arquivo — Racional: ambas mexem em `src/audio/engine-model.js`.
- DA-003: Peças atuais = padrão, com física idêntica — Criterio: CDC-006 + goldens do EP-003 — Racional: quem não mexer na garagem não sente diferença.
- DA-004: Task 05 (bug do turbo + recalibração do bot) antes da 03 — Criterio: INTEGRITY (causa raiz) + CA-004 "vencível por jogador habilidoso" — Racional: a referência atual depende de uma exploração de 60 Hz impossível para humanos; a 03 mexe no mesmo arquivo de física e nos tanques.
