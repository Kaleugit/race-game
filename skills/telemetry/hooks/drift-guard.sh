#!/usr/bin/env bash
# drift-guard.sh — in-session strategic-drift alert.
#
# Consumer shipped in Fase 1; producer arrives in Fase 3. The semantic monitor
# (Fase 3, in the monitor subproject) writes a flag into the derived repo when it
# detects strategic misalignment:
#   memory-system/telemetry/drift.flag
# First line is used, format: <severity>|<short message>
#   e.g.  high|Atividade recente foge do EP-002 (maior valor); PRs só em refactor cosmético.
#
# Runs on UserPromptSubmit. When the flag exists it injects a system-reminder so
# the operator sees the drift in-session — the same pattern as context-guard.sh
# (reads context-meter) and footer.sh (reads .governance/.dirty). Silent when the
# flag is absent. Always exits 0.
#
# Ordering note: Claude Code does NOT guarantee a deterministic stdout order
# across separate hook entries for the same event, so this alert may land before
# or after the governance footer. That is fine — it is an independent
# system-reminder whose effect does not depend on position; the harness keys the
# closing block off the footer's content, not its absolute position.

set -u

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
FLAG="$PROJECT_DIR/memory-system/telemetry/drift.flag"

[ -s "$FLAG" ] || exit 0

first="$(head -n1 "$FLAG" 2>/dev/null || true)"
severity="${first%%|*}"
message="${first#*|}"
# No pipe in the line -> treat the whole line as the message.
[ "$severity" = "$first" ] && { severity="info"; message="$first"; }

cat <<EOF
<system-reminder>
<strategic-drift severity="${severity}">
O monitor semântico sinalizou DESVIO ESTRATÉGICO neste projeto: ${message}
Reavalie se a atividade atual prioriza a entrega de maior valor alinhada à visão do projeto (docs/PROJECT_SPECS.md, docs/EPICOS.md). Se for desvio real, leve ao humano antes de prosseguir. Origem: memory-system/telemetry/drift.flag (escrito pelo monitor central).
</strategic-drift>
</system-reminder>
EOF

exit 0
