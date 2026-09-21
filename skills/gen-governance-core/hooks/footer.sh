#!/usr/bin/env bash
# Dynamic footer reminder. Emits a system-reminder with:
#   - current timestamp (always)
#   - GOVERNANCE-CORE.dirty alert (if marker exists)
#
# Must run AFTER static injections (inject-level.sh) so the cache prefix is
# preserved.

set -u

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
DIRTY_FILE="$PROJECT_DIR/.governance/.dirty"
TZ_NAME="${CLAUDE_GOV_TZ:-America/Sao_Paulo}"

# Git Bash/msys no Windows não tem o banco IANA: TZ="America/Sao_Paulo" é
# ignorado e o date cai em UTC (bug visto em 2026-08-21, footer +3h). Detecta
# o fallback silencioso comparando com UTC e usa o formato POSIX fixo -03
# (São Paulo não tem DST desde 2019).
ts="$(TZ="$TZ_NAME" date '+%Y-%m-%d %H:%M')"
if [ "$TZ_NAME" = "America/Sao_Paulo" ] && [ "$ts" = "$(TZ=UTC date '+%Y-%m-%d %H:%M')" ]; then
  ts="$(TZ=BRT3 date '+%Y-%m-%d %H:%M')"
fi
timestamp="$ts $TZ_NAME"

if [ -s "$DIRTY_FILE" ]; then
  dirty_list="$(tr '\n' ',' < "$DIRTY_FILE" | sed 's/,$//' | sed 's/,/, /g')"
  cat <<EOF
<system-reminder>
Close your response with this footer block, exactly:

---
> ⚠️ **Governança desatualizada** — arquivos editados: $dirty_list
> Rode \`/gen-governance-core\` para regenerar.
>
> 🕐 $timestamp

Place the footer at the very end of your response, after all other content.
</system-reminder>
EOF
else
  cat <<EOF
<system-reminder>
Close your response with this footer block, exactly:

---
> 🕐 $timestamp

Place the footer at the very end of your response, after all other content.
</system-reminder>
EOF
fi

exit 0
