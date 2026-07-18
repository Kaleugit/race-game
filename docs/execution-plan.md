# Race Game — MVP Execution Plan

**Status:** Draft v0.1
**Target:** Closed beta with 100 invited testers
**Estimated duration:** ~14 weeks from kickoff
**Companion doc:** [briefing.md](./briefing.md)

---

## TL;DR

Four phases over ~14 weeks:

1. **Phase 0 — Foundation** (1 week): tooling, decisions, infra.
2. **Phase 1 — Determinism + single-player polish** (4 weeks).
3. **Phase 2 — Multiplayer + economy** (6 weeks).
4. **Phase 3 — Closed beta** (3 weeks).

**Critical path:** Phase 0 decisions → determinism refactor → match handshake → lockstep netcode → wager flow → beta launch.

**Two engineering principles drive the schedule:**
- Determinism lands **before** any multiplayer code so nothing is built on a non-deterministic foundation.
- Designer biome work runs in **parallel** with engineering so Atlantic Forest is locked by the time multiplayer launches.

## Workstreams

| Workstream | Owner | Span |
|---|---|---|
| Engineering — physics, netcode, backend, UI | Eng | Phase 0–3 |
| Design / art — Atlantic Forest, hazards, car visuals | Designer | Phase 1 wk 1 → Phase 2 wk 4 |
| Product / ops — telemetry, tester recruitment, balance, legal coordination | Product | Phase 0–3 (continuous) |

---

## Phase 0 — Foundation (1 week)

**Goal:** Decisions and tooling locked down so Phase 1 isn't blocked.

### Deliverables

- Supabase project provisioned (auth, DB, Realtime, edge functions, env vars wired).
- CI pipeline: lint, build, deploy-preview-on-PR.
- Hosting target chosen and serving (Vercel / Netlify / Cloudflare Pages).
- Error tracking + product telemetry tooling installed (e.g., Sentry + PostHog).
- Code style tooling (ESLint or Biome, format-on-save).
- Initial DB migrations applied: `users`, `cars`, `parts_owned`, `matches`, `wagers`, `currency_ledger`.

### Decisions to lock in

| Decision | Why blocking |
|---|---|
| **Designer pipeline (Q9)** — Blender → glTF? Pixel-art atlases? Extend procedural `textures.js`? | Designer can't start without this. |
| **Browser support matrix** — desktop Chrome/Edge/Firefox + mobile Safari/Chrome floors. | Drives determinism CI matrix and perf targets. |
| **Telemetry tool** — Sentry + PostHog vs. Supabase logs vs. other. | Shapes Phase 0 wiring; can't bolt on later cleanly. |
| **Module layout** — confirm `src/physics/` for the deterministic engine. | Determinism refactor starts Phase 1 Week 1. |
| **Telemetry event list (v1)** — race_start, race_end, finish_time, disconnect, wager_placed, wager_settled, shop_purchase. | Schema before instrumentation. |
| **Wallet/ledger schema** — fields on `currency_ledger`, transaction types, reconciliation rules. | Phase 1 needs to write to it. |

### Exit criteria

- New contributor: `npm install && npm run dev` works on a clean clone.
- PR opens → preview URL deploys automatically.
- Designer has written confirmation of asset format and a sample round-trip done.
- Supabase project has a working signup → row in `users`.

---

## Phase 1 — Determinism + single-player polish (4 weeks)

### Engineering track A — Determinism refactor (weeks 1–2)

**Goal:** Physics module produces reproducible output across machines within tolerance ε (~50ms over a 60s race).

Tasks:

1. Extract physics into `src/physics/` — no DOM, no Three.js dependencies. Pure math + state in/out.
2. Replace variable-dt loop (`main.js` ~line 1066–1068) with fixed-timestep accumulator at 60Hz.
3. Decouple render from physics; interpolate between physics ticks for visuals.
4. Audit every `Math.random()` call. Segregate visual (kept as-is) vs gameplay (replaced with mulberry32 seeded from match seed).
5. Quantize analog inputs (tilt) to int −100..100. Capture inputs at tick boundaries, not on DOM events.
6. CI determinism test: run an identical input stream 100× across Chrome / Firefox / Safari, assert finish-time within ε. Run on every PR.
7. Build a tiny replay dev-tool: feed input stream → deterministic playback.

**Exit criteria:**
- CI determinism test green on all support-matrix browsers.
- Single-player feel matches or exceeds current prototype (subjective playtest).
- Replay dev-tool reproduces a known race exactly.

### Engineering track B — Garage + persistence (weeks 3–4)

Tasks:
1. Supabase Auth (email + Google) with 18+ gate copy on signup (per §13 Q10).
2. Garage screen: own cars list, equipped car, equipped parts.
3. Shop screen skeleton: game-money car purchase, upgrade tier-1 purchase.
4. Loadout commit: chosen car + parts get serialized into the match handshake payload.
5. Free starter car (Besouro) granted on signup; small starting game-money balance.
6. HUD currency display.

**Exit criteria:**
- New signup → starter car → can drive Atlantic Forest solo.
- Shop purchase debits ledger atomically and adds part to inventory.
- Refresh persists state correctly.

### Design track — Atlantic Forest final (weeks 1–4, parallel)

Tasks:
1. First asset round-trip per Q9 pipeline (smoke test).
2. Final palette, skybox, ambient audio bed.
3. Hazard placement: ramps, fallen trees, slippery mud, fog zones (per §5).
4. Track length tuned to 60–90s race time.
5. Visual differentiation pass on starter car (Besouro) + 1 unlockable.
6. Designer pipeline doc — so future biomes don't re-discover the workflow.

**Exit criteria:**
- Stage feels distinctly Brazilian, not generic forest.
- Typical race finishes in the 60–90s window.
- Pipeline doc lets a new designer ship a biome without engineering back-and-forth.

### Phase 1 definition of done

Solo player on Atlantic Forest, deterministic engine, garage with starter + 1 unlockable, basic shop, currency ledger live, CI green.

### Risks

| Risk | Mitigation |
|---|---|
| Determinism refactor overruns 2 weeks (cross-browser float drift hunting) | Choose tolerance-based determinism (already decided §11); skip fixed-point math; widen ε if tests fail rather than rewriting. |
| Designer pipeline needs tooling not budgeted | Phase 0 sample round-trip surfaces this before Phase 1 starts. |
| Single-player feel regresses during refactor | Lock a "feel benchmark" run before refactor; subjective playtest after each major change. |

---

## Phase 2 — Multiplayer + economy (6 weeks)

### Week 1 — Match handshake

Tasks:
1. `match_create` edge function: generates match seed, accepts both loadouts, returns match_id + seed.
2. `match_settle` edge function: receives finish times, decides winner, debits/credits ledger, writes `matches` row.
3. Auth enforced on both functions. Wager debit happens before clients tick.
4. Idempotency on settlement (a re-submit must not double-credit).

**Exit criteria:** two dev clients can call `match_create`, run a fake race, call `match_settle`, see ledger update once.

### Weeks 2–3 — Lockstep netcode

Tasks:
1. Supabase Realtime channel per match, scoped by `match_id`.
2. Input frame protocol: `{tick, p1_inputs, p2_inputs}`, quantized, tens of bytes.
3. Input delay buffer = 3 frames; both clients pause-tick on missing inputs.
4. Wire input rate: start at 30 Hz, instrument bandwidth, decide final.
5. Reconnect handling: rejoin within grace period rehydrates from input log.
6. Disconnect-as-loss after 10s grace.

**Exit criteria:** two real clients on different networks complete a race with finish times identical within ε.

### Weeks 3–4 — Race flow + HUD

Tasks:
1. Mini-map top-right: round-track abstraction with two dots (per §5).
2. Race start countdown; finish screen; settlement display.
3. Opponent visualization in own viewport (split-lane visual — design call between split lane vs. ghost overlay).
4. Crash / forfeit handling end-to-end.

### Weeks 4–5 — Wager + matchmaking

Tasks:
1. Wager bracket UI (10, 50, 100, 500 game-money).
2. Open queue matchmaking by skill + wager bracket. Simple algorithm; ELO post-MVP.
3. Private room: share link → both join → match starts.
4. Wallet UI in main menu.
5. Track entry fees gating higher-tier tracks (only Atlantic Forest available in MVP, but the gate code lands now).

### Weeks 5–6 — Polish + integration

Tasks:
1. Telemetry events flowing end-to-end; dashboards built.
2. Bug bash + perf profiling (especially low-end Android browsers).
3. Privacy / cookie / 18+ gate copy reviewed by lawyer.
4. Soak test: 50-match continuous play to catch leaks/desyncs.

### Phase 2 definition of done

Two players from different networks can: sign in → top up wallet → matchmake on Atlantic Forest at any wager bracket → race lockstep → finish with identical results → wager settled correctly → repeat. Telemetry covers the full funnel.

### Risks

| Risk | Mitigation |
|---|---|
| Lockstep breaks under real-network jitter / packet loss | Input delay buffer absorbs typical jitter; if it fails, widen buffer before considering rollback (rollback is post-MVP). |
| Edge function cold starts hurt match-create latency | Warm-up cron or move match_create to a long-running endpoint. |
| Supabase Realtime quota hit in stress tests | Profile early in Week 2; budget paid tier upgrade if needed. |
| Settlement race conditions (double-credit) | Idempotency keys on settle; DB constraint on (match_id, settled) uniqueness. |

---

## Phase 3 — Closed beta (3 weeks)

### Week 1 — Internal alpha (~5–10 testers)

- Team-only play sessions.
- Telemetry validation: events firing correctly, no PII leaks, dashboards trustworthy.
- Critical bug list compiled and prioritized.
- First playtest of car/upgrade economy balance.

### Week 2 — Soft beta (~20 trusted external testers)

- Friends, designer, lawyer, recruited testers.
- Daily bug triage.
- Second balance pass.
- Tester feedback survey instrumented.

### Week 3 — Closed beta (100 invited testers)

- Invite-only access via referral codes.
- Recruit via existing channels (no paid acquisition).
- Daily metrics review against MVP success criteria.
- Build is locked: only critical fixes deploy.

### Phase 3 definition of done — MVP success criteria (briefing §4)

- 100 testers can find a match within 30s and finish without errors.
- Race desync rate < 2% across the test sample.
- Average session length ≥ 5 races.
- Qualitative survey: testers describe matches as "fair" and "skill-based".

If any criterion misses: document the gap, fix, re-run for another week before declaring MVP done.

---

## Critical path

```
Phase 0 decisions
       ↓
Determinism refactor (P1 wk 1–2)
       ↓
Match handshake (P2 wk 1)
       ↓
Lockstep netcode (P2 wk 2–3)
       ↓
Wager flow (P2 wk 4–5)
       ↓
Closed beta launch (P3 wk 3)
```

The Atlantic Forest design track must finish by **Phase 2 Week 5** so closed beta plays a stable, tuned biome. If it slips, slip the beta — don't ship a half-tuned track.

## Cross-cutting workstreams

### Telemetry (always-on from Phase 1 Week 3)

- Events: signup, race_start, race_end, finish_time, disconnect, wager_placed, wager_settled, shop_purchase.
- Dashboards by Phase 2 Week 5 — DAU, match completion rate, desync rate, ARPDAU equivalent (in fake currency), funnel from signup → first race → first wager.

### Legal (continuous)

- Lawyer reviews wager UX, 18+ gate copy, ToS, privacy policy **before Phase 3 starts**.
- Q10 deliverable: 18+ gate copy + click-through is in Phase 1.
- Pre-MVP regulatory check on car-trading and car-wagering features (post-MVP scope, but classification matters).

### Designer pipeline (Phase 1+)

- First asset round-trip in Phase 1 Week 1 (smoke test).
- Pipeline doc by Phase 1 Week 2 so post-MVP biomes follow it.

---

## Out of scope for MVP execution

- All biomes except Atlantic Forest (Cerrado, Caatinga, Amazônia, Chapada Diamantina, Chapada dos Veadeiros).
- All cars except starter (Besouro) + 1 unlockable.
- Upgrade tiers 2–4.
- Real-money rails (Pix, credit card, KYC, payouts).
- Tournaments, leaderboards, friends, chat, voice.
- Cosmetic skin shop (revenue stream comes online post-MVP).
- Anti-cheat enforcement infra (deterministic engine ready; validation deferred).
- Car-as-stake wagering.
- Player-to-player car trading.
- Native mobile apps.
- Rollback netcode.

---

## Open items that could block execution

These need resolution before or during Phase 0:

| # | Item | Owner | Latest deadline |
|---|---|---|---|
| 1 | Designer pipeline (briefing Q9) — asset format and tooling | Designer + Eng | Phase 0 end |
| 2 | Telemetry tool selection | Product | Phase 0 end |
| 3 | Browser support floor | Eng | Phase 0 end |
| 4 | Tester recruitment plan — where do the 100 closed-beta testers come from? | Product | Phase 2 Week 4 |
| 5 | Legal pre-review schedule — when does the lawyer review wager UX, gate copy, ToS? | Product | Phase 2 Week 4 |
| 6 | Car/upgrade pricing in game-money — first-pass numbers for playtesting | Product + Eng | Phase 1 Week 3 |
| 7 | Wager bracket numbers (10, 50, 100, 500) — confirm or revise | Product | Phase 2 Week 4 |
| 8 | Hazard mix and intensity for Atlantic Forest | Designer | Phase 1 Week 3 |

---

## Cadence

- **Daily:** stand-up (or async update) covering blocker list + critical-path status.
- **Weekly:** burn-down review against this plan; decide if any phase is at risk; update phase exit criteria status.
- **Phase boundary:** retro on what slipped, what to change for next phase.
