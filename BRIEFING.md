# BRIEFING — race-game

> Visão completa do produto (MVP, economia, netcode, roadmap): `docs/briefing.md`.
> Este arquivo registra o briefing do **ciclo atual** de desenvolvimento.

## O que é

Jogo de corrida arcade side-scroll 1v1 ambientado em biomas brasileiros, com visual
low-poly flat-shaded e câmera ortográfica. O produto final é skill-gaming PvP com
apostas (moeda fake no MVP, dinheiro real pós-MVP). O protótipo atual tem um lobby,
uma pista (Mata Atlântica) e um oponente fantasma com tempo fixo (`BOT_FINISH_TIME`).

**Ciclo atual:** transformar o protótipo num jogo single-player completo contra bot,
com estágios (biomas), garagem de customização e um segundo bioma (Cerrado).

## Escopo

**Incluído:**

- **Fluxo de telas:** Lobby → Garagem → Mapa de estágios → Contagem 3-2-1 → Corrida →
  Resultado → (Revanche | Mapa | Garagem).
- **Sistema de estágios data-driven:** cada estágio = um bioma, definido como dados em
  `src/stages/` (relevo, hazards, fundo, paleta, dificuldade do bot). Adicionar um bioma
  não exige mexer no motor.
- **Desbloqueio:** vencer o bot num estágio libera o próximo. Progresso em `localStorage`.
- **Bot com IA:** dirige um carro real com a mesma física do jogador, via inputs simulados;
  pode errar e capotar. Dificuldade por estágio (Cerrado um pouco mais difícil).
  Aparece **só no mini-mapa**, não na pista.
- **Auto-desvira:** carro de cabeça para baixo por ~1,5s se endireita sozinho
  (jogador e bot). Não há DNF por capotagem.
- **Tela de resultado:** tempo do jogador, tempo do bot e diferença (ex.: `+1.34s`).
- **Garagem (tudo liberado, sem economia):**
  - Cor: paleta fixa (~10 cores) — só visual.
  - Pneus: Estrada / Misto / Off-road — visual + física (aderência vs. velocidade final,
    com interação com terreno, ex.: off-road agarra melhor na areia).
  - Câmbio: preset Curta / Padrão / Longa — troca automática na corrida; curta = mais
    aceleração, longa = mais velocidade final. Controles não mudam.
  - Escolha persistida em `localStorage`; o bot usa um preset próprio.
- **Estágio Mata Atlântica:** polir a pista atual (hazards, 60–90s de corrida).
- **Estágio Cerrado (novo):** fundo foto `public/img/cerrado.jpg` (mesmo esquema da Mata
  Atlântica), pista própria com relevo distinto e hazard principal de areia/terra
  vermelha solta (muda a tração).

**Fora de escopo (neste ciclo):**

- Multiplayer, matchmaking, Supabase, contas, apostas, economia/moeda, XP.
- Refactor de determinismo/lockstep (fica para a fase de multiplayer).
- Upgrades de motor/turbo/chassi (a estrutura de dados de peças deve deixar espaço).
- Biomas além de Mata Atlântica e Cerrado; troca manual de marcha; recordes/estrelas.

## Usuários e perfis

Jogador casual a mid-core brasileiro, 18+, jogando no navegador (desktop e mobile via
controles touch existentes). Um único perfil local neste ciclo (sem login).

## Stack pretendida

- Frontend: Three.js + Vite, ES modules, vanilla JS (sem React), texturas procedurais em canvas
- Backend: nenhum neste ciclo (Supabase no MVP multiplayer)
- Banco de dados: nenhum — `localStorage` para progresso e garagem
- Infraestrutura/deploy: build estático Vite (Vercel/Netlify/Cloudflare Pages)

## Restrições

- Manter o estilo visual atual: low-poly flat-shaded, câmera ortográfica, eixo x, HUD
  monospace com textos em português.
- Hazards posicionados à mão por estágio (sem geração procedural).
- Performance aceitável em Android de entrada.
- Nenhum pay-to-win (pilar do produto) — irrelevante agora, mas a garagem não deve
  introduzir conceitos que o contrariem.

## Critérios de sucesso

- É possível jogar o fluxo completo Lobby → Garagem → Mapa → Corrida → Resultado sem erros.
- Vencer a Mata Atlântica desbloqueia o Cerrado, e isso persiste após recarregar a página.
- O bot completa as duas pistas com tempos plausíveis e pode ser vencido por um jogador
  habilidoso.
- Trocar pneus e câmbio muda de forma perceptível o comportamento do carro.
- Uma corrida típica dura entre 60 e 90 segundos em cada estágio.
