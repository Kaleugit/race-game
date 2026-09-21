#!/usr/bin/env bash
# cc-watch UserPromptSubmit hook. Two independent, fail-silent behaviors:
#
#  1. NOTIFY — if a findings inbox exists under /tmp, inject a <cc-watch>
#     system-reminder so the agent surfaces it to the human. Same pattern as
#     telemetry/drift-guard.sh (reads a flag file) and footer.sh (reads .dirty).
#     Runs every turn; persists until the inbox is cleared.
#
#  2. DISPATCH — at most ONCE PER DAY, inject a system-reminder instructing the
#     agent to spawn a BACKGROUND subagent that runs skills/cc-watch (the
#     semantic triage). No cheap pre-filter gate by design: running one agent a
#     day is negligible cost; the agent's own reading is the only robust
#     relevance test (a keyword gate would miss net-new primitives). Background
#     so it never blocks the user's actual prompt.
#
# All state lives under /tmp (namespaced per repo) so the working tree stays clean.
# This script never does network I/O — the dispatched subagent does the curl. The
# hook is a dumb, date-gated text injector. Always exits 0.

set -u

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
STATE_DIR="/tmp/cc-watch/$(basename "$PROJECT_DIR")"
FINDINGS="$STATE_DIR/findings.md"
DISPATCH_MARK="$STATE_DIR/last-dispatch-date"

mkdir -p "$STATE_DIR" 2>/dev/null || true

# --- 1. NOTIFY -------------------------------------------------------------
if [ -s "$FINDINGS" ]; then
  # Cap the preview by LINES (not bytes) so a multibyte UTF-8 char is never split.
  body="$(head -n 80 "$FINDINGS" 2>/dev/null || true)"
  cat <<EOF
<system-reminder>
<cc-watch>
A triagem do cc-watch encontrou novidade(s) relevante(s) no Claude Code que podem
justificar ajustar o boilerplate. Inbox efêmero: ${FINDINGS}

${body}

Apresente isto ao humano de forma concisa no fechamento da resposta. Depois de
apresentar, remova o arquivo por padrão (\`rm ${FINDINGS}\`) — o registro durável é a
ação que o humano decidir tomar, não este inbox. Só mantenha o arquivo se o humano
pedir explicitamente para revisitar depois.
</cc-watch>
</system-reminder>
EOF
fi

# --- 2. DISPATCH (once/day) ------------------------------------------------
# Fix TZ so the "day" boundary matches the operator and the sibling hooks
# (footer.sh uses the same convention), not the host's possibly-UTC clock.
# Git Bash/msys sem tzdata ignora nomes IANA e cai em UTC — detectar e usar o
# POSIX fixo -03 (SP sem DST desde 2019); mesmo fix do footer.sh de 2026-08-21.
_gov_tz="${CLAUDE_GOV_TZ:-America/Sao_Paulo}"
today="$(TZ="$_gov_tz" date +%F 2>/dev/null || true)"
if [ "$_gov_tz" = "America/Sao_Paulo" ] && [ "$(TZ="$_gov_tz" date '+%F %H:%M' 2>/dev/null)" = "$(TZ=UTC date '+%F %H:%M' 2>/dev/null)" ]; then
  today="$(TZ=BRT3 date +%F 2>/dev/null || true)"
fi
last=""
[ -f "$DISPATCH_MARK" ] && last="$(cat "$DISPATCH_MARK" 2>/dev/null || true)"

if [ -n "$today" ] && [ "$today" != "$last" ]; then
  # NOTE (accepted limitation): the mark is stamped here, before the subagent is
  # confirmed spawned — same trust model as governance injection. Worst case is
  # losing one day's triage if the main agent ignores the instruction; it recovers
  # the next day. Not worth a SubagentStop confirmation hook (KISS/YAGNI).
  printf '%s' "$today" > "$DISPATCH_MARK" 2>/dev/null || true
  # Pass the canonical STATE_DIR literally so the subagent never re-infers it from
  # its own cwd (which can differ from the project dir — subdir or worktree).
  cat <<EOF
<system-reminder>
<cc-watch-dispatch date="${today}">
Tarefa automática diária do cc-watch. Dispare AGORA um subagente em BACKGROUND
(Agent tool, subagent_type general-purpose, run_in_background: true) com a tarefa:
"Leia e siga skills/cc-watch/SKILL.md para triar releases novos do Claude Code.
Use exatamente este diretório de estado: ${STATE_DIR} (grave findings.md e
last-reviewed-version aí; NÃO reinfira o path a partir do seu cwd)."
Background para NÃO atrasar o que o usuário pediu neste turno. Mencione em uma linha
que disparou a triagem diária do Claude Code em background, e siga com a tarefa real
do usuário normalmente. Não rode a triagem você mesmo no thread principal.
</cc-watch-dispatch>
</system-reminder>
EOF
fi

exit 0
