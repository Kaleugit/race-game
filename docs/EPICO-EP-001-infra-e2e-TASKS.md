# EPICO-EP-001-infra-e2e-TASKS

## Metadata
- Epic ID: EP-001
- Epic Title: Infraestrutura de testes e2e
- Last Updated: 2026-09-21
- Owner: Architect
- Status: APPROVED

## Epic Context
- Objective: Deixar o projeto com um runner e2e de navegador que exercita o jogo real e roda com um único comando.
- Scope Boundaries: ferramental de teste + smoke do fluxo atual; sem gameplay, sem integração no CI (ADR-016).
- Key Dependencies: nenhuma.

## Approved Task List

### Task 01 - Playwright + `npm test` + smoke do fluxo atual
- Task ID: TASK-kaleugit-EP-001-01
- Status: PENDING
- Priority: 1
- Execution Mode: Standard
- Domain: Testes (ferramental)
- Description:
  - Adicionar `@playwright/test` como devDependency e baixar Chromium (`npx playwright install chromium`).
  - Criar `playwright.config.js` com `webServer` rodando `npm run build && npm run preview` (porta fixa) e `baseURL` correspondente.
  - Adicionar script `"test": "playwright test"` em `package.json`.
  - Criar `tests/e2e/smoke.spec.js`: abre `/`, clica `#lobby-play`, espera `#countdown-overlay` sumir, segura `ArrowUp`, espera `#end-overlay` visível com `#end-result` em `VITÓRIA` ou `DERROTA`; falha se houver `pageerror` ou `console.error`.
  - Usar só os IDs já existentes em `index.html`; nenhum gancho novo no código de produção.
  - Adicionar `test-results/` e `playwright-report/` ao `.gitignore`.
- Depends On: None
- Canonical File: memory-system/tasks/TASK-kaleugit-EP-001-01.md
- Suggested Branch: TASK-kaleugit-EP-001-01-implement
- Input Context (max 5 files):
  - package.json
  - vite.config.js
  - index.html
  - src/main.js (fluxo lobby → contagem → fim: `startCountdown`, `showEndScreen`)
- Done Criteria:
  - `npm test` sai com código 0 e reporta 1 teste passando.
  - `tests/e2e/smoke.spec.js` existe e falha se `#end-overlay` não aparecer em 60s.
  - `docs/PREREQUISITES.md` marca o item de e2e como `[x]`.
- Escalation Conditions:
  - To human: Playwright/Chromium não roda em Windows ARM64 após instalação padrão.
  - To orchestrator: o smoke exigir mudança em `src/` (fora do escopo do épico).

## Planning Notes
- Default policy: create `planning/report` on demand as tasks move to execution.
- Each task must be self-contained: the canonical task file + listed input context must be sufficient for execution without implicit knowledge from prior tasks.

## Decisoes Autonomas
- DA-001: Épico em uma task só — Criterio: CDC-002 — Racional: escopo pequeno e de um domínio; `index.html` já expõe IDs estáveis, então não há task separada de ganchos de teste.
- DA-002: `webServer` usa build + preview em vez de `vite dev` — Criterio: CDC-001 — Racional: testa o bundle que vai para a Vercel, e não o dev server.
