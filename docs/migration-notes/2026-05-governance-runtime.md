# Migration: Governance Runtime + Incident Analyst (2026-05)

**Quando aplicar:** ao sincronizar com upstream após 2026-05-26.
**Para quem:** projetos derivados de `eduoda/agents` que rodam `/update-upstream`.
**Escopo:** novo diretório `.governance/`, hooks Claude Code, duas novas skills.

## O que mudou no boilerplate

1. **Novo diretório `.governance/`** com 4 arquivos versionados:
   - `CORE.md` — regras completas (L2)
   - `MINI.md` — cheat sheet de regras blocking (L1)
   - `SUBAGENT.md` — versão para subagents (L3)
   - `meta.yaml` — metadados + hashes das fontes (auditoria de drift)

2. **Novo `.claude/settings.json`** versionado registrando 5 hooks:
   - `SessionStart` → injeta L2 + health check do sistema
   - `PostCompact` → injeta L2 após compactação
   - `SubagentStart` → injeta L3 em cada subagent spawnado
   - `UserPromptSubmit` → injeta L1 + footer dinâmico (timestamp + alerta)
   - `PostToolUse(Edit|Write|MultiEdit)` → marca `.governance/.dirty` quando fonte de governança é editada

3. **Nova skill `gen-governance-core`** (workflow): regenera os 3 artefatos a partir das fontes (`AGENTS.md`, `INTEGRITY-RULES.md`, `CLAUDE.md`, `docs/PROJECT_SPECS.md`, etc.). Só humano invoca via `/gen-governance-core`.

4. **Nova skill `incident-analyst`** (persona): diagnostica incidentes de governança em conversas, classifica em drift/gap/preference/boilerplate-level, propõe correções sem executar.

5. **Edições em `AGENTS.md`**:
   - Nova seção "Governance Runtime Artifacts"
   - Item 6 em "Mandatory Reading At Task Start" (read `.governance/CORE.md` em providers sem hooks)
   - Inventário de skills expandido
   - Aliases `gen-governance-core=architect` e `incident-analyst=architect`

6. **Edições em `.gitignore`**: ignora `.governance/.dirty` (gerado por hook) e `__pycache__/`.

7. **Documento opt-in `docs/statusline-optional.md`**: snippet para adicionar `[GOV-DIRTY]` no statusline do Claude Code (não-obrigatório).

## Como aplicar no seu projeto derivado

### 1. Rodar `/update-upstream` normalmente

O workflow padrão da skill faz `git merge upstream/main` com resolução de conflitos arquivo-a-arquivo. Os arquivos abaixo merecem atenção especial:

| Arquivo | Política |
|---|---|
| `.governance/*.md`, `.governance/meta.yaml` | **descarte o que veio do upstream**. Esses arquivos contêm a governança DO BOILERPLATE; você vai regenerar a sua no passo 3. |
| `.claude/settings.json` | **merge manual**. Se você já tem hooks customizados, preserve-os e adicione os novos blocos (`SessionStart`, `PostCompact`, `SubagentStart`, `UserPromptSubmit`, `PostToolUse` com matcher `Edit\|Write\|MultiEdit`). |
| `.gitignore` | merge automático tipicamente OK. Garanta que `.governance/.dirty` e `__pycache__/` entraram. |
| `AGENTS.md` | **merge manual**. Adote as novas seções (Governance Runtime Artifacts, item 6 da mandatory reading, novos aliases). Preserve qualquer customização local do seu projeto. |
| `skills/gen-governance-core/`, `skills/incident-analyst/` | **auto-accept**. Skills novas vindas do upstream. |

### 2. Verificar dependências do sistema

Os hooks usam:
- `bash` (sempre presente)
- `python3` ≥ 3.8 com módulo `yaml` (PyYAML)
- `jq` (já requerido pelo boilerplate)

Cheque com:
```bash
python3 -c "import yaml; print(yaml.__version__)" && command -v jq
```

Se faltar PyYAML: `pip install --user pyyaml` ou similar.

### 3. Regenerar `.governance/` a partir das SUAS fontes

**Crítico:** após o merge, o `.governance/CORE.md` que veio do upstream reflete a governança DO BOILERPLATE, não a sua. Rode:

```
/gen-governance-core
```

A skill lê SEU `AGENTS.md`, SEU `INTEGRITY-RULES.md`, SEU `CLAUDE.md`, SEU `docs/PROJECT_SPECS.md` e regenera os 4 arquivos em `.governance/` refletindo o estado do SEU projeto.

Se você não rodar, seus agentes vão receber as regras do boilerplate em vez das suas — comportamento errado mas não bloqueante (todas as regras do boilerplate são razoáveis).

### 4. Validar o sistema

```bash
bash skills/gen-governance-core/scripts/validate-system.sh --deep
```

Espera-se PASS em todas as linhas:
- 5 hooks registrados em `.claude/settings.json`
- 4 arquivos em `.governance/` presentes
- Cada nível abaixo do cap de 10K
- Hashes em `meta.yaml` batem com as fontes atuais

### 5. Reiniciar a sessão do Claude Code

Hooks só carregam em sessão nova. Saia (`/exit` ou Ctrl+D) e reabra o Claude Code. Na nova sessão você deve ver:
- No primeiro turno após boot: contexto carregado com o conteúdo de `.governance/CORE.md` injetado via `SessionStart`
- Em cada prompt seu: bloco `<governance-mini>` no contexto + footer com timestamp na minha resposta

### 6. Statusline (opcional)

Se quiser indicador visual `[GOV-DIRTY]` no seu statusline pessoal, siga `docs/statusline-optional.md`.

## Padrão de uso depois da migração

- **Quando você editar `AGENTS.md`, `INTEGRITY-RULES.md`, `CLAUDE.md`, `docs/PROJECT_SPECS.md`, `docs/decisions.md`, ou `docs/language-policy.md`** → o hook `PostToolUse` cria `.governance/.dirty`. O footer das minhas respostas vai mostrar o alerta. **Rode `/gen-governance-core`** para regenerar.
- **Quando você quiser diagnosticar um comportamento ruim do agente** → invoque `@incident-analyst` com o caminho do `.jsonl` ou descrição em prosa. A persona estrutura o report e propõe correção; você aprova antes de qualquer ação.

## Troubleshooting

**`SessionStart` aparece com "Output too large (>10KB). Preview..."**
Algum nível ultrapassou o cap. Rode `bash skills/gen-governance-core/scripts/validate-size.sh` para identificar e regenere com trim manual no `extraction-prompt.md`.

**`.governance/.dirty` não some**
Verifique se a skill `gen-governance-core` rodou até o fim. O Step 10 explicitamente apaga o marker.

**Hooks não disparam**
Confirme `.claude/settings.json` foi mergeado corretamente. Reinicie a sessão (hooks só carregam em session start).

**Health check reporta drift no `--deep`**
Significa que alguma fonte foi editada mas `.governance/` não foi regenerada. Rode `/gen-governance-core`.

**Codex / outros providers (sem hooks)**
Eles devem ler `.governance/CORE.md` como leitura obrigatória no início da task — está documentado no `AGENTS.md §Mandatory Reading At Task Start` (item 6, "only on providers without Claude Code hooks").
