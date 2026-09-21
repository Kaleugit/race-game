# Statusline opt-in: alerta `GOV-DIRTY`

Este boilerplate inclui um hook que mantém o arquivo `GOVERNANCE-CORE.md`
atualizado a partir das fontes de governança versionadas (`AGENTS.md`,
`INTEGRITY-RULES.md`, `CLAUDE.md`, `docs/PROJECT_SPECS.md`, etc.).
Quando você edita uma dessas fontes, o hook cria/atualiza o marcador
`.governance/.dirty` na raiz do projeto.

Por padrão, o aviso aparece como rodapé na resposta do Claude. Este
documento descreve uma melhoria **opcional**: exibir uma tag `[GOV-DIRTY]`
em vermelho no statusline do Claude Code enquanto o marcador existir.

> Esta integração depende do seu statusline pessoal global
> (`~/.claude/statusline.sh`). Ela **não** é instalada automaticamente
> pelo boilerplate, porque sobrescrever o statusline global de cada dev
> seria invasivo.

## Snippet a anexar

Cole estas linhas no **final** do seu `~/.claude/statusline.sh`, depois do
último `printf` que renderiza o statusline:

```bash
# --- Governance dirty indicator (project-local opt-in) ---
# Mostra [GOV-DIRTY] em vermelho quando ./.governance/.dirty existe no cwd.
# Como o statusline roda no cwd do projeto, isto só ativa nos projetos que
# têm o hook de governança configurado.
if [ -f ".governance/.dirty" ]; then
  RED=$'\033[31m'
  RESET=$'\033[0m'
  printf ' %s[GOV-DIRTY]%s' "$RED" "$RESET"
fi
```

Notas:
- O snippet usa `printf` adicional após o existente. Se o seu statusline já
  termina com `printf` sem newline, o `printf ' ...'` adiciona o indicador
  com espaço-separador na mesma linha.
- A checagem é por caminho relativo (`.governance/.dirty`), portanto
  só dispara nos projetos com este boilerplate ativo.
- Custo: uma chamada `[ -f ... ]` por refresh do statusline. Insignificante.

## Exemplo de referência: statusline atual do mantenedor

Apenas como ilustração de um statusline rico, segue o `statusline.sh` que o
mantenedor (`@oda`) usa hoje. Você **não** precisa adotá-lo — é só um
exemplo de como o snippet acima se encaixa no fim de um statusline elaborado.

```bash
#!/usr/bin/env bash
set -u

CACHE_DIR="$HOME/.cache/claude-statusline"
mkdir -p "$CACHE_DIR"
find "$CACHE_DIR" -maxdepth 1 -name 'ctx-*.json' -mtime +1 -delete 2>/dev/null
find "$CACHE_DIR" -maxdepth 1 -name 'ctx-*.lock' -mtime +1 -delete 2>/dev/null

input=$(cat)

session_id=$(echo "$input" | jq -r '.session_id // "unknown"')
ctx_pct=$(echo  "$input" | jq -r '.context_window.used_percentage // empty')
ctx_size=$(echo "$input" | jq -r '.context_window.context_window_size // 0')
ctx_in=$(echo   "$input" | jq -r '.context_window.current_usage.input_tokens // 0')
ctx_cr=$(echo   "$input" | jq -r '.context_window.current_usage.cache_read_input_tokens // 0')
ctx_cc=$(echo   "$input" | jq -r '.context_window.current_usage.cache_creation_input_tokens // 0')
ctx_total=$((ctx_in + ctx_cr + ctx_cc))

SPARK=(▁ ▂ ▃ ▄ ▅ ▆ ▇ █)
GREEN=$'\033[32m'
YELLOW=$'\033[33m'
RED=$'\033[31m'
DIM=$'\033[2m'
RESET=$'\033[0m'

color_for() {
  awk -v v="$1" -v g="$GREEN" -v y="$YELLOW" -v r="$RED" \
    'BEGIN{ if(v<50) print g; else if(v<80) print y; else print r }'
}

spark_char() {
  local i
  i=$(awk -v v="$1" 'BEGIN{i=int(v/12.5); if(i>7)i=7; if(i<0)i=0; print i}')
  printf '%s' "${SPARK[$i]}"
}

render_slots() {
  local slots=$1; shift
  local values=("$@")
  local out="" i v prev="0"
  for ((i=0;i<slots;i++)); do
    v="${values[$i]}"
    if [ -z "$v" ] || [ "$v" = "null" ]; then
      v="$prev"
    fi
    out="$out$(color_for "$v")$(spark_char "$v")${RESET}"
    prev="$v"
  done
  printf '%s' "$out"
}

# Sparkline ancorada em resets_at (5h / 7d) — slots fixos no tempo da janela do servidor
render_anchored() {
  local name=$1 pct=$2 reset=$3 window=$4 slots=$5
  local file="$CACHE_DIR/$name.json"
  local lock="$CACHE_DIR/$name.lock"
  local now; now=$(date +%s)

  if [ -z "$reset" ] || [ -z "$pct" ]; then
    local empty=() i
    for ((i=0;i<slots;i++)); do empty+=(""); done
    render_slots "$slots" "${empty[@]}"
    return
  fi

  (
    flock -x 9
    local window_start=$((reset - window))
    local bucket=$((window / slots))
    local cur_slot=$(( (now - window_start) / bucket ))
    [ $cur_slot -lt 0 ] && cur_slot=0
    [ $cur_slot -ge $slots ] && cur_slot=$((slots-1))

    local prev_reset=""
    local values=()
    if [ -f "$file" ]; then
      prev_reset=$(jq -r '.resets_at // ""' "$file" 2>/dev/null || echo "")
      if [ "$prev_reset" = "$reset" ]; then
        mapfile -t values < <(jq -r '.values[] | if . == null then "" else tostring end' "$file" 2>/dev/null)
      fi
    fi
    while [ ${#values[@]} -lt $slots ]; do values+=(""); done

    values[$cur_slot]="$pct"

    local json='{"resets_at":'"$reset"',"values":['
    local i
    for ((i=0;i<slots;i++)); do
      [ $i -gt 0 ] && json="$json,"
      if [ -z "${values[$i]}" ] || [ "${values[$i]}" = "null" ]; then json="${json}null"
      else json="${json}${values[$i]}"; fi
    done
    json="$json]}"
    echo "$json" > "$file"

    render_slots "$slots" "${values[@]}"
  ) 9>"$lock"
}

# Sparkline rolante (sem âncora do servidor) — slot último sempre "agora", desliza com o tempo
render_rolling() {
  local name=$1 pct=$2 slot_seconds=$3 slots=$4
  local file="$CACHE_DIR/$name.json"
  local lock="$CACHE_DIR/$name.lock"
  local now; now=$(date +%s)

  if [ -z "$pct" ]; then
    local empty=() i
    for ((i=0;i<slots;i++)); do empty+=(""); done
    render_slots "$slots" "${empty[@]}"
    return
  fi

  (
    flock -x 9
    local last_ts=""
    local values=()
    if [ -f "$file" ]; then
      last_ts=$(jq -r '.last_ts // ""' "$file" 2>/dev/null || echo "")
      mapfile -t values < <(jq -r '.values[] | if . == null then "" else tostring end' "$file" 2>/dev/null)
    fi
    while [ ${#values[@]} -lt $slots ]; do values+=(""); done
    [ -z "$last_ts" ] && last_ts=$now

    local elapsed=$((now - last_ts))
    local shifts=$((elapsed / slot_seconds))
    if [ $shifts -gt 0 ]; then
      if [ $shifts -ge $slots ]; then
        values=()
        local i
        for ((i=0;i<slots;i++)); do values+=(""); done
      else
        local i
        for ((i=0;i<slots-shifts;i++)); do values[$i]="${values[$((i+shifts))]}"; done
        for ((i=slots-shifts;i<slots;i++)); do values[$i]=""; done
      fi
      last_ts=$((last_ts + shifts * slot_seconds))
    fi

    values[$((slots-1))]="$pct"

    local json='{"last_ts":'"$last_ts"',"values":['
    local i
    for ((i=0;i<slots;i++)); do
      [ $i -gt 0 ] && json="$json,"
      if [ -z "${values[$i]}" ] || [ "${values[$i]}" = "null" ]; then json="${json}null"
      else json="${json}${values[$i]}"; fi
    done
    json="$json]}"
    echo "$json" > "$file"

    render_slots "$slots" "${values[@]}"
  ) 9>"$lock"
}

# ctx: 10 slots × 36s = janela rolante de 6 min
if [ -n "$ctx_pct" ] && [ "$ctx_size" -gt 0 ]; then
  ctx_k=$(awk "BEGIN{printf \"%.1fk\",$ctx_total/1000}")
  if [ "$ctx_size" -ge 1000000 ]; then win_lbl=$(awk "BEGIN{printf \"%dM\",$ctx_size/1000000}")
  else                                 win_lbl=$(awk "BEGIN{printf \"%dk\",$ctx_size/1000}")
  fi
  ctx_spark=$(render_rolling "ctx-${session_id}" "$ctx_pct" 36 10)
  ctx_str="ctx ${ctx_spark} ${ctx_k}/${win_lbl} ($(printf '%.0f' "$ctx_pct")%)"
else
  ctx_spark=$(render_rolling "ctx-${session_id}" "" 36 10)
  ctx_str="ctx ${ctx_spark} —"
fi

effort_level=$(echo "$input" | jq -r '.effort.level // empty')
thinking_on=$(echo  "$input" | jq -r '.thinking.enabled // false')
tok_in=$(echo       "$input" | jq -r '.context_window.total_input_tokens // 0')
tok_out=$(echo      "$input" | jq -r '.context_window.total_output_tokens // 0')

abbrev() {
  awk -v n="$1" 'BEGIN{
    if (n >= 1000000) { s=sprintf("%.1fM", n/1000000); sub(/\.0M$/,"M",s); print s }
    else if (n >= 1000) { s=sprintf("%.1fk", n/1000); sub(/\.0k$/,"k",s); print s }
    else print n
  }'
}

case "$effort_level" in
  low)    eff_pct=20;  eff_letter=lo ;;
  medium) eff_pct=50;  eff_letter=me ;;
  high)   eff_pct=75;  eff_letter=hi ;;
  xhigh)  eff_pct=90;  eff_letter=xh ;;
  max)    eff_pct=100; eff_letter=mx ;;
  *)      eff_pct="";  eff_letter="" ;;
esac

suffix_left=""
[ "$thinking_on" = "true" ] && suffix_left="${suffix_left}🧠 "
if [ -n "$eff_letter" ]; then
  eff_col=$(color_for "$eff_pct")
  eff_bar=$(spark_char "$eff_pct")
  suffix_left="${suffix_left}${eff_col}${eff_bar} ${eff_letter}${RESET}"
fi

suffix_right=""
if [ "$tok_in" -gt 0 ] || [ "$tok_out" -gt 0 ]; then
  suffix_right="↑$(abbrev "$tok_in") ↓$(abbrev "$tok_out")"
fi

suffix=""
if [ -n "$suffix_left" ] && [ -n "$suffix_right" ]; then
  suffix=" ${DIM}|${RESET} ${suffix_left} ${DIM}|${RESET} ${suffix_right}"
elif [ -n "$suffix_left" ]; then
  suffix=" ${DIM}|${RESET} ${suffix_left}"
elif [ -n "$suffix_right" ]; then
  suffix=" ${DIM}|${RESET} ${suffix_right}"
fi

five_pct=$(echo   "$input" | jq -r '.rate_limits.five_hour.used_percentage // empty')
five_reset=$(echo "$input" | jq -r '.rate_limits.five_hour.resets_at // empty')
week_pct=$(echo   "$input" | jq -r '.rate_limits.seven_day.used_percentage // empty')
week_reset=$(echo "$input" | jq -r '.rate_limits.seven_day.resets_at // empty')

parts="$ctx_str"
if [ -n "$five_pct" ]; then
  s=$(render_anchored "5h" "$five_pct" "$five_reset" 18000 5)
  parts="$parts ${DIM}|${RESET} 5h $s $(printf '%.0f' "$five_pct")%"
fi
if [ -n "$week_pct" ]; then
  s=$(render_anchored "7d" "$week_pct" "$week_reset" 604800 7)
  parts="$parts ${DIM}|${RESET} 7d $s $(printf '%.0f' "$week_pct")%"
fi

printf '%s' "${parts}${suffix}"

# --- Context meter for the handoff guard (project-local opt-in) ---
# Authoritative leg of the hybrid: write the official context % so the
# UserPromptSubmit context-guard hook reads it instead of estimating from the
# transcript. ctx_pct already holds .context_window.used_percentage here.
if [ -n "$ctx_pct" ] && [ -d ".governance" ]; then
  printf '%.0f' "$ctx_pct" > .governance/.context-pct 2>/dev/null || true
fi

# --- Governance dirty indicator (project-local opt-in) ---
if [ -f ".governance/.dirty" ]; then
  printf ' %s[GOV-DIRTY]%s' "$RED" "$RESET"
fi
```

## Opcional: medidor de contexto para o guard de handoff

O boilerplate inclui um hook `UserPromptSubmit` (`context-guard.sh`) que avisa
quando o contexto da sessão se aproxima do limite (75% / 85%) e oferece gerar um
documento de handoff. A medição é **híbrida**:

1. **Autoritativa** — este statusline grava o `%` oficial
   (`.context_window.used_percentage`) em `.governance/.context-pct` a cada
   refresh. O hook lê esse arquivo enquanto ele estiver fresco (TTL padrão 60s,
   via `CLAUDE_GOV_CTX_PCT_TTL`).
2. **Fallback** — sem o arquivo (ou se estiver velho), o hook estima o `%` a
   partir do `usage` do transcript da sessão. **Cuidado:** o transcript grava o
   id base do modelo (ex.: `claude-opus-4-8`) **sem** o marcador `[1m]`, então o
   fallback não distingue janela de 200k vs 1M com segurança. Em sessões de 1M
   **sem** este statusline, defina `CLAUDE_GOV_CTX_WINDOW=1000000` para evitar
   avisos falsos na faixa de 150k-200k tokens.

Se você já tem um statusline próprio que faz `input=$(cat)`, adicione apenas:

```bash
# Grava o % de contexto para o guard de handoff (projetos com .governance/).
ctx_pct=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
if [ -n "$ctx_pct" ] && [ -d ".governance" ]; then
  printf '%.0f' "$ctx_pct" > .governance/.context-pct 2>/dev/null || true
fi
```

Thresholds e janela são ajustáveis por variável de ambiente:
`CLAUDE_GOV_CTX_WARN` (padrão 75), `CLAUDE_GOV_CTX_CRIT` (padrão 85),
`CLAUDE_GOV_CTX_WINDOW` (override do tamanho da janela, em tokens),
`CLAUDE_GOV_CTX_PCT_TTL` (validade do arquivo `.context-pct`, em segundos).

> O guard funciona **sem** este statusline (o fallback do transcript cobre toda
> sessão automaticamente). Instalar este snippet apenas torna a medição exata.

## Como instalar

1. Abra `~/.claude/statusline.sh` no seu editor.
2. Vá até o final do arquivo, após o último `printf` que renderiza o statusline.
3. Cole o snippet da seção "Snippet a anexar".
4. Salve. A próxima janela de chat já mostra `[GOV-DIRTY]` quando aplicável.

Se você não tem um statusline próprio, configure um via `update-config`:

```
/update-config configurar statusline em settings global apontando para meu-statusline.sh
```

## Como remover

Apague as linhas adicionadas. Nenhum outro estado precisa ser limpo.
