# EPICOS

## Metadata
- Last Updated: 2026-09-21
- Owner: Architect
- Status: ACTIVE

## Rules
- Canonical file: this document.
- Epic IDs are stable and never reused.
- Epic IDs are RESERVED on `main` before branching, never allocated from a branch (see `skills/gen-epics/SKILL.md`, "Epic ID Allocation Protocol"); `scripts/validate-epic-ids.sh` enforces it.
- `DA-NNN` IDs are EPIC-SCOPED, not globally unique: always cite a DA together with its epic (`DA-308 (EP-026)`), never bare.
- File-level versioning is done by Git history.

## Epic List

### EP-001 - Infraestrutura de testes e2e
- Status: PLANNED
- Domain: Testes (ferramental)
- Objective: Deixar o projeto com um runner e2e de navegador que exercita o jogo real e roda com um único comando.
- Scope In:
  - Dependência de dev `@playwright/test` + navegador Chromium (aprovada em `docs/PREREQUISITES.md`).
  - Script `npm test` que sobe o build/preview do Vite e roda a suíte e2e.
  - Smoke test do fluxo atual: Lobby → corrida → tela de resultado, falhando em qualquer exceção no console.
  - Ganchos de teste mínimos e estáveis (seletores/atributos `data-testid` ou flag de URL) para o e2e dirigir o jogo sem depender de timing visual.
- Scope Out:
  - Testes das telas novas (cada épico adiciona os seus).
  - Integração no CI de governança (mudança de CI exige autorização do gestor — ADR-016).
  - Qualquer mudança de gameplay.
- Dependencies: None
- Completion Signal:
  `npm test` sai com código 0 e o smoke test passa localmente; `docs/PREREQUISITES.md` marca o item de e2e como `[x]`.
- Escalation Triggers:
  - Playwright não roda nesta máquina (Windows ARM64) após instalação padrão.
  - O jogo exige ganchos de teste que alterem comportamento de produção além de atributos/flags inertes.
- Change Log:
  - 2026-09-21 - Épico aprovado pelo gestor.

### EP-002 - Motor de estágios data-driven
- Status: PLANNED
- Domain: Estágios (pista, relevo, hazards, cenário)
- Objective: Carregar pista, relevo, hazards, fundo, paleta e dificuldade do bot a partir de um arquivo de dados por estágio em `src/stages/`, sem código específico por bioma no motor.
- Scope In:
  - Formato de dados de estágio (relevo/slopes/features, linha de chegada, zonas de hazard com tipo de superfície, fundo, paleta, parâmetro de dificuldade do bot).
  - Registro de estágios com ordem (usado pelo desbloqueio).
  - Migração da pista atual (`SLOPES`, `FEATURES`, `FINISH_LINE_X`, lama, fundo) de `src/main.js` para `src/stages/mata-atlantica.js`, preservando a sensação atual.
  - Consulta por posição x: altura da pista e tipo de superfície (consumida pela física).
- Scope Out:
  - Física do carro e efeito de cada superfície na tração (EP-003).
  - Conteúdo novo, tuning de duração e o Cerrado (EP-005).
  - Tela de mapa e desbloqueio (EP-006).
- Dependencies: EP-001
- Completion Signal:
  CA-003 passa: um estágio de teste em `src/stages/` fica jogável sem editar `src/main.js` nem módulos do motor; smoke e2e do EP-001 continua verde na Mata Atlântica migrada.
- Escalation Triggers:
  - A migração muda de forma perceptível a sensação de direção atual (requer teste de UX humano).
  - O formato de dados exigir código por bioma para algum hazard existente.
- Change Log:
  - 2026-09-21 - Épico aprovado pelo gestor.

### EP-003 - Carro com física configurável
- Status: PLANNED
- Domain: Carro (física e peças)
- Objective: Transformar a física do carro numa instância independente e parametrizável por pneus e câmbio, com interação por superfície e auto-desvira.
- Scope In:
  - Física do carro por instância (sem estado global), sem dependência de DOM, permitindo dois carros simultâneos (jogador e bot).
  - Presets de pneus (Estrada / Misto / Off-road) e câmbio (Curta / Padrão / Longa) como dados, com espaço para upgrades futuros (motor/turbo/chassi) — RF-008, RF-009.
  - Aderência por tipo de superfície vinda do estágio (EP-002).
  - Auto-desvira após ~1,5s de cabeça para baixo; sem DNF por capotagem — RF-005.
  - Harness de simulação sem renderização para medir tempo/velocidade com input automatizado.
- Scope Out:
  - Tela de garagem e persistência da escolha (EP-006).
  - IA do bot (EP-004).
  - Determinismo/lockstep (fora do ciclo — DA-005 do PROJECT_SPECS).
- Dependencies: EP-002
- Completion Signal:
  CA-005 e CA-008 passam no harness de simulação (auto-desvira em 1,5s ± 0,2s; troca de pneu/câmbio altera tempo ou velocidade máxima em ≥ 3%; Off-road mais rápido que Estrada na areia).
- Escalation Triggers:
  - Algum preset ficar estritamente superior aos outros em todos os terrenos (viola CDC-102).
  - A sensação de direção do preset Padrão divergir da atual (teste de UX humano).
- Change Log:
  - 2026-09-21 - Épico aprovado pelo gestor.

### EP-004 - Bot com IA
- Status: PLANNED
- Domain: Bot (IA de pilotagem)
- Objective: Substituir o oponente fantasma de tempo fixo por um bot que dirige uma instância real do carro via inputs simulados.
- Scope In:
  - Controlador de IA que gera os mesmos inputs do jogador (acelerar, frear, inclinar, turbo) a partir do estado do carro e do estágio.
  - Parâmetro de dificuldade lido dos dados do estágio.
  - Preset de peças próprio do bot.
  - Remoção de `BOT_FINISH_TIME`; posição do bot exposta para o HUD.
- Scope Out:
  - Renderização do bot na pista (ele não aparece na pista).
  - Mini-mapa/HUD (EP-006).
  - Tuning final por estágio (EP-005).
- Dependencies: EP-002, EP-003
- Completion Signal:
  CA-004 passa na Mata Atlântica: em 10 corridas simuladas o bot termina todas, com tempos em ±15% da mediana.
- Escalation Triggers:
  - O bot só consegue terminar com física especial ou rubber-banding (proibido por PROJECT_SPECS §7).
  - Não houver tempo de referência de jogador para calibrar "vencível" (item pendente em `docs/PREREQUISITES.md`).
- Change Log:
  - 2026-09-21 - Épico aprovado pelo gestor.

### EP-005 - Conteúdo de estágios: Mata Atlântica e Cerrado
- Status: PLANNED
- Domain: Conteúdo (level design)
- Objective: Entregar os dois estágios do ciclo com hazards posicionados à mão, corridas de 60–90s e dificuldade do bot calibrada.
- Scope In:
  - Mata Atlântica polida: hazards à mão, extensão para 60–90s — RF-010.
  - Cerrado novo: fundo `public/img/cerrado.jpg`, relevo distinto, hazard de areia/terra vermelha solta — RF-011.
  - Dificuldade do bot por estágio (Cerrado um pouco mais difícil).
- Scope Out:
  - Mudanças no formato de dados ou no motor (EP-002).
  - Novos tipos de física de superfície (EP-003).
  - Biomas além desses dois.
- Dependencies: EP-002, EP-003, EP-004
- Completion Signal:
  CA-009 passa nos dois estágios (60–90s com input de referência) e CA-004 passa no Cerrado.
- Escalation Triggers:
  - Atingir 60–90s exigir mudança no motor ou na física.
  - Performance cair de forma perceptível no Cerrado (sem alvo numérico — DA-004 do PROJECT_SPECS).
- Change Log:
  - 2026-09-21 - Épico aprovado pelo gestor.

### EP-006 - Telas, garagem e progressão
- Status: PLANNED
- Domain: Interface e fluxo do jogador
- Objective: Entregar o fluxo completo Lobby → Garagem → Mapa → Contagem → Corrida → Resultado com garagem, desbloqueio e persistência local.
- Scope In:
  - Tela de garagem: cor (~10 cores fixas), pneus e câmbio, persistidos em `localStorage` — RF-007.
  - Mapa de estágios com desbloqueio sequencial persistido — RF-003.
  - Contagem 3-2-1 e tela de resultado com tempos e diferença com sinal — RF-006.
  - Saídas do resultado: Revanche / Mapa / Garagem — RF-001.
  - Mini-mapa/HUD mostrando o bot (o bot aparece só ali).
  - Textos em PT-BR, estilo HUD monospace atual.
- Scope Out:
  - Economia, moeda, XP, contas.
  - Lógica de física das peças (EP-003) e conteúdo dos estágios (EP-005).
- Dependencies: EP-003, EP-004, EP-005
- Completion Signal:
  CA-001, CA-002, CA-006 e CA-007 passam em e2e.
- Escalation Triggers:
  - Layout não couber em mobile landscape com os controles touch atuais.
  - Estrutura de `localStorage` exigir migração destrutiva do recorde atual (`race_best_time`).
- Change Log:
  - 2026-09-21 - Épico aprovado pelo gestor.

### EP-007 - Som do motor realista
- Status: PLANNED
- Domain: Áudio (som do motor)
- Objective: Trocar as 4 faixas de frequência fixas de `src/sound.js` por um som derivado de RPM real (marchas com relações, queda de RPM proporcional na troca, ordens do motor) e deixar o timbre mais grave.
- Scope In:
  - Modelo de motor puro (sem Web Audio): RPM a partir da velocidade, relações de marcha, diferencial e raio da roda; troca automática por RPM; queda de RPM na troca = razão entre relações; marcha lenta e corte; carga (acelerador) e freio-motor.
  - Relações de marcha escaladas pelo preset de câmbio (Curta / Padrão / Longa) do EP-003.
  - Síntese por ordens do motor (harmônicos inteiros e meio-inteiros da rotação do virabrequim, 4 cilindros 4 tempos) com brilho e volume dependentes da carga.
  - Pitch mais grave: frequência de disparo entre ~27 Hz (≈800 RPM) e ~133 Hz (≈4000 RPM), contra 50–175 Hz atuais.
  - Blow-off do turbo mantido.
- Scope Out:
  - Samples gravados (continua 100% procedural, sem arquivos de áudio).
  - Som do bot (o bot não aparece na pista).
  - Mudança na física do carro (o áudio só lê o estado).
- Dependencies: EP-003
- Completion Signal:
  Teste de simulação do modelo de motor: RPM dentro de [idle, corte] em toda a corrida, cada troca para cima reduz o RPM pela razão das relações (±5%), frequência de disparo entre 25 e 140 Hz; `npm test` verde; teste de UX humano aprova realismo e tom.
- Escalation Triggers:
  - O som exigir dados que a física não expõe sem mudar o EP-003.
  - Performance de áudio perceptivelmente pior em mobile.
- Change Log:
  - 2026-09-21 - Épico criado a pedido do gestor (marchas pouco realistas; pitch um pouco mais grave).

### EP-008 - Corridas curtas, marchas longas e peças de performance
- Status: PLANNED
- Domain: Conteúdo + carro (peças)
- Objective: Encurtar as corridas em 50%, alongar as marchas do som e adicionar 3 motores, 3 chassis e 3 tanques de turbo à garagem como trade-offs.
- Scope In:
  - Mata Atlântica e Cerrado ~50% mais curtos (CA-009 revisado: 30–45s), preservando o caráter de cada estágio.
  - Marchas mais longas no modelo de motor do som (cada marcha cobre mais velocidade; menos trocas).
  - Motores (3 potências; alteram de leve o som), chassis (3 pesos) e tanques de turbo (Pequeno / Médio / Grande; atual = Médio); atuais = padrão com física idêntica.
  - Garagem, perfil salvo e fiação das 3 peças novas.
- Scope Out:
  - Economia, compra ou desbloqueio de peças (tudo liberado).
  - Novos estágios.
- Dependencies: EP-005, EP-006, EP-007
- Completion Signal:
  CA-009 (30–45s) e CA-004 passam nos dois estágios; CA-010 passa (≥3% por troca, não-dominância, padrão idêntico); garagem salva e aplica as 3 peças (e2e); teste de UX humano.
- Escalation Triggers:
  - Alguma combinação de peças ficar estritamente superior (viola CDC-102).
  - Encurtar a pista exigir mudança no motor de estágios.
- Change Log:
  - 2026-09-22 - Épico criado a pedido do gestor (corrida 50% mais curta; motores, chassis e tanques; marchas mais longas).

## Decisoes Autonomas
- DA-001: EP-001 (infra e2e) vem antes de qualquer épico de gameplay — Criterio: CDC-001 + AGENTS.md "Non-Escalable: verification of non-UX behavior" — Racional: sem e2e, CA-001/CA-002/CA-007 ficariam FAIL; testar primeiro evita épicos que não conseguem fechar.
- DA-002: A física por instância fica no EP-003 (carro), não no EP-002 (estágios) — Criterio: um domínio por épico (gen-epics) — Racional: o estágio só expõe altura e superfície; como o carro reage é domínio do carro.
- DA-003: O conteúdo (EP-005) vem antes das telas (EP-006) — Criterio: CDC-005 + verificabilidade — Racional: CA-002 (desbloquear o Cerrado) é testado com o estágio real, sem estágio fictício.
- DA-004: O mini-mapa fica no EP-006 e o EP-004 só expõe a posição do bot — Criterio: um domínio por épico — Racional: HUD é interface; o bot não conhece a tela.
- DA-005: Integrar o e2e ao CI de governança fica fora do EP-001 — Criterio: ADR-016 — Racional: mudança de CI exige autorização específica do gestor; o e2e roda localmente via `npm test` até lá.
- DA-006: EP-007 (som) executa logo após o EP-003 e antes do EP-004 — Criterio: pedido do gestor + CDC-005 — Racional: só depende do preset de câmbio do EP-003; rodar antes do EP-004 evita duas tasks mexendo no `main.js` ao mesmo tempo.
