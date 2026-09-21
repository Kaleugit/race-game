# Project Context

Quick context file for the derived project.
Keep it short and updated.
Bootstrap source: `BRIEFING.md`.

## Minimum Bootstrap (Mandatory)
- [x] `Current Project` has Name/Type/Status filled
- [x] `Current Project -> Last Updated` has a real date
- [x] At least one goal in `Project Goals`
- [x] At least one area in `Active Development Areas`

## Current Project
**Name:** race-game
**Type:** Browser game (1v1 side-scroll arcade racer, static Vite build)
**Status:** READY_FOR_EXECUTION — prototype exists (lobby, one track, fixed-time ghost opponent)
**Last Updated:** 2026-09-21

## Project Goals
1. Turn the prototype into a complete single-player game against an AI bot (current cycle).
2. Data-driven stages (biomes) with sequential unlock persisted in localStorage.
3. Garage with color, tires, and gearbox presets that change car behavior as trade-offs (no pay-to-win).
4. Ship two stages: polished Mata Atlântica and new Cerrado, 60–90s races each.
5. Long term (not this cycle): PvP 1v1 skill-gaming with wagers — see `docs/briefing.md`.

## Current Sprint/Phase
**Sprint:** EP-001
**Focus:** e2e test infrastructure (EP-001), then EP-002 stage engine
**Deadline:** TBD

## Tech Stack Summary
- **Frontend:** Three.js 0.160 + Vite 5, vanilla ES modules, procedural canvas textures, Web Audio API
- **Backend:** None this cycle (Supabase planned for multiplayer MVP)
- **Database:** None — localStorage for progress and garage
- **Infrastructure:** Static build on Vercel (project `race-game`, production branch `main`)

## Active Development Areas
1. Stage engine: extract track/hazards from `src/main.js` into data under `src/stages/`.
2. Configurable car physics (tires, gearbox) and auto-righting.
3. Bot AI driving the same physics via simulated inputs.
4. Screen flow, garage, map, result screen, and progression.
5. Stage content: Mata Atlântica polish and Cerrado.

## Known Issues
- `src/main.js` (~1,100 lines) mixes race loop, physics, HUD, and bot; refactor risk to current driving feel.
- Opponent is a fixed-time ghost (`BOT_FINISH_TIME = 26`), far below the 60–90s target race length.
- No e2e tooling installed yet (blocks functional acceptance evidence; see `docs/PREREQUISITES.md`).

## Important Conventions
- **Branch naming:** TASK-<github-login>-<task-key>-[role|workstream]
- **Commit format:** type(task-<github-login>-<task-key>[-<scope>]): description
- **Source layout:** application source code under `src/` (see `AGENTS.md`)
- **Visual style:** low-poly flat-shaded, orthographic camera, x-axis world, monospace HUD with PT-BR text

## Role/Skill Assignments
- **Architect (`skills/architect`)**: architecture definition/alignment and architecture documentation
- **Implementation (`skills/implement`)**: end-to-end implementation orchestration in the development workstream
- **Frontend (`skills/frontend`)**: frontend/UI and client integrations
- **Backend (`skills/backend`)**: backend, APIs, and application data
- **Testing (`skills/testing`)**: testing strategy and validation
- **Security (`skills/security`)**: security review and mitigation
- **DevOps (`skills/devops`)**: pipeline, deployment, and operations
- **Housekeeping (`skills/housekeeping`)**: safe artifact cleanup and organization
- **Game dev (`race-game-dev` agent, `dev-car` skill)**: track, physics, car visuals, HUD in the established style

---

*Last Updated: 2026-09-21*
*Note: Keep this file concise (under 10KB). Move details to docs/*
