# HANDOFF — session 7bd4a4a2 (2026-09-21 → 2026-09-22)

Resume point for the next session. Read this file first, then `memory-system/handoff/gohorse-context.md` (accumulated technical context per task) and `memory-system/handoff/gohorse-runbook.md` (how task subagents are dispatched).

## 1. Where we are

> **Update 2026-09-22 12:00:** EP-008-03 (#29) and EP-008-04 (#30) merged. All code for EP-001..EP-008 is on main. Next step: the manager's final UX pass (§4).
> **Update 2026-09-22 13:40:** manager UX feedback round merged: EP-008-06 garage parts panel redesign (#32), EP-008-07 race HUD standardization + speed/turbo gauges (#33), EP-008-08 swap 1.6/2.4 engine sounds (#31). Next step: final UX pass (§4, items 13–15 added).
> **Update 2026-09-22 19:25:** second manager UX round merged: EP-008-09 lobby CORRIDA/GARAGEM + garage carousel (#35), EP-008-10 HUD 1º/2º + 1 s countdown (#34), EP-008-11 optional ghost bot (#39), EP-008-12 hazard warning signs (#36), EP-008-13 free-roam 5000 m (#40), EP-008-14 configurable E2E_PORT (#37), plus #38 (hazard-sign spec creep fix). All EP-008 code is on main; no open PRs. Next: the final UX pass (§4, items 13–21).

- Bootstrap gate: `READY_FOR_EXECUTION`. Epics EP-001..EP-008 in `docs/EPICOS.md`.
- main at `bd6e74e` (after PR #28). All work below is merged unless marked otherwise.
- **All code for EP-001..EP-007 is merged.** No epic is `DONE` yet: the manager tests UX of all epics once, at the end (see §4), and only then epics are marked DONE and the single manual production deploy happens.

| Epic | Code | Notes |
|---|---|---|
| EP-001 e2e infra | merged | Playwright, `npm test` (9 specs, ~3–5 min, workers 2, real GPU via `--use-angle=d3d11`) |
| EP-002 stage engine | merged | `src/stages/*.stage.js` data-driven, `?stage=<id>` shortcut |
| EP-003 configurable physics | merged | `createCarPhysics`, auto-right 1.5 s, tires/gearbox presets |
| EP-004 bot AI | merged | real bot car, race-bar only |
| EP-005 content | merged | Mata Atlântica + Cerrado |
| EP-006 screens/garage/progress | merged | full flow Lobby→Garagem→Mapa→Corrida→Resultado; profile `race_profile_v1` |
| EP-007 engine sound | merged | RPM model + engine-order synthesis, lower pitch |
| EP-008 short races / long gears / parts | merged | all 5 tasks merged (#26–#30) |

## 2. EP-008 status (order: 01, 02 → 05 → 03 → 04)

- EP-008-01 races 50% shorter — merged (#27). Mata 1400 m, Cerrado 1360 m.
- EP-008-02 longer gears (sound) — merged (#26). finalDrive 3.3.
- EP-008-05 turbo recharge fix + bot recalibrated for humans — merged (#28).
- **EP-008-03 engines/chassis/tanks — PR #29 OPEN.** Its subagent was still finishing when this session ended. Next session: check `gh pr view 29` and the task file `memory-system/tasks/TASK-kaleugit-EP-008-03.md`; if the governance check-run on the final head is `success` and the task report/validation note exist, merge it (see §5); if incomplete, finish it from worktree `/c/Users/kaleu/dev/wt-TASK-kaleugit-EP-008-03-implement` (branch `TASK-kaleugit-EP-008-03-implement`).
- **EP-008-04 garage/profile/wiring for the new parts — PENDING** (depends on 03). This is what makes motor/chassi/tanque selectable in the garage (the manager asked how to access them).

## 3. Rules agreed with the manager (binding)

- **No automatic deploys.** `vercel.json` has `git.deploymentEnabled: false`. One manual production deploy only when everything is done and UX-approved. Never run `vercel` deploy commands otherwise. Never touch other Vercel projects of the team (`kaleu-dev-site` is the manager's portfolio).
- **Merge authority (ADR-020 + amendment):** the orchestrator may merge PRs of this cycle's epics **only when the `governance` check-run on the final head SHA is `success`** (duplicate `skipped` runs are normal; a `cancelled` run → rerun once). Subagents do not merge; the orchestrator does. Allow rule `gh pr merge:*` is configured locally.
- **CI/CD changes need explicit manager authorization per action (ADR-016)** — show the PT-BR warning and stop.
- **Speed over ceremony:** park tooling bugs as tech-debt, batch human questions.
- Telemetry disabled (ADR-019). CodeRabbit suspended on GitHub by the manager.
- `.claude/settings.local.json` has an uncommitted local change (the permission rule) — never commit it.

## 4. Final UX test checklist (manager, one pass, at the end)

Open `jogar.bat` (dev server at http://localhost:5173). For each item answer OK / ajustar.

1. **Lobby → Garagem → Mapa:** JOGAR opens the garage; changing color/tire recolors the lobby car live; Confirmar opens the map; Cerrado locked until Mata is won.
2. **Mata Atlântica (~1400 m, ~40–45 s):** track, mud, background, jumps look right; driving feel; mud slows the car.
3. **Capotar:** no race restart; upside-down on the ground → rights itself in ~1.5 s in place (instant pose change, no animation).
4. **Bot:** appears only on the race bar; beatable by holding ↑ + Espaço and driving well (sim: you ~43 s vs bot ~46 s); "BOT CHEGOU — DERROTA" notice if it wins.
5. **Resultado:** your time, bot time, delta like `+1.34s`; buttons REVANCHE / MAPA / GARAGEM work.
6. **Cerrado (after winning Mata):** red earth, chapada jump, loose sand slows Estrada tires more than Off-road; slightly harder bot.
7. **Pneus e câmbio:** differences are perceptible (Off-road better in sand; Curta accelerates more, Longa faster top speed); Misto + Padrão = original feel.
8. **Som do motor:** realistic shifts, lower tone, longer gears (fewer shifts); turbo hiss + blow-off on release.
9. **Turbo:** holding Espaço is the best way to use it; it recharges while held once empty and re-ignites at ~25%.
10. **Motor / Chassi / Tanque (after EP-008-04):** 3 options each in the garage, perceptible trade-offs, engine choice slightly changes the sound.
11. **Mobile landscape** (optional): garage/map/result fit with the touch controls.
12. **Estágio de teste:** http://localhost:5173/?stage=teste-plano (short flat track with sand/mud zones).
13. **Garagem nova (EP-008-06):** two docks (left: MOTOR/CÂMBIO/PNEU/DESEMPENHO; right: CHASSI/TANQUE/COR/CONFIRMAR), stat bars with hover preview, no overlap with the car or TELA CHEIA (desktop and phone); car rotates only while dragging.
14. **HUD da corrida (EP-008-07):** same font/sizes as the garage; semi-transparent speed and turbo gauges (turbo arc length = tank, red RECARGA lockout); FREIO/TURBO/ACEL touch pads; readable at 640x360.
15. **Som 1.6 ↔ 2.4 (EP-008-08):** the 2.4 now has the brighter, higher-revving sound the manager liked on the 1.6; the 1.6 is deeper.
16. **Lobby (EP-008-09):** two buttons — CORRIDA (→ map → race with the saved garage) and GARAGEM (→ garage → PRONTO returns to the lobby); ← LOBBY on the map returns to the lobby.
17. **Garagem em carrossel (EP-008-09):** one part per card (MOTOR, CÂMBIO, PNEU, CHASSI, TANQUE, COR), arrows/←→/swipe, "n/6" + pips, compact DESEMPENHO, PRONTO.
18. **Posição e largada (EP-008-10):** race bar shows [1º] VOCÊ … BOT [2º], leader in gold, flipping when the bot passes; only the player's DIST in the HUD; countdown is 1 s ("1" → "VAI!").
19. **Placas de aviso (EP-008-12):** a yellow "!" sign 20 m before every mud/sand strip, on both stages; readable at speed, no collision.
20. **Bot fantasma (EP-008-11):** toggle BOT FANTASMA on the map (off by default); when on, the bot's car is drawn translucent cold-blue on track, no collision.
21. **Modo livre (EP-008-13):** MODO LIVRE card on the map → 5000 m terrain, no bot, no win/defeat, nothing written to progress; FIM DO PERCURSO screen with DE NOVO / VOLTAR; garage parts apply.

Tuning knobs if something needs adjusting: `src/sound.js` (ORDERS, levels, time constants), `src/audio/engine-model.js` (ratios, finalDrive, shift RPM), `src/bot/bot-driver.js` (TUNING), `src/stages/*.stage.js` (bot.difficulty, layout), `src/parts/presets.js` (parts), `src/car.js` (TIRE_LOOKS).

After UX OK: mark each epic `Status: DONE` in `docs/EPICOS.md` (ep-check final GO), then do the single manual production deploy (`vercel --prod` from main, with the manager's go-ahead).

## 5. How to continue (orchestration)

- Executor: `skills/gohorse-light` (sequential subagents). Dispatch each task with a short prompt pointing to `memory-system/handoff/gohorse-runbook.md` and the task file; append each task's `KEY_CONTEXT_FOR_NEXT_TASKS` to `memory-system/handoff/gohorse-context.md`.
- Merge helper logic (was a scratch script): for PR `<n>`, read the head SHA (`gh pr view <n> --json headRefOid`), query `gh api repos/Kaleugit/race-game/commits/<sha>/check-runs` for the non-skipped `governance` run; merge with `gh pr merge <n> --merge` only on `completed:success`; on `cancelled` rerun once (`gh run rerun <id>`); then `git pull --rebase --autostash origin main` in the primary repo and remove the task worktree + local branch.
- If a PR conflicts on `docs/INDEX-API.md`, merge `origin/main` into the task branch and regenerate it with `./skills/gen-api-index/scripts/gen-api-index.sh`.

## 6. Environment gotchas (Windows 11 ARM64 / Git Bash)

- `./scripts/validate-all.sh` cannot pass locally (TD-001 telemetry concurrency, TD-002 skill links are junctions). Use `./scripts/validate-changed.sh` + `npm run test:sim` + `npm test`; CI runs validate-all.
- Headless Chromium must use the GPU (`--use-angle=d3d11`, already in `playwright.config.js`); e2e uses port 4173 strictPort — two worktrees running `npm test` at once collide.
- `gh api` endpoints: omit the leading slash in Git Bash; `vercel api` needs `MSYS_NO_PATHCONV=1`.
- Git core.longpaths is enabled (a saved-webpage folder has very long file names).

## 7. Open items

- Final UX pass (§4) → epics DONE → single manual production deploy.
- TD-001, TD-002 (see `memory-system/tech-debt.md`).
- Upstream (agentes-oda boilerplate) issues/PRs recommended by the architect reviews (Windows fixes, telemetry opt-out, validate-epic-ids empty list, CI skill links) — needs the boilerplate repo URL (no `upstream` remote configured).
- Vercel: team daily deployment limit was hit on 2026-09-21 (~21:30); resets within 24 h. Storage cleaned to 1 deployment.
