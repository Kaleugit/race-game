# Race Game — MVP Briefing

**Status:** Draft v0.1
**Owner:** Kaleu
**Last updated:** 2026-05-07

---

## 1. Vision

A 1v1 real-time skill-gaming racer set across six Brazilian biomes. Two players bet on the outcome, race head-to-head along a hand-crafted point-to-point track, and the winner takes the pot minus a platform rake. The hook is the combination of a familiar arcade driving feel, distinctly Brazilian art direction, and a meaningful (eventually real-money) wager — without the slot-machine framing of conventional online gambling.

## 2. Positioning

- **Genre:** Side-scroll arcade racing (think Hill Climb meets a more skill-heavy duel).
- **Audience:** Brazilian casual-to-mid-core players, 18+, comfortable with Pix.
- **Differentiators:**
  - Distinctly Brazilian: cars and biomes that no global studio is shipping.
  - Skill-only wagering — no house odds, no random outcomes that decide a match.
  - Race-by-race, ~1 minute sessions; built for "one more match" loops.

## 3. Product Pillars

1. **Effort-earned progression.** Better cars and parts come from playing well. Pay-to-win is a non-goal.
2. **Skill decides matches.** Hazards add variety, but the better driver should win consistently.
3. **Fast in, fast out.** Find a match, race, settle, queue again — under two minutes end-to-end.
4. **Brazil-flavored.** Cars, tracks, music, copy — local first, not localized later.

## 4. MVP Scope

### In scope for MVP (v0.1)

- Web only (desktop browser; mobile-friendly via existing touch controls).
- Open queue matchmaking + private room (share-link) matchmaking.
- Three.js + Vite stack, orthographic side-scroll camera, low-poly flat-shaded art.
- 1 starter car (free) + 1 unlockable car. *(Final count TBD — see Open Questions.)*
- 1–2 stages fully built (Atlantic Forest as launch biome). Other biomes stubbed.
- Real-time 1v1 head-to-head over Supabase.
- 4-axis upgrade system: engine, turbo, tires, chassis. Tier 1 only at launch; tier 2+ stubbed.
- Account system via Supabase Auth (email or social).
- Mini-map HUD top-right showing both racers on a round-track abstraction.
- Garage screen (own cars + equipped parts) and shop screen (buy cars + parts with in-game currency).

- When offline or no opponent is available:
- The player can go into an **offline practice mode** — no wagers, no rewards. Practice is not the product, just a courtesy fallback.


### Out of scope for MVP

- Real-money payments (Pix, credit card) — post-MVP after legal sign-off.
- KYC, anti-fraud, payouts, customer support tooling.
- All 6 biomes finished; 4 cars finished; full upgrade tree.
- Mobile app builds (web-first; native wrappers later).
- Tournaments, leaderboards beyond a basic ELO.
- Cosmetics, skins, social features (friends, chat).

### Success criteria for MVP

- 100 invited testers can find a match within 30s and finish a race without errors.
- Race desync rate under 2% across a test sample.
- Player session length ≥ 5 races on average.
- Qualitative: testers describe matches as "fair" and "skill-based" in surveys.

## 5. Gameplay

### Race format

- **Point-to-point** along a 1D x-axis track (current prototype).
- **Variable length** per stage (target 30s–90s race time).
- **Two players race simultaneously** in parallel "lanes" (visually separate but physically identical track).
- **Mini-map** top-right shows both racers as dots on a stylized round track for at-a-glance comparison.
- **Win condition:** first to cross the finish line. If a player crashes out, opponent wins on completion.

### Controls

Inherits the current prototype:

- **Keyboard:** ↑ accelerate, ↓ brake, ←/→ tilt, Space turbo,. For devs only: R restart, S activate/deactvate suspension, T infinite turbo (debug).
- **Touch:** existing on-screen pad — left/right arrows, brake, gas/turbo combo button.

### Hazards (per-stage flavored)

- Ramps (skill — landing matters)
- Wind (lateral force, harder to control when in the air)
- Slippery ground (mud, sand — reduced grip (slipery), too much grip respectively)
- Fallen trees / debris (must avoid or jump), will potentially decrease speed.
- Fog (reduced visibility window)
- Future: river crossings, rockslides, biome-specific surprises

Hazards are **placed by a designer per stage**, not procedurally generated, important: each track plays exactly the same for both players.

### Upgrades (4 categories)

| Category | Affects (pros)                              | Example tradeoff (cons) |
| Engine   | Top speed, acceleration                     | Bigger engine = more weight |
| Turbo    | Boost duration, recharge rate               | Stronger turbo = harder to control |
| Tires    | Grip, hazard resistance                     | Sticky tires = lower top speed |
| Chassis  | Durability, jump stability, wind resistance | Heavier chassis = slower acceleration |

Each axis has 4 tiers in the design, but **MVP ships tier 1 only**; tier 2+ is content roadmap.

## 6. Cars

Four base cars, visually inspired by Brazilian classics but renamed and silhouette-altered for IP safety:

| Working name      | Inspiration        | Archetype |   
| Bandeirante (TBD) | Toyota Bandeirante | Heavy, durable off-roader |
| Besouro (TBD)     | VW Fusca / Beetle  | Balanced starter |
| Chevita (TBD)     | GM Chevette        | Speed-leaning lightweight |
| Kombão (TBD)      | VW Kombi           | High mass, high cargo (cosmetic), poor handling |

Final names + visual differentiation pass needed before launch. **MVP ships with 1 starter (Besouro) + 1 unlockable.**

## 7. Stages (biomes)

| # | Biome              | MVP status | (order TBD)
| 1 | Mata Atlântica     | ✅ Full build (launch stage) |
| 2 | Cerrado            | 🟡 Stub (post-MVP) |
| 3 | Caatinga           | 🟡 Stub |
| 4 | Amazônia           | 🟡 Stub |
| 5 | Chapada Diamantina | 🟡 Stub |
| 6 | Pantanal           | 🟡 Stub |

Each stage is built **with a designer** — bespoke palette, props, hazard mix, ambient audio. Not procedurally swapped textures.

**Track access** scales with player progression: higher-tier stages require a higher minimum buy-in or a level gate. 
- Open question: real money or in-game money for entry — see §13.

## 8. Multiplayer & Netcode

- **Backend:** Supabase (auth, persistent state, realtime channels, edge functions for match settlement).
- **Primary mode:** real-time head-to-head over Supabase Realtime (WebSocket), lockstep deterministic (see §11). Server records finish, settles wager, debits/credits the ledger.
- **Offline / no-opponent fallback:** practice mode only — no wagers, no rewards, no ghost racing. The competitive game requires a live opponent.
- **Matchmaking:** open queue (skill + wager bracket) and private room (share link with friend).
- **Anti-cheat:** post-MVP, gated on commercial viability (per §13 Q5). Determinism (§11) keeps full replay validation available without spending MVP budget on it.

## 9. Economy & Betting

### Currencies

- **Game money (soft currency).** Earned by winning races. Used to buy cars, upgrades, and lower-tier track entries.
- **Real money (post-MVP).** Buys cosmetic skins and funds wager stakes. Never buys cars, upgrades, or any raw performance.
- **XP / level.** Earned per race. Gates car & parts unlocks and higher-tier tracks.

### What real money can and cannot buy

| Real money buys              | Real money does NOT buy                       |
| Wager stakes (top up wallet) | Cars                                          |
| Cosmetic skins (visual-only) | Upgrade parts (engine, turbo, tires, chassis) |
| xx                           | Track access (game-money side of the gate)    |
| xx                           | Anything that affects performance             |

Pillar #1 (effort-earned) is non-negotiable. Skins are the only premium SKU.

### Acquiring cars — four paths, all rooted in skill

1. **Level-gated unlock.** Reach required level → car becomes available for purchase with game money.
2. **Game-money purchase.** Once unlocked, buy with earned soft currency. Pricing TBD in playtests.
3. **Player-to-player trade.** Trade cars between accounts. Format TBD (auction, direct trade, marketplace fees).
4. **Wagered as match stake.** A player may wager their car against the opponent's car (or a game-money equivalent). Loser forfeits ownership.

> **Note on car-wagering (path 4):** high-risk feature. Needs careful UX (multi-step confirmation, minimum value floor, anti-grief cooldowns) and a separate legal review on whether car-as-stake changes the wagering classification post-MVP. Treat as post-MVP.

### Acquiring upgrades

Earned exclusively through the skill loop: win races → earn game money + XP → buy or unlock better engine, turbo, tires, chassis. No real-money path for parts.

### Wager mechanics

- Both players agree on a wager from a fixed bracket or they can input a custom value or car-as-stake. Post mvp => real money.
- Winner takes the pot minus rake.
- **Rake:** 10% (per §13 Q4).
- **Track entry fees** gate higher-tier biomes; gated by level + game money + skill rating (per §13 Q2).

### Revenue model

- **Primary:** rake on every wager. Recurrent, scales with active player base.
- **Secondary:** cosmetic skin sales.
- **No third revenue stream.** No pay-to-win, no loot boxes, no gameplay-affecting microtransactions.

### Post-MVP real-money rails

- Pix and credit card on/off-ramp.
- KYC at first deposit (legal requirement, Brazil).
- Skill-gaming framing: no random odds, no house bet against the player. Pure PvP rake.
- 18+ gating at first launch, no hard checks (per §13 Q10).
- **All legal/regulatory questions go through the user's lawyer — this briefing makes no legal claims.**

## 10. Art Direction

- **Style:** keep the current low-poly flat-shaded look. Warm sunset palette as the default mood, biome-tinted per stage.
- **Camera:** orthographic side-scroll (already implemented).
- **HUD:** monospace, drop-shadowed, pixel-rendering. Portuguese copy ("VEL", "DIST", "TURBO").
- **Per-biome assets:** designer-led; each biome gets its own prop set (trees, rocks, structures), skybox, ground tint, ambient audio bed.

## 11. Technical Architecture

### Client

- Three.js + Vite (existing).
- ES modules, vanilla JS (no React for MVP — keep it lean).
- Procedural canvas textures for ground/props (existing pattern in `src/textures.js`).
- Single bundle deployed to a static host (Vercel / Netlify / Cloudflare Pages).
- **Physics module (`src/physics/`):** deterministic, fixed-timestep, no DOM or rendering dependencies. Structured to run in both the browser and (post-MVP) a Node edge function. Rendering is decoupled and interpolates between physics ticks.

### Physics & netcode

- **Tick rate:** 60Hz physics, render-rate visuals with interpolation.
- **Determinism:** float64 with tolerance ε (~50ms over a 60s race). Seeded PRNG (mulberry32) for any gameplay randomness; visual `Math.random()` is segregated. CI test runs identical input streams 100× across browsers and asserts finish time within ε.
- **Netcode:** lockstep over Supabase Realtime. Both clients run the same physics simulation; only quantized input frames cross the wire (~tens of bytes × 20–30 Hz × 2 players ≈ a few KB/s per match).
- **Input delay buffer:** 3 frames (~50ms). If a frame's inputs haven't arrived yet, both clients pause one tick — simple, correct, costs occasional micro-stutters under bad networks. Rollback netcode is post-MVP.
- **Match handshake:** an edge function issues the match seed and commits both loadouts before either client starts ticking. Prevents loadout swap mid-match and guarantees identical starting state.
- **Replay validation:** post-MVP, gated on commercial viability (per §13 Q5). The deterministic engine keeps this door open without spending MVP budget on validation infrastructure.

### Backend (Supabase)

- **Auth:** email + Google.
- **DB tables (initial):** `users`, `cars`, `parts_owned`, `matches`, `wagers`, `currency_ledger`.
- **Realtime channels:** one per active match — input frames only, no state sync.
- **Edge functions:** match start (seed + loadout commit), match settle (record finish, debit/credit ledger).
- **Storage:** stage assets if too heavy for the JS bundle; otherwise bundled.

### Cost model implication

- **No authoritative game-server fleet.** Match physics runs on the two clients, not on the server. Supabase Realtime relays small input packets; cost scales with active matches at *relay-traffic* rates, not CPU-per-match rates.
- **Rough scale check:** at 1000 concurrent matches, Realtime egress is on the order of tens of GB/month — well within Supabase paid tiers. The equivalent authoritative client-server architecture would be a 4-figure monthly game-server bill.
- This cost shape is the load-bearing reason the determinism investment pays back: rake margin survives.

### Open tech questions

- **Wire input rate:** 20Hz, 30Hz, or 60Hz? Trade-off is latency feel vs. bandwidth.
- **Tolerance ε:** 50ms over 60s is a starting guess; needs playtest data.
- **Lag handling depth:** input-delay buffer only (MVP) vs. rollback netcode (post-MVP) — when do we cross the line?

## 12. Roadmap

| Phase                              | Goal                                                       | Milestones |
| **0. Prototype** (done-ish)        | Solo driving feel                                          | Existing single-player loop ✅ |
| **1. MVP — Single-player polish**  | Atlantic Forest stage final, 1 car, garage skeleton        | 4 weeks |
| **2. MVP — Multiplayer + economy** | Real-time 1v1, fake-currency wagers, matchmaking, mini-map | 6 weeks |
| **3. MVP closed beta**             | 100 invited testers, telemetry, balance                    | 3 weeks |
| **4. Real-money rails** (post-MVP) | Pix + card, KYC, payouts, legal sign-off                   | 8+ weeks |
| **5. Content expansion**           | Remaining 5 biomes, 3 more cars, upgrade tiers 2–4         | ongoing |

## 13. Open Questions

These need answers before/during MVP build:

1. **Car unlock economy.** Are non-starter cars buyable with in-game currency only, real money only, or both? Pillar #1 says no pay-to-win, but cosmetic-only premium may not generate enough revenue.
A: the game will not be pay to win, so the cars will be earned (level-wise), bought with game money (idk how expensive), traded, earned on bets (yes you can bet your car) the biggest asset here is skill, real money will only be used to buy cosmetic-only skins and to bet. The revenue will come mostly from raking the bets and selling skins.

2. **Track entry fee currency.** Higher-tier biomes gated by in-game money, real money, or skill-rating?
A: All of them plus level-gate.

3. **Upgrade acquisition.** Earned via wins (drop-style), bought outright, or crafted? Affects feel of progression heavily.
A: progression will be getting good and winning the races, so you can get money. Player will be able to acquire/earn better equipment as they gather game money and XP.

4. **Rake percentage.** 10% is a starting guess. Needs market comparison + playtest economics.
A: 10% is what I thought since it will be recurrent.

5. **Anti-cheat depth in MVP.** Server replay validation only, or also input-rate sanity checks, telemetry anomaly flags?
A: Safety and Anti-cheat department will only be developed after we decide MVP will actually evolve into a commercial product.

6. **Async-stitched race format.** When opponent unavailable, do we race against a ghost (visible) or just against their finish time (invisible)? Affects perceived fairness.
A: Dropped. Offline / no-opponent → practice only, no wagers, no rewards. ✅ **Resolved — see §4 and §8.**

7. **Determinism.** Should physics be made deterministic to enable lockstep netcode and cheap replay validation? Significant refactor cost.
A: Determinism yes, tolerance-based. ✅ **Resolved — see §11 (Physics & netcode).**

8. **Mobile-first or desktop-first balance.** Touch controls exist but were added on; if Brazilian audience is mobile-heavy, do we re-prioritize layout?
A: MVP will be on web browser fullscreen.

9. **Designer pipeline.** How are biome assets handed off? Blender → glTF → repo? Texture authoring conventions?
A: It will be low poly very similiar to what we have today.

10. **Account & wager regulatory floor.** Even with fake currency, do we need 18+ gating in MVP? (Lawyer call.)
A: Yes, just for the first time and with no checks.

11. **Lighter graphics for low-end android users.** Consider creating a low - medium - high graphics settings.

## 14. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Legal/regulatory shifts in Brazilian online gaming | High | Lawyer engaged; MVP avoids real money entirely |
| Real-time netcode complexity blows up timeline | High | Lockstep over Supabase Realtime (§11). Determinism refactor lands before multiplayer build; input-delay buffer keeps lag handling bounded for MVP |
| Pay-to-win perception kills retention | Medium | Strict separation: real money never buys raw performance |
| Cheating in skill-money matches | Medium | MVP uses fake currency — low cheat incentive. Deterministic engine keeps full replay validation available post-MVP when real money lands |
| Car-wagering economy (post-MVP) creates grief / value-loss disputes | Medium | Multi-step confirmation flow, minimum value floor, anti-grief cooldowns; legal review on classification change |
| Asset production bottleneck (6 designed biomes) | Medium | Ship MVP with 1 finished biome; treat others as roadmap |
| Browser performance on low-end Android | Medium | Profile early; ortho camera + flat shading helps |

---

## Appendix A — Glossary

- **Rake:** platform's cut of a wager pot.
- **Skill-gaming:** wagering on outcomes determined by player skill rather than chance — distinct from gambling under most regulatory frameworks.
- **Lockstep netcode:** both clients run the same deterministic simulation from the same inputs, no central authority.
- **Tolerance-based determinism:** physics is reproducible to within a small ε (e.g., 50ms over a 60s race) rather than bit-identical, enabling lockstep + post-MVP replay validation without a fixed-point math rewrite.
