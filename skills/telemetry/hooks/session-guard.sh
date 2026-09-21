#!/usr/bin/env bash
# session-guard.sh — SessionStart runtime guard for the usage/limits tap (DA-activation).
#
# Same safety-net posture as Claude Code's own auto-update and the repo's
# cc-watch / drift-guard / footer hooks: check at the session boundary, and when
# something is off SURFACE it (inject a <system-reminder>) rather than silently
# rewriting the operator's config mid-session. It never edits settings.json — a
# human-facing setting (the status line) must not change under the operator
# without their action; the zero-toil ACTIVATION is done explicitly and
# idempotently by bootstrap + update-upstream (which run install-hooks.sh). This
# guard is the falha-visível net that catches drift between those runs (status
# line reset, fresh machine, wrapper overwritten).
#
# "Never rewrites the operator's config" is about settings.json — the human-facing
# file. The ONE thing this guard does write (the #63 self-heal below) is the
# per-machine, gitignored sidecar telemetry-statusline.json: internal plumbing the
# wrapper reads, NOT a human-facing setting. Healing it silently is correct (it only
# restores the operator's OWN status line as the delegate); settings.json is still
# never touched.
#
# This hook is wired ONLY in projects where telemetry was activated (the
# boilerplate never wires it — it must not generate telemetry about itself), so
# if it runs at all, the tap is INTENDED to be on. Always exits 0; silent when
# the tap is healthy.

set -u

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Without jq we cannot inspect settings; the rest of telemetry also fails silent
# without jq, so stay silent here too (no actionable signal to give).
command -v jq >/dev/null 2>&1 || exit 0

# "Wired" must imply "can persist": the orphan plumbing needs git. If git is
# absent the tap may be wired yet capture nothing — surface that instead of a
# false "healthy". (flock is no longer required; append-to-orphan falls back to
# an mkdir-lock on systems without it.)
if ! command -v git >/dev/null 2>&1; then
  cat <<'EOF'
<system-reminder>
<telemetry-tap-down>
A telemetria deste projeto está configurada, mas `git` não está disponível no
PATH — a captura grava na branch órfã via git e portanto NÃO consegue persistir
nada. Instale o git (ou rode o Claude Code num ambiente com git) para reativar a
captura de uso/governança. Origem: skills/telemetry/hooks/session-guard.sh.
</telemetry-tap-down>
</system-reminder>
EOF
  exit 0
fi

tap_wired() {
  local f="$1"
  [ -f "$f" ] || return 1
  jq -e '(.statusLine.command // "") | test("statusline-tap.sh")' "$f" >/dev/null 2>&1
}

# The tap is healthy if the wrapper is the statusLine command in either the
# committed project settings or the per-machine local settings (Local overrides
# Project, so either being set means a wrapper renders).
if tap_wired "$PROJECT_DIR/.claude/settings.json" \
  || tap_wired "$PROJECT_DIR/.claude/settings.local.json"; then
  # Self-heal the per-machine delegate sidecar (#63). The wrapper wiring lives in
  # VERSIONED settings.json (shared across clones), but the delegate sidecar is
  # per-machine and gitignored — created only by install-hooks.sh. On a fresh
  # clone (or any machine where the installer never ran), the wrapper is wired
  # yet the sidecar is absent → the wrapper has no delegate and silently falls
  # back to its minimal bar, swallowing the operator's REAL status line. Recapture
  # it here, at SessionStart — the exact trigger that was missing on those
  # machines — when the sidecar is missing OR corrupted into a self-reference.
  # Cheap and idempotent; the wrapper re-reads the sidecar on every render, so the
  # real status line returns within THIS session (no restart). Shares the capture
  # logic with install-hooks.sh (DRY) via capture-delegate.sh.
  sidecar="$PROJECT_DIR/.claude/telemetry-statusline.json"
  capture="$PROJECT_DIR/skills/telemetry/scripts/capture-delegate.sh"
  if [ -f "$capture" ] \
    && { [ ! -f "$sidecar" ] || grep -q 'statusline-tap.sh' "$sidecar" 2>/dev/null; }; then
    bash "$capture" "$PROJECT_DIR/.claude/settings.json" "$sidecar" >/dev/null 2>&1 || true
  fi
  exit 0
fi

cat <<'EOF'
<system-reminder>
<telemetry-tap-down>
A captura de USO/LIMITES (statusLine tap) deste projeto NÃO está ativa: o
.claude/settings.json não aponta o statusLine para skills/telemetry/hooks/statusline-tap.sh.
Enquanto isso, tokens da sessão e os limites 5h/7d (rate_limits) não são amostrados
para o monitoramento central — o stream de governança (hooks) pode continuar, mas a
visão de custo/limite por dev fica cega.

Para reativar (idempotente, preserva seu statusLine atual como delegate):
  ./skills/telemetry/scripts/install-hooks.sh
Depois reinicie a sessão do Claude Code (o statusLine novo só carrega em sessão nova).
Origem: skills/telemetry/hooks/session-guard.sh (guarda de runtime da Fase 1).
</telemetry-tap-down>
</system-reminder>
EOF

exit 0
