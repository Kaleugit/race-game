# PREREQUISITES — race-game

Itens que o humano precisa resolver antes de execução automatizada.
Revisado em 2026-09-21 pelo `skills/bootstrap`.

## Ambiente
- [x] Node.js e npm disponíveis (verificado: Node v24.15.0, npm 11.12.1).
- [x] `npm install && npm run build` funciona (verificado em 2026-09-21; aviso de chunk > 500 kB é conhecido, não bloqueia).
- [ ] Ferramenta de e2e no navegador (ex.: Playwright) instalada e com navegador baixado. **Bloqueante** para CA-001/CA-002/CA-007: sem e2e esses critérios ficam `FAIL`, nunca são delegados ao humano. Dependência de dev aprovada pelo Kaleu em 2026-09-21; instalação (`npm i -D @playwright/test && npx playwright install chromium`) acontece na primeira task de épico que precisar de e2e.

## Acessos e credenciais
- [x] GitHub CLI autenticado (`gh auth status`: conta `Kaleugit`); remote `origin` = `Kaleugit/race-game`.
- [x] Vercel CLI autenticado; projeto `race-game` ligado ao repo, produção em `main`.
- [x] Vercel ignora builds do branch órfão `telemetry` (Ignored Build Step configurado em 2026-09-21 com autorização do gestor).
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
- [ ] Dispositivo Android de entrada de referência para RNF-002 (ver DA-004). Não bloqueia o planejamento.

## Ferramentas de governança
- [x] `git` e `bash` disponíveis (Git Bash no Windows).
- [x] PyYAML instalado para hooks de governança (PyYAML 6.0.3, instalado em 2026-09-21).
- N/A — GNU coreutils/gnu-sed no macOS: ambiente é Windows.
