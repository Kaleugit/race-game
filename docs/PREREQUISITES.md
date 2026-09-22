# PREREQUISITES — race-game

Itens que o humano precisa resolver antes de execução automatizada.
Revisado em 2026-09-21 pelo `skills/bootstrap`.

## Ambiente
- [x] Node.js e npm disponíveis (verificado: Node v24.15.0, npm 11.12.1).
- [x] `npm install && npm run build` funciona (verificado em 2026-09-21; aviso de chunk > 500 kB é conhecido, não bloqueia).
- [x] Ferramenta de e2e no navegador: `@playwright/test` 1.63 + Chromium headless instalados (EP-001, 2026-09-21); `npm test` roda a suíte contra o build de produção.

## Acessos e credenciais
- [x] GitHub CLI autenticado (`gh auth status`: conta `Kaleugit`); remote `origin` = `Kaleugit/race-game`.
- [x] Vercel CLI autenticado; projeto `race-game` ligado ao repo, produção em `main`.
- [x] Vercel constrói só o `main` (Ignored Build Step: `if [ "$VERCEL_GIT_COMMIT_REF" = "main" ]; then exit 1; else exit 0; fi`), aplicado em 2026-09-21 com autorização do gestor (ADR-016); substitui a regra anterior que ignorava só o branch `telemetry`. Previews de branches de task desligados — o e2e local (`npm test`) cobre o build.
- N/A — Supabase, contas e pagamentos: fora de escopo neste ciclo.

## Infraestrutura
- [x] Deploy estático Vite na Vercel, sem backend.
- N/A — banco de dados: persistência só em `localStorage`.

## Dependências externas
- N/A — nenhuma API externa neste ciclo; runtime depende só de `three`.

## Assets de design
- [x] Fundo do Cerrado presente em `public/img/cerrado.jpg`.
- [x] Fundo da Mata Atlântica presente em `public/img/` (`misty-tropical-jungle.jpg` e variações).
- [ ] Confirmar licença/origem das imagens de fundo e das músicas em `public/music/` antes de qualquer lançamento público. Não bloqueia desenvolvimento. Dono: Kaleu.

## Conhecimento de domínio
- [ ] Tempo de referência de um "jogador habilidoso" por estágio (usado em CA-004 para calibrar o bot) — pode ser medido pelo agente com input de referência e validado pelo Kaleu no teste de UX. Não bloqueia o planejamento.
  - Mata Atlântica (EP-005-01, medido pelo agente com `tests/sim/reference-driver.js` + `DEFAULT_PARTS`, dt 1/60): **73,7 s** (pista de 2600 m). Bot `difficulty` 0,5: mediana 79,4 s (76,9–81,6 s, seeds 1..10); só `ArrowUp`: 94,9 s. **Pendente de validação do Kaleu** no teste de UX do EP-005.
- [ ] Dispositivo Android de entrada de referência para RNF-002 (ver DA-004). Não bloqueia o planejamento.

## Ferramentas de governança
- [x] `git` e `bash` disponíveis (Git Bash no Windows).
- [x] PyYAML instalado para hooks de governança (PyYAML 6.0.3, instalado em 2026-09-21).
- N/A — GNU coreutils/gnu-sed no macOS: ambiente é Windows.
