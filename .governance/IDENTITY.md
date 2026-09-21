# PROJECT IDENTITY (Tier A — hand-maintained)

PROJECT: race-game — corrida arcade side-scroll 1v1 em biomas brasileiros, low-poly, para jogadores casuais/mid-core 18+ no navegador.
OBJECTIVE: loop rápido de corrida (achar partida → correr → resultado → de novo) decidido por habilidade; ciclo atual = single-player vs bot com estágios e garagem.
ARCHITECTURE:
  src/            código do jogo (Three.js + Vite, ES modules vanilla): main.js, car.js, lobby.js, sound.js, textures.js
  src/stages/     definições data-driven de estágios/biomas (planejado)
  public/         assets estáticos (img/, música, .glb)
  scripts/        automações do projeto + validadores de governança
  docs/           briefing.md (visão do produto), execution-plan.md, specs, épicos e decisões
  skills/ memory-system/ .governance/  framework de governança herdado do boilerplate agentes-oda
KEY DECISIONS:
  - Visual low-poly flat-shaded, câmera ortográfica, mundo no eixo x, HUD em português.
  - Estágio = bioma, definido como dados; hazards posicionados à mão, iguais para todos.
  - Bot usa a mesma física do jogador (inputs simulados); aparece só no mini-mapa.
  - Nada de pay-to-win: dinheiro real nunca compra performance.
  - Sem backend neste ciclo; persistência local via localStorage.
DELIVERY: to main only via skills/delivery with passing CI; docs-only and bootstrap flows are the scoped exceptions.
SOURCE: hand-maintained.
