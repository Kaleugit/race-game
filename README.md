# Race Game 🏁

Jogo de corrida 1v1 side-scrolling no browser, construído com Three.js puro e sem frameworks. O jogador controla o **Bandeirante** em uma pista com física de suspensão, turbo, saltos e backflips contra um bot, com sistema de apostas planejado para o futuro.

---

## Stack

| Tecnologia | Uso |
|---|---|
| [Three.js](https://threejs.org/) v0.160 | Renderização 3D (cena, câmera ortográfica, geometrias procedurais) |
| [Vite](https://vitejs.dev/) v5 | Dev server e bundler |
| Web Audio API | Som procedural do motor (sem arquivos de áudio) |
| Canvas API | Texturas procedurais (pista, lama, pneu, fumaça, placa) |
| Vanilla ES Modules | Sem framework de UI |

---

## Estrutura

```
src/
├── main.js       # Loop principal da corrida (física, câmera, HUD, bot)
├── car.js        # Modelo 3D do Bandeirante (geometria, fumaça, suspensão)
├── lobby.js      # Tela de lobby (rotação do carro, zoom, música)
├── sound.js      # Motor procedural com 4 marchas e blow-off de turbo
└── textures.js   # Texturas canvas (pista, céu, montanhas, lama)

public/
├── music/        # Trilha sonora do lobby
└── img/          # Imagens estáticas (background jungle)
```

---

## Como rodar

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173`.

```bash
npm run build   # gera dist/
npm run preview # preview do build
```

---

## Controles

| Tecla | Ação |
|---|---|
| `↑` | Acelerar |
| `↓` | Frear / ré |
| `←` `→` | Inclinar (no ar: girar) |
| `Espaço` | Turbo |
| `G` | Toggle grid de debug |
| `D` | Toggle HUD de debug |

**Mobile:** botão TOUCH ativa o touchpad virtual.

---

## Física

- **Suspensão** — mola-amortecedor (spring-damper) independente da física do chassis, animando o `bodyGroup` em Y
- **Saltos** — gravidade real, detecção de pouso com `vy` e cálculo de `airTime`
- **Bounce** — impacto multiplica `bounceLevel` com decay progressivo
- **Slope** — inclinação da pista aplica força gravitacional ao longo do eixo X
- **Hitbox** — polígono 2D do chassis verificado contra `trackHeight()` a cada frame

---

## O Carro — Bandeirante

Modelo 100% procedural em Three.js, sem arquivos `.glb`.

### Geometria principal
- Corpo + cabine + capô com `RoundedBoxGeometry` — costuras eliminadas por sobreposição de geometria
- Janelas em `MeshPhysicalMaterial` com clearcoat e transparência
- Rack de teto com 4 postes de canto
- 4 faróis de teto hemisféricos com backing escuro
- Vincos de porta
- Escapamento em `TubeGeometry` (CatmullRomCurve3) com tela perfurada (alphaMap procedural)
- Placa traseira `kaleu.dev®` e texto `MANTIQUEIRA` no pneu
- Piscas dianteiros amarelos

### Fumaça
Pool de 100 sprites com física de direção baseada na velocidade:
- **Idle**: quase vertical
- **Velocidade máxima**: 100% horizontal
- **Turbo + acelerador**: fumaça densa
- **No ar / backflip**: turbulência caótica

---

## Som Procedural

Zero arquivos de áudio — gerado em tempo real com Web Audio API.

### Motor — 4 marchas
| Marcha | fLow | fHigh |
|---|---|---|
| 1ª | 50 Hz | 90 Hz |
| 2ª | 95 Hz | 120 Hz |
| 3ª | 125 Hz | 148 Hz |
| 4ª | 153 Hz | 175 Hz + overdrive |

- `virtualSf` sobe lentamente (2s por marcha) e cai rápido ao desacelerar
- Drop de 45 Hz na troca de marcha, decaindo em ~110ms
- Overdrive na 4ª: +25 Hz a 2.5 Hz/s
- WaveShaperNode para textura/grit do motor

### Blow-off de turbo
Ruído branco filtrado (bandpass Q=0.7, ~1000–1400 Hz) disparado ao **soltar** o turbo. Volume 2.0, duração 0.6s.

---

## HUD e Interface

- Velocímetro em km/h, distância, barra de turbo
- Barra de corrida com posição relativa jogador × bot
- Tela de resultado com tempos (VITÓRIA / DERROTA) e melhor tempo salvo em `localStorage`
- Botões **REINICIAR** e **← LOBBY** durante a corrida

---

## Lobby

- Carro 3D rotacionável com drag (mouse/touch)
- Toque no carro → zoom 1.70× para apreciação
- Toque fora → sai do zoom
- Música ambiente em loop com botão mute
- Botão de tela cheia + lock de orientação landscape (mobile)

---

## Roadmap

- [ ] Modo PvP 1v1 online (WebSockets)
- [ ] Sistema de apostas com moeda virtual
- [ ] Mais veículos selecionáveis
- [ ] Pistas adicionais
- [ ] Ranking / leaderboard
- [ ] Moeda real (pós-MVP)
