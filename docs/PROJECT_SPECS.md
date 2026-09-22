# PROJECT_SPECS — race-game

*Last updated: 2026-09-22*

Fonte de verdade funcional deste projeto. Origem: `BRIEFING.md` (ciclo atual) e `docs/briefing.md` (visão de produto do MVP). Preenchido por `skills/bootstrap`.

> Escopo deste documento = **ciclo atual** (single-player completo contra bot). A visão completa do produto (multiplayer, economia, apostas, netcode) vive em `docs/briefing.md` e `docs/execution-plan.md` e só entra aqui quando virar ciclo.

## 1. Identificação

- Nome do produto: race-game (nome comercial TBD)
- Objetivo principal: entregar um jogo single-player completo de corrida arcade side-scroll contra um bot, com estágios (biomas), desbloqueio progressivo e garagem de customização.
- Problema que resolve: o protótipo atual tem uma pista e um oponente fantasma de tempo fixo (`BOT_FINISH_TIME = 26` em `src/main.js`); não há loop de jogo completo nem progressão. Este ciclo cria o loop "escolher → correr → resultado → de novo" que será a base do produto PvP.
- Público-alvo: jogador brasileiro casual a mid-core, 18+, jogando no navegador (desktop e mobile com controles touch).

## 2. Escopo

### Incluído

- Fluxo de telas: Lobby → Garagem → Mapa de estágios → Contagem 3-2-1 → Corrida → Resultado → (Revanche | Mapa | Garagem).
- Sistema de estágios data-driven em `src/stages/` (relevo, hazards, fundo, paleta, dificuldade do bot).
- Desbloqueio sequencial de estágios, persistido em `localStorage`.
- Bot com IA que dirige um carro real com a mesma física do jogador (inputs simulados), visível só no mini-mapa.
- Auto-desvira após ~1,5s de cabeça para baixo (jogador e bot).
- Tela de resultado com tempo do jogador, do bot e diferença.
- Garagem: cor (~10 cores, visual), pneus (Estrada/Misto/Off-road, visual + física), câmbio (Curta/Padrão/Longa, automático), motor (3 potências, som levemente diferente), chassi (3 pesos) e tanque do turbo (Pequeno/Médio/Grande).
- Estágio Mata Atlântica polido (hazards, 30–45s).
- Estágio Cerrado novo (fundo `public/img/cerrado.jpg`, relevo próprio, hazard de areia/terra vermelha solta).

### Fora de escopo

- Multiplayer, matchmaking, Supabase, contas, apostas, economia/moeda, XP.
- Refactor de determinismo/lockstep (fase multiplayer).
- Biomas além de Mata Atlântica e Cerrado; troca manual de marcha; recordes/estrelas.

## 3. Perfis e níveis de acesso

- Jogador local único, sem login. Todo estado fica no `localStorage` do navegador.

## 4. Requisitos funcionais

- RF-001: Fluxo de telas Lobby → Garagem → Mapa → Contagem 3-2-1 → Corrida → Resultado, com saídas Revanche / Mapa / Garagem no Resultado. — Estado: PENDENTE
- RF-002: Estágios definidos como dados em `src/stages/` (relevo, hazards, fundo, paleta, dificuldade do bot); o motor carrega qualquer estágio sem código específico por bioma. — Estado: PENDENTE
- RF-003: Vencer o bot num estágio desbloqueia o próximo; progresso persistido em `localStorage`. — Estado: PENDENTE
- RF-004: Bot dirige um carro com a mesma física do jogador via inputs simulados, pode errar/capotar, tem dificuldade por estágio e aparece só no mini-mapa. — Estado: PENDENTE
- RF-005: Carro de cabeça para baixo por ~1,5s se endireita sozinho (jogador e bot); não existe DNF por capotagem. — Estado: PENDENTE
- RF-006: Tela de resultado mostra tempo do jogador, tempo do bot e diferença com sinal (ex.: `+1.34s`). — Estado: PENDENTE
- RF-007: Garagem com cor (~10 cores fixas), pneus (Estrada/Misto/Off-road) e câmbio (Curta/Padrão/Longa); escolha persistida em `localStorage`; bot usa preset próprio. — Estado: PENDENTE
- RF-008: Pneus alteram aderência vs. velocidade final com interação por terreno (off-road agarra melhor na areia). — Estado: PENDENTE
- RF-009: Câmbio altera aceleração vs. velocidade final (curta = mais aceleração, longa = mais velocidade final), com troca automática. — Estado: PENDENTE
- RF-010: Estágio Mata Atlântica polido, com hazards posicionados à mão. — Estado: PENDENTE
- RF-012: Garagem com 3 motores (variam HP e, de leve, o som do motor), 3 chassis (variam peso) e 3 tanques de combustível do turbo (Pequeno / Médio / Grande; o atual é o Médio). Todas as peças liberadas e sempre como trade-off (CDC-102). — Estado: PENDENTE
- RF-011: Estágio Cerrado com fundo `public/img/cerrado.jpg`, relevo distinto e hazard de areia/terra vermelha solta que muda a tração. — Estado: PENDENTE

## 5. Requisitos não funcionais

- RNF-001: Manter visual low-poly flat-shaded, câmera ortográfica, mundo no eixo x, HUD monospace com textos em PT-BR. — Estado: ATIVO
- RNF-002: Performance aceitável em Android de entrada (alvo: TBD — ver DA-004). — Estado: PENDENTE
- RNF-003: Sem backend: build estático Vite, persistência só em `localStorage`. — Estado: ATIVO
- RNF-004: Nenhum conceito de pay-to-win na garagem (pneus/câmbio são trade-offs, não upgrades estritamente melhores). — Estado: ATIVO
- RNF-005: Vanilla JS + ES modules, sem framework de UI; dependências de runtime restritas a `three`. — Estado: ATIVO

## 6. Critérios de aceitação

- CA-001: (RF-001) Teste e2e percorre Lobby → Garagem → Mapa → Corrida → Resultado → Revanche/Mapa/Garagem sem erro no console. PASS se todas as transições ocorrem e o console não registra exceções.
- CA-002: (RF-003) Após vencer a Mata Atlântica e recarregar a página, o Cerrado aparece desbloqueado no Mapa. Com `localStorage` limpo, só a Mata Atlântica está disponível.
- CA-003: (RF-002) Adicionar um arquivo de estágio em `src/stages/` o torna jogável sem editar `src/main.js` nem os módulos do motor.
- CA-004: (RF-004) Em simulação sem jogador, o bot termina cada estágio em N=10 corridas; tempos ficam dentro de ±15% da mediana e são maiores que o melhor tempo de referência de um jogador (ver DA-003).
- CA-005: (RF-005) Com o carro invertido e parado, ele volta à posição normal em 1,5s ± 0,2s, para jogador e bot.
- CA-006: (RF-006) A diferença exibida é igual a `tempoJogador − tempoBot` formatada com sinal e 2 casas decimais.
- CA-007: (RF-007) Escolhas de cor/pneu/câmbio sobrevivem a um reload; o bot não herda as escolhas do jogador.
- CA-008: (RF-008, RF-009) Com input automatizado idêntico, trocar pneu ou câmbio muda o tempo de corrida ou a velocidade máxima medida em ≥ 3%; no Cerrado, pneu Off-road é mais rápido que Estrada no trecho de areia.
- CA-010: (RF-012) Com input automatizado idêntico, cada troca de motor, chassi ou tanque muda o tempo, a velocidade máxima ou o tempo de turbo em ≥ 3%; nenhuma combinação de peças é estritamente superior em todos os terrenos e métricas (CDC-102); motor/chassi/tanque padrão (atuais) mantêm a física atual idêntica.
- CA-009: (RF-010, RF-011) O tempo de corrida com input de referência (acelerar + turbo, correções mínimas) fica entre 30 e 45s em cada estágio (revisado em 2026-09-22: corridas 50% mais curtas, decisão do gestor; antes 60–90s).

## 7. Restrições e premissas

- Hazards posicionados à mão por estágio (sem geração procedural); a pista é igual para todos.
- O bot usa exatamente a física do jogador; não há "rubber-banding" nem física especial.
- Estrutura de dados de peças deve comportar upgrades futuros (motor/turbo/chassi) sem migração destrutiva do `localStorage`.
- Deploy: build estático na Vercel (projeto `race-game`, branch de produção `main`).

## 8. Riscos principais

- IA do bot com mesma física pode ficar travada/capotar em loop em trechos difíceis, tornando tempos implausíveis (mitigação: auto-desvira + tuning por estágio).
- `src/main.js` concentra loop, física, HUD e bot (~1.100 linhas); introduzir estágios data-driven e uma segunda instância de carro com física (o bot) exige refatoração com risco de regressão da sensação atual de direção.
- Performance em Android de entrada sem alvo numérico definido.
- Diferenças de física por pneu/câmbio podem ficar imperceptíveis ou desequilibradas sem playtest.

## 9. Análise de requisitos — priorização e dependências

Contextos (candidatos a épicos, sem sobreposição):

1. **Motor de estágios** — RF-002, RF-005 (base de tudo; extrai pista/hazards de `main.js` para dados).
2. **Carro e física configurável** — RF-008, RF-009 (parâmetros de pneu/câmbio consumidos pelo carro); depende de 1.
3. **Bot com IA** — RF-004; depende de 1 e 2 (usa o mesmo carro/física).
4. **Fluxo de telas, garagem e progressão** — RF-001, RF-003, RF-006, RF-007; depende de 1 e 2.
5. **Conteúdo de estágios** — RF-010, RF-011; depende de 1, 2 e 3 (tuning de tempo e dificuldade).

Ordem sugerida: 1 → 2 → (3 ∥ 4) → 5.

## 10. Decision Criteria (CDT)

Critérios default do boilerplate (aplicar quando critérios específicos do projeto forem omissos):

1. **CDC-001 Implementable by AI agents** — prefer established patterns the agent can implement correctly on first try.
2. **CDC-002 Minimal complexity** — prefer three repeated lines over a premature abstraction.
3. **CDC-003 Zero unnecessary dependencies** — prefer native primitives or short hand-written code over a substitutable dependency.
4. **CDC-004 Economically viable** — prefer free or native solutions over paid services with substitutes.
5. **CDC-005 Delivery speed** — prefer implementation speed when other criteria are equivalent.
6. **CDC-006 Reversibility** — prefer reversible decisions; escalate genuinely irreversible ones to the human.

Overrides específicos do projeto:

- **CDC-101 Preservar a identidade visual** — em qualquer trade-off visual, manter low-poly flat-shaded, câmera ortográfica, eixo x e HUD monospace em PT-BR. Fonte: `BRIEFING.md` § Restrições.
- **CDC-102 Sem pay-to-win** — nenhuma escolha de garagem pode ser estritamente superior; toda peça é trade-off. Fonte: `BRIEFING.md` § Restrições; `docs/briefing.md` § 3 Pilar 1.
- **CDC-103 Skill decide a corrida** — hazards fixos e idênticos por estágio, bot sem física especial; preferir soluções que mantenham resultado determinado por habilidade. Fonte: `docs/briefing.md` § 3 Pilar 2, § 5.
- **CDC-104 Dados antes de código** — conteúdo (estágios, presets de peças, dificuldade) vive em dados; preferir estender dados a adicionar ramos de código por bioma. Fonte: `BRIEFING.md` § Escopo.
- **CDC-105 Performance em Android de entrada** — entre soluções equivalentes, preferir a de menor custo de render/CPU. Fonte: `BRIEFING.md` § Restrições; `docs/briefing.md` § 14.
- **CDC-106 Preparar o multiplayer sem construí-lo** — evitar decisões que dificultem o futuro determinismo (ex.: `Math.random()` na física de gameplay), sem implementar lockstep agora. Fonte: `BRIEFING.md` § Fora de escopo; `docs/briefing.md` § 11.

### Decisões Autônomas

- **DA-001** — Escopo do ciclo atual prevalece sobre `docs/briefing.md` onde divergem: Cerrado é construído agora (lá era stub pós-MVP). — Critério: explicit human decision (`BRIEFING.md` é o briefing do ciclo) — Racional: `BRIEFING.md` declara registrar o ciclo atual. `RESOLVED_BY_CRITERIA: precedence 1 — Cerrado in scope`.
- **DA-002** — O bot com IA é o "modo prática" previsto em `docs/briefing.md` § 8 (sem apostas, sem recompensas); não contraria a regra "no ghost racing" do produto PvP, que vale para partidas competitivas. — Critério: CDC-006 — Racional: interpretação reversível que concilia os dois documentos sem mudar escopo.
- **DA-003** — "Tempo plausível" do bot = terminar sempre, com variação limitada, e ser vencível por um jogador habilidoso; métrica concreta em CA-004, com tempo de referência do jogador medido no tuning de cada estágio. — Critério: CDC-001 — Racional: torna o critério de sucesso do briefing verificável como PASS/FAIL.
- **DA-004** — Alvo de performance em Android de entrada fica TBD até um épico de perf/tuning; neste bootstrap, RNF-002 não bloqueia planejamento. — Critério: CDC-005 — Racional: não há dispositivo de referência no briefing; decisão reversível.
- **DA-005** — Determinismo (fixed timestep, PRNG semeado) fica fora do ciclo apesar de `docs/execution-plan.md` exigi-lo antes de tudo; o plano de execução passa a valer só para a fase multiplayer. CDC-106 limita decisões que o dificultem. — Critério: explicit human decision (`BRIEFING.md` § Fora de escopo) — Racional: o ciclo atual adiou explicitamente o refactor.
- **DA-006** — Carro do ciclo = Bandeirante atual (único); a estrutura de dados deve aceitar outros carros depois. — Critério: CDC-005, CDC-106 — Racional: `BRIEFING.md` não pede novo carro; `docs/briefing.md` cita Besouro como starter do MVP multiplayer, fora deste ciclo.
- **DA-007** — Corridas 50% mais curtas (CA-009 passa a 30–45s) e peças de motor/chassi/tanque entram neste ciclo (RF-012), sem economia: tudo liberado na garagem. — Critério: explicit human decision (gestor, 2026-09-22) — Racional: pedido direto; o pilar sem pay-to-win continua valendo via CDC-102.
