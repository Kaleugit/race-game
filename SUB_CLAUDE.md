# SUB_CLAUDE.md — Claude Code como Ferramenta de Orquestração

Relatório técnico sobre as formas de usar o Claude Code CLI como worker controlado por outro agente ou skill orquestradora.

**Data**: 2026-03-24
**Versão Claude Code analisada**: 2.1.x
**Binário**: ELF 64-bit nativo (distribuído via npm, não é módulo Node.js importável)

---

## 1. Interfaces Disponíveis

O Claude Code expõe **quatro interfaces** para controle externo:

| Interface | Tipo | Bidirecional | Tempo Real | Intervenção Humana |
|-----------|------|:---:|:---:|:---:|
| `-p` one-shot | Subprocess | Não | Não | Via resume |
| `-p` + `stream-json` | Subprocess streaming | Sim | Sim | Via resume |
| tmux + modo interativo | Terminal virtual | Via `send-keys` | Sim | Attach direto |
| `claude mcp serve` | MCP server | Sim | Sim | Não |

---

## 2. `-p` One-Shot (Subprocess Simples)

### Como funciona

```bash
claude -p "implementar feature X" \
  --session-id $UUID \
  --permission-mode auto \
  --output-format json
```

O orquestrador spawna um processo, recebe o resultado completo ao final, e o processo morre.

### Continuação de sessão

```bash
# Continua a mesma sessão com novo prompt
claude -p "agora rode os testes" \
  --session-id $UUID \
  -c
```

Cada invocação restaura o histórico completo da sessão a partir do `.jsonl` persistido em `~/.claude/projects/<path>/<session-uuid>.jsonl`.

### Prós
- Simples de implementar (spawn + wait + parse stdout)
- Output estruturado (`json` ou `stream-json`)
- Controle de budget (`--max-budget-usd`)
- Controle de turnos (`--max-turns`)
- Sem dependência de tmux

### Contras
- Sem visibilidade em tempo real para o humano
- Cada invocação recarrega todo o histórico da sessão (overhead crescente)
- Widgets interativos (AskUserQuestion) não funcionam — requer `--permission-mode auto` ou similar

---

## 3. `-p` + `stream-json` Bidirecional (Subprocess Streaming)

### Como funciona

```bash
claude -p \
  --input-format stream-json \
  --output-format stream-json \
  --session-id $UUID \
  --permission-mode auto \
  --include-partial-messages
```

- **stdin**: o orquestrador envia prompts como objetos NDJSON
- **stdout**: recebe eventos em tempo real (tool calls, respostas parciais, resultados)
- Processo fica vivo durante toda a interação

### Flags complementares

| Flag | Função |
|------|--------|
| `--include-partial-messages` | Emite chunks parciais conforme são gerados |
| `--replay-user-messages` | Ecoa mensagens do usuário no stdout para ACK |
| `--max-budget-usd <N>` | Limita gasto total da sessão |
| `--max-turns <N>` | Limita número de turnos do agente |
| `--fallback-model <model>` | Fallback automático se modelo principal sobrecarregado |
| `--allowedTools "Tool1,Tool2"` | Whitelist de ferramentas permitidas |

### Prós
- Controle total do fluxo pelo orquestrador
- Output estruturado e parseável em tempo real
- Processo único (sem overhead de relançamento)
- Sem dependência de tmux
- Ideal para orquestradores programáticos (Node.js, Python, etc.)

### Contras
- Humano não vê a sessão em tempo real (exceto se o orquestrador implementar UI)
- Intervenção humana requer: kill do processo → `claude -r <session-id>` interativo
- Problema de sync: ao alternar entre `-p` e interativo, o último a escrever no `.jsonl` vence
- Documentação do formato `stream-json` de input é limitada

---

## 4. tmux + Modo Interativo (Abordagem Atual)

### Como funciona

```bash
# Orquestrador cria sessão tmux
tmux new-session -d -s "parallel-ep-001" -n "orchestrator"

# Para cada task, cria window com Claude interativo
tmux new-window -t "parallel-ep-001" -n "TASK-ID"
tmux send-keys -t "parallel-ep-001:TASK-ID" \
  "cd $(pwd) && claude \
    --permission-mode bypassPermissions \
    --name 'TASK-ID' \
    --model opus \
    --append-system-prompt 'Autonomy policy...' \
    --disallowedTools 'mcp__claude_ai_Gmail__*,...' \
    '/implement TASK-ID'" Enter
```

### Interação orquestrador → worker

```bash
# Enviar comando
tmux send-keys -t "parallel-ep-001:TASK-ID" "/delivery" Enter

# Capturar output (últimas 50 linhas)
tmux capture-pane -t "parallel-ep-001:TASK-ID" -p -S -50

# Verificar se processo está vivo
tmux list-panes -t "parallel-ep-001:TASK-ID" -F '#{pane_pid}'
```

### Interação humano → worker

```bash
# Conectar ao worker
tmux attach -t parallel-ep-001:TASK-ID

# Desconectar sem matar
Ctrl+B D

# Navegar entre workers
Ctrl+B N  (próximo)
Ctrl+B W  (lista)
```

### Monitoramento de estado

O orquestrador **não parseia output do terminal**. Ele monitora os **task files** (`memory-system/tasks/TASK-*.md`) que o worker atualiza durante execução:

| Estado | Sinal no task file | Sinal no pane |
|--------|-------------------|---------------|
| Implementando | `Status: IN_PROGRESS`, sem handoff | pane vivo |
| Aguardando delivery | `Delivery Handoff: PENDING` | pane vivo |
| Concluído | `Status: COMPLETED` | pode estar morto |
| Crashed | Status não é COMPLETED/BLOCKED | pane morto |

Detecção de stagnação: se o task file não é modificado por 3+ minutos, captura o pane e analisa semanticamente (pergunta pendente? erro? execução normal?).

### Prós
- Humano vê tudo em tempo real via `tmux attach`
- Intervenção direta: humano assume o terminal quando necessário
- `send-keys` permite orquestrador enviar qualquer comando
- Crash recovery: relança worker, `/implement` resume da última fase
- Sessões Claude persistem para `--resume` manual

### Contras
- Dependência de tmux
- Output do terminal é texto não-estruturado (parsing frágil)
- Overhead de monitoramento (polling de task files + capture-pane)
- Cada window consome recursos do sistema
- Limite prático: 3-4 workers paralelos (rate limits + recursos)

---

## 5. `--tmux` Nativo do Claude Code

### Como funciona

```bash
claude -w <branch-name> --tmux
```

O Claude Code automaticamente:
1. Cria git worktree
2. Cria sessão tmux detached
3. Lança modo interativo dentro do pane

### Variantes

```bash
# Força tmux clássico (default tenta iTerm2 panes no macOS)
claude -w task-branch --tmux=classic
```

### Por que a skill `/parallel` NÃO usa

| Motivo | Detalhe |
|--------|---------|
| Worktree path | `--tmux` cria em `.claude/worktrees/`, mas o projeto usa `../wt-TASK-xxx/` |
| Naming | Sem controle sobre nomes de sessão/window |
| Layout | Sem controle sobre organização dos panes |
| Orquestração | Não expõe hooks para o orquestrador monitorar |

O `--tmux` nativo é útil para **uso manual** (humano quer worktree + tmux rápido), não para orquestração programática.

---

## 6. `claude mcp serve`

### Como funciona

```bash
claude mcp serve
```

Expõe o Claude Code como um **MCP server** (stdio-based). Outro client MCP pode invocar o Claude Code como ferramenta.

### Potencial para orquestração

Um Claude Code orquestrador poderia ter o Claude Code worker configurado como MCP server, enviando prompts via protocol MCP. Cada invocação seria one-shot.

### Status

- Funcionalidade existe mas documentação é escassa
- Modelo é one-shot por chamada (sem sessão persistente entre chamadas)
- Viável para tarefas isoladas, menos adequado para workflows multi-fase

---

## 7. Gestão de Permissões em Modo Não-Interativo

| Modo | Comportamento | Uso recomendado |
|------|--------------|-----------------|
| `--permission-mode default` | Pergunta a cada ação | Apenas interativo |
| `--permission-mode auto` | Auto-aceita ações seguras | Orquestração supervisionada |
| `--permission-mode bypassPermissions` | Bypassa tudo | Workers autônomos em ambiente trusted |
| `--allowedTools "X,Y,Z"` | Whitelist granular | Equilíbrio segurança/autonomia |
| `--permission-prompt-tool <mcp>` | Delega perguntas a MCP tool | Roteamento de perguntas para humano via webhook/Slack |
| `--dangerously-skip-permissions` | Ignora todas as permissões | Sandbox/CI apenas |

A flag `--permission-prompt-tool` é especialmente interessante: permite criar um MCP tool que recebe perguntas de permissão e as roteia para o humano por qualquer canal.

### Comportamento de widgets interativos (AskUserQuestion) — Validado Empiricamente

> **Nota**: Os dados abaixo foram obtidos por testes reais executados em 2026-03-24 com Claude Code v2.1.74+.
> Comando base: `unset CLAUDECODE && echo '<prompt>' | claude -p --output-format stream-json [flags]`

No modo interativo, o Claude Code renderiza widgets TUI (text UI) para perguntas de permissão e clarificação. No modo `-p` (print/headless), **o AskUserQuestion é sempre negado**, independente do permission mode. O processo **não trava**.

#### Fluxo observado em `-p` mode (todos os permission modes testados)

```
1. Modelo chama AskUserQuestion com pergunta estruturada
2. Claude Code retorna erro: {"is_error": true, "content": "Answer questions?"}
3. Modelo recebe o erro e continua (não trava, não fica pendente)
4. Processo termina normalmente com stop_reason: "end_turn"
5. Evento "result" contém array "permission_denials" com a pergunta completa
```

#### Estrutura real do AskUserQuestion no stream-json

**Chamada do modelo** (evento `assistant`):
```json
{
  "type": "assistant",
  "message": {
    "content": [{
      "type": "tool_use",
      "id": "toolu_01ERxsJFMkqLrNAg5zNTqtvY",
      "name": "AskUserQuestion",
      "input": {
        "questions": [{
          "question": "Qual é a sua cor favorita?",
          "header": "Cor",
          "options": [
            {"label": "Azul", "description": "A cor do céu e do mar"},
            {"label": "Vermelho", "description": "A cor da paixão e energia"}
          ],
          "multiSelect": false
        }]
      }
    }]
  }
}
```

**Resposta de erro** (evento `user` — tool result):
```json
{
  "type": "user",
  "message": {
    "content": [{
      "type": "tool_result",
      "content": "Answer questions?",
      "is_error": true,
      "tool_use_id": "toolu_01ERxsJFMkqLrNAg5zNTqtvY"
    }]
  },
  "tool_use_result": "Error: Answer questions?"
}
```

**Resultado final** (evento `result` — contém `permission_denials`):
```json
{
  "type": "result",
  "subtype": "success",
  "permission_denials": [{
    "tool_name": "AskUserQuestion",
    "tool_use_id": "toolu_01ERxsJFMkqLrNAg5zNTqtvY",
    "tool_input": {
      "questions": [{
        "question": "Qual é a sua cor favorita?",
        "header": "Cor",
        "options": [...]
      }]
    }
  }]
}
```

#### Tabela de comportamento real (validada)

| Cenário | AskUserQuestion | Processo trava? | Pergunta visível no JSON? |
|---------|----------------|:---:|:---:|
| Interativo normal | Widget TUI, humano responde | N/A | N/A |
| `-p` + `--permission-mode default` | **Negado** com erro `"Answer questions?"` | Não | Sim — em `permission_denials` |
| `-p` + `--permission-mode auto` | Não testável (bug API `afk-mode` header) | — | — |
| `-p` + `--permission-mode bypassPermissions` | **Negado** com erro `"Answer questions?"` | Não | Sim — em `permission_denials` |
| `-p` + `--dangerously-skip-permissions` | **Negado** com erro `"Answer questions?"` | Não | Sim — em `permission_denials` |
| `-p` + `--permission-prompt-tool <mcp>` | Não testado (requer MCP server) | — | — |
| `-p` + `--input-format stream-json` | **Negado**, mas orquestrador responde via próxima mensagem no pipe | Não | Sim — em `permission_denials` |
| tmux + interativo | Widget renderiza no pane | Sim (espera input) | N/A (texto terminal) |

**Achado-chave**: O `--permission-mode` **não afeta** o comportamento do AskUserQuestion em `-p` mode. Todos os modos testados (`default`, `bypassPermissions`, `dangerously-skip-permissions`) produzem resultado idêntico: erro + negação + continuação.

#### Implicações para orquestração

1. **O processo nunca trava** em `-p` mode por causa de AskUserQuestion — corrige a suposição anterior
2. **A pergunta completa é acessível** no array `permission_denials` do evento `result` — o orquestrador pode ler a pergunta e agir
3. **O modelo recebe o erro e continua** — pode tomar decisões subótimas sem a resposta, mas não fica parado
4. **`permission_denials` é o mecanismo de detecção**: o orquestrador pode inspecionar este array e, se contiver perguntas relevantes, enviar a resposta como próxima mensagem

#### Resposta via `stream-json` bidirecional (validado empiricamente)

Com `--input-format stream-json --output-format stream-json`, o processo fica vivo e aceita **múltiplas mensagens** no mesmo pipe. O orquestrador pode responder perguntas negadas enviando nova mensagem NDJSON:

```
Fluxo observado (testado em 2026-03-24):

1. stdin  ← {"type":"user","message":{"role":"user","content":[{"type":"text","text":"Pergunta que requer AskUserQuestion"}]}}
2. stdout → [assistant] tool_use: AskUserQuestion {pergunta completa}
3. stdout → [user] tool_result: is_error=true "Answer questions?"
4. stdout → [assistant] text: "Estou aguardando sua resposta..."
5. stdout → [result] denials=1, permission_denials=[{pergunta completa}]
6. stdin  ← {"type":"user","message":{"role":"user","content":[{"type":"text","text":"A resposta é: azul"}]}}
7. stdout → [system] init session=MESMA-SESSAO    ← contexto preservado!
8. stdout → [assistant] text: "Ótimo! Sua cor favorita é azul..."
9. stdout → [result] denials=0                     ← sem negações
```

**Comportamento-chave**: cada mensagem no stdin gera um ciclo completo (init → assistant → result), mas **dentro da mesma sessão**. O modelo recebe o contexto completo incluindo a pergunta anterior que foi negada e a resposta do orquestrador.

**Padrão recomendado para orquestrador (stream-json)**:

```python
# Pseudocódigo do loop do orquestrador
process = spawn("claude -p --input-format stream-json --output-format stream-json")

process.stdin.write(prompt_ndjson)

for event in process.stdout:
    if event.type == "result":
        denials = event.permission_denials
        if any(d.tool_name == "AskUserQuestion" for d in denials):
            question = denials[0].tool_input.questions[0].question
            answer = get_answer(question)  # humano, heurística, ou outro agente
            process.stdin.write(answer_ndjson)  # responde na mesma sessão
        else:
            break  # tarefa concluída sem perguntas pendentes
```

**Padrão alternativo (one-shot com continuation)**:

```bash
# Execução inicial
result=$(claude -p "tarefa X" --output-format json --session-id $UUID)

# Se houve pergunta negada, responder via continuation
if echo "$result" | jq -e '.[].permission_denials[]? | select(.tool_name=="AskUserQuestion")' >/dev/null; then
  claude -p "A resposta é: azul" -c --session-id $UUID --output-format json
fi
```

### Mecanismo interno: AskUserQuestion é um tool use

Nos debug logs do Claude Code, `AskUserQuestion` passa pelo mesmo pipeline de qualquer outra ferramenta:

```
[DEBUG] executePreToolHooks called for tool: AskUserQuestion
[DEBUG] executePermissionRequestHooks called for tool: AskUserQuestion
```

O sistema de permissões processa AskUserQuestion identicamente a outras ferramentas, porém **em `-p` mode o resultado é sempre negação**, independente do `--permission-mode`.

### Estratégias de orquestração para perguntas

#### Estratégia A: Ignorar e deixar o modelo seguir

```bash
claude -p \
  --output-format json \
  --session-id $UUID
```

- AskUserQuestion será negado automaticamente, modelo segue com melhor julgamento
- Orquestrador inspeciona `permission_denials` no resultado para auditoria
- Mais simples, zero config extra
- **Risco**: decisões erradas em casos ambíguos (o modelo não teve a resposta)
- **Mitigação**: `--append-system-prompt` com policy de "não pergunte, decida"

#### Estratégia B: Detectar e responder via stream-json bidirecional (RECOMENDADA)

```python
import subprocess, json

proc = subprocess.Popen(
    ["claude", "-p",
     "--input-format", "stream-json",
     "--output-format", "stream-json",
     "--session-id", session_uuid],
    stdin=subprocess.PIPE, stdout=subprocess.PIPE,
    env={**os.environ, "CLAUDECODE": ""}  # unset para evitar nested check
)

def send(text):
    msg = json.dumps({"type":"user","message":{"role":"user",
           "content":[{"type":"text","text":text}]}})
    proc.stdin.write((msg + "\n").encode())
    proc.stdin.flush()

send("implementar feature X")

for line in proc.stdout:
    event = json.loads(line)
    if event.get("type") == "result":
        denials = event.get("permission_denials", [])
        ask_denials = [d for d in denials if d["tool_name"] == "AskUserQuestion"]
        if ask_denials:
            question = ask_denials[0]["tool_input"]["questions"][0]["question"]
            answer = get_human_answer(question)  # slack, webhook, input()...
            send(f"Respondendo: {answer}")
        else:
            break  # tarefa concluída
```

- Processo único, sessão única, pipe bidirecional
- Orquestrador detecta perguntas via `permission_denials` no evento `result`
- Responde enviando nova mensagem NDJSON no stdin — **mesma sessão, contexto preservado**
- **Prós**: supervisão real, sem tmux, sem MCP server, sem overhead de relançamento
- **Contras**: requer parsing de NDJSON, cada resposta gera ciclo completo (init → result)
- **Validado empiricamente** em 2026-03-24

#### Estratégia B-alt: Detectar e responder via continuation (one-shot)

```bash
# Execução inicial
result=$(claude -p "tarefa X" --output-format json --session-id $UUID)

# Verificar se houve pergunta negada
questions=$(echo "$result" | jq '.[].permission_denials[]? | select(.tool_name=="AskUserQuestion")')

if [ -n "$questions" ]; then
  question_text=$(echo "$questions" | jq -r '.tool_input.questions[0].question')
  # Responder via continuation
  claude -p "Respondendo sua pergunta: $answer" -c --session-id $UUID --output-format json
fi
```

- Variante one-shot (sem stream, sem pipe)
- Mais simples que stream-json, mas com overhead de relançamento por round-trip
- Útil quando o orquestrador é um script bash simples

#### Estratégia C: Delegação via MCP tool (supervisão assíncrona)

```bash
claude -p \
  --permission-prompt-tool meu-mcp-bridge \
  --output-format stream-json \
  --session-id $UUID
```

Requer criação de um MCP server customizado que:
1. Recebe a invocação de `AskUserQuestion` como chamada de tool
2. Publica a pergunta em um canal externo (Slack, webhook, fila, arquivo)
3. Aguarda resposta do humano (polling ou callback)
4. Retorna a resposta ao Claude Code

Exemplo conceitual do MCP server:

```javascript
// mcp-question-bridge/server.js (stdio-based MCP server)
const questions = new Map();

// Quando Claude Code delega uma pergunta:
async function handlePermissionPrompt({ tool, question, sessionId }) {
  const id = crypto.randomUUID();

  // Publicar pergunta (ex: arquivo, webhook, Slack)
  await fs.writeFile(`/tmp/claude-questions/${id}.json`, JSON.stringify({
    id, tool, question, sessionId,
    timestamp: new Date().toISOString(),
    status: 'pending'
  }));

  // Aguardar resposta (polling simples)
  while (true) {
    const answer = await fs.readFile(`/tmp/claude-answers/${id}.json`)
      .catch(() => null);
    if (answer) return JSON.parse(answer).response;
    await sleep(2000);
  }
}
```

- **Prós**: humano mantém supervisão sem precisar de tmux ou terminal
- **Contras**: complexidade de implementar o MCP server, latência do ciclo pergunta/resposta
- **Ideal para**: equipes distribuídas, integração com chatops

#### Estratégia C: tmux com stagnation detection (abordagem atual)

```bash
# Worker em modo interativo dentro de tmux pane
tmux send-keys -t "session:window" \
  "claude --permission-mode bypassPermissions '/implement TASK'" Enter

# Orquestrador monitora stagnação (task file sem update por 3min)
# Captura o pane e analisa semanticamente
output=$(tmux capture-pane -t "session:window" -p -S -50)

# Se detectar pergunta pendente, responde via send-keys
tmux send-keys -t "session:window" "sim, pode prosseguir" Enter
```

- **Prós**: visibilidade total, humano pode attach a qualquer momento
- **Contras**: parsing de texto não-estruturado, dependência de tmux
- **Ideal para**: execução local supervisionada

#### Estratégia D: Híbrida (stream-json + resume de emergência)

```
Orquestrador (stream-json)
    │
    ├─ Worker 1: claude -p --stream-json --permission-mode auto
    │    └─ Autonomia total, agente decide sozinho
    │    └─ Se resultado insatisfatório: kill → claude -r UUID (humano assume)
    │
    ├─ Worker 2: claude -p --stream-json --permission-prompt-tool bridge
    │    └─ Perguntas críticas delegadas ao MCP bridge
    │    └─ Humano responde via Slack/webhook
    │
    └─ Fallback: humano pode sempre
         kill qualquer worker → claude -r <session-id>
         (retoma interativamente com histórico completo)
```

- **Prós**: combina autonomia com supervisão sob demanda
- **Contras**: dois modos de operação para manter
- **Ideal para**: orquestração programática com safety net humano

### Comparativo de estratégias

| Critério | A (ignorar) | B (detect+continue) | C (MCP bridge) | D (tmux) | E (híbrida) |
|----------|:---:|:---:|:---:|:---:|:---:|
| Simplicidade | Alta | Média | Baixa | Média | Média |
| Supervisão humana | Via `permission_denials` | Ativa (round-trip) | Assíncrona | Tempo real | Sob demanda |
| Visibilidade | JSON auditável | JSON + respostas | Via canal externo | Terminal direto | JSON + fallback |
| Latência de intervenção | Zero (ignora) | Segundos (continuation) | Segundos (async) | Imediata (attach) | Variável |
| Dependência externa | Nenhuma | Nenhuma | MCP server custom | tmux | Nenhuma/MCP |
| Escalabilidade | Alta | Alta | Alta | Baixa (3-4 workers) | Alta |
| Risco de decisão errada | Médio | Baixo | Baixo | Baixo | Baixo |
| Custo extra de tokens | Nenhum | Médio (round-trips) | Baixo | Nenhum | Variável |

---

## 8. Persistência de Sessão

### Formato

```
~/.claude/projects/<encoded-path>/<session-uuid>.jsonl
```

- JSONL (uma linha JSON por mensagem/evento)
- Campos: `uuid`, `parentUuid`, `type`, `content`, `timestamp`, `cwd`, `gitBranch`, `sessionId`
- Mensagens encadeadas via `parentUuid` formando árvore de conversação

### Compartilhamento entre modos

- `-p` e interativo **compartilham o mesmo storage**
- Sessões criadas com `-p` podem ser retomadas interativamente (`claude -r <id>`)
- Sessões interativas podem ser continuadas com `-p -c`

### Problema de sincronismo

Ao alternar entre modos na mesma sessão, o último processo a escrever vence. O modo interativo mantém estado em memória e faz flush atômico, podendo sobrescrever mensagens adicionadas por `-p`.

**Regra prática**: não rodar `-p` e interativo simultaneamente na mesma sessão.

---

## 9. Flags Relevantes para Orquestração

| Flag | Função |
|------|--------|
| `--session-id <uuid>` | Fixa o ID da sessão |
| `--name <nome>` | Nomeia a sessão (visível em resume/title) |
| `-c` / `--continue` | Continua sessão mais recente do diretório |
| `-r` / `--resume <id>` | Retoma sessão específica |
| `--fork-session` | Ao resumir, cria novo ID (fork) |
| `--model <alias>` | Fixa modelo (`opus`, `sonnet`, nome completo) |
| `--effort <level>` | Nível de esforço (`low`, `medium`, `high`, `max`) |
| `--append-system-prompt` | Adiciona ao system prompt sem substituir |
| `--disallowedTools` | Remove ferramentas do contexto (economia de tokens) |
| `--no-session-persistence` | Não salva sessão (execuções efêmeras) |
| `--max-budget-usd` | Limite de gasto (apenas `-p`) |
| `--max-turns` | Limite de turnos (apenas `-p`) |

---

## 10. Comparativo das Abordagens

| Critério | `-p` one-shot | `-p` stream-json | tmux interativo | `mcp serve` |
|----------|:---:|:---:|:---:|:---:|
| Simplicidade de implementação | Alta | Média | Baixa | Média |
| Visibilidade humana em tempo real | Nenhuma | Nenhuma | Total | Nenhuma |
| Intervenção humana direta | Via resume | Via resume | Attach direto | Não |
| Output estruturado | Sim | Sim | Não (texto) | Sim |
| Controle de budget/turnos | Sim | Sim | Não | Não |
| Sessão persistente entre prompts | Via `-c`/`-r` | Processo único | Processo único | Não |
| Adequado para multi-fase | Parcial | Sim | Sim | Não |
| Dependência externa | Nenhuma | Nenhuma | tmux | MCP client |
| AskUserQuestion | Negado, visível em `permission_denials` | Negado, visível em `permission_denials` | Widget TUI no pane | Não disponível |

---

## 11. Recomendações

### Para a skill `/parallel` atual
A abordagem **tmux + modo interativo** continua sendo a mais adequada. A visibilidade humana e intervenção direta via `tmux attach` são requisitos prioritários para execução paralela de épicos.

### Para um orquestrador programático (futuro)
A abordagem **`-p` + `stream-json` bidirecional** é a mais promissora. Elimina tmux, oferece output estruturado, e permite controle fino. A intervenção humana seria via kill + resume interativo.

### Para tarefas isoladas/CI
O modo **`-p` one-shot** com `--output-format json` é ideal. Simples, parseável, com controle de budget.

### Arquitetura híbrida (ideal)
Combinar `stream-json` para controle programático com a possibilidade de o humano assumir via `claude -r <session-id>`:

```
Orquestrador
    │
    ├─ spawn: claude -p --stream-json --session-id UUID-1
    │    └─ stdin/stdout: controle total
    │
    ├─ spawn: claude -p --stream-json --session-id UUID-2
    │    └─ stdin/stdout: controle total
    │
    └─ Humano pode a qualquer momento:
         kill worker → claude -r UUID-1 (assume interativamente)
```

---

## 12. Limitações Conhecidas

- **Sem IPC para sessão ativa**: não existe socket/API para injetar input em sessão interativa rodando
- **Sessões aninhadas proibidas**: Claude Code rejeita execução dentro de outra instância (workaround: `unset CLAUDECODE`)
- **Sync de histórico**: alternar `-p`/interativo na mesma sessão causa conflito de escrita
- **`--remote-control`**: existe mas usa bridge remoto da Anthropic (`wss://bridge.claudeusercontent.com`), não IPC local
- **Sem SDK programático**: o binário não é importável como módulo Node.js/Python
- **Rate limits**: limite prático de 3-4 workers paralelos com modelo Opus
- **AskUserQuestion em `-p`**: sempre negado com erro — não é possível responder perguntas via stdin; requer continuation (`-c`) ou MCP bridge
- **`--permission-mode auto`**: incompatível com Opus 4.6 no momento (bug no header `afk-mode-2026-01-31`)
