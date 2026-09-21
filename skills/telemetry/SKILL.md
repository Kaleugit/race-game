---
name: telemetry
description: Use this skill's hooks to capture lightweight usage/limits and governance/agent-skill telemetry into a per-repo orphan git branch (NDJSON), and to surface in-session strategic-drift alerts. Hooks only — not invoked as a command. Inherited by derived projects to feed the central monitoring subproject.

metadata:
  kind: workflow
---

# Telemetry Skill (Fase 1 — captura do sistema de monitoramento)

Hooks-only skill. It owns no command flow — it exists to wire Claude Code hooks
and a statusLine wrapper that capture telemetry and to surface strategic-drift
alerts in-session. Same structural role as `gen-governance-core` (a skill that
exists to own hooks).

This is **Fase 1 (captura)** of the monitoring system described in
`MONITORING-DESIGN.md`. The boilerplate **ships** the mechanism (it clones with
the repo) but does **NOT** wire it in its own `.claude/settings.json` — telemetry
is a derived-project feature and the boilerplate must not generate telemetry
about itself. Activation is a per-derived-project step run automatically by
`bootstrap` and `update-upstream` (`scripts/install-hooks.sh`). The central
aggregator, semantic monitor, and dashboard (Fases 2–4) live in a separate
derived subproject and consume what this captures.

## Transport: the per-repo `telemetry` orphan branch

Every producer routes its NDJSON lines through
`scripts/append-to-orphan.sh <logical-path>`, which appends to an **orphan ref**
`refs/heads/telemetry` using pure git plumbing (hash-object → read-tree →
write-tree → commit-tree → update-ref) on a **temporary index** — never touching
the working tree, HEAD, or the real index.

- **Never pollutes `main`** (where the agent works): fragments live only in
  commits of the `telemetry` ref, disjoint from project history (gh-pages
  pattern). No untracked files, no diff, no PR noise, no CI trigger.
- **Does not depend on the agent running `git add`** — it appends on a hook /
  statusLine boundary. Solves the historical "agents never commit telemetry".
- **Concurrency-safe** (flock + compare-and-swap), **fork-safe** (records the
  repo slug at `meta/repo`; an inherited branch from a different repo is
  re-rooted so a fork emits only its own telemetry, never summed into upstream),
  **best-effort async push**, always silent, always exits 0.
- Aggregator reads with `git fetch origin telemetry` + `git show telemetry:<path>`.

## Two capture streams (by data scope)

### Plano A — usage / cost / limits → `usage/<session>.ndjson`

`hooks/statusline-tap.sh` is a **non-destructive statusLine wrapper**. The
statusLine payload is the **only** local, machine-readable source of
`rate_limits` (5h/7d `used_percentage` + `resets_at`) and per-session token
totals for unaffiliated accounts — **no hook payload carries usage** (confirmed
against the official Claude Code hooks reference), which is exactly why the tap
lives here and not in a hook. Per render (throttled, default 60s/session) it
emits one sample:

```json
{"ts":"...","dev":"<git-email>","session":"<uuid>","repo":"<owner/repo>","branch":"<b>",
 "in":<total_input>,"out":<total_output>,"ctx_pct":<n>,
 "h5_pct":<n>,"h5_reset":<ts>,"d7_pct":<n>,"d7_reset":<ts>}
```

It then **delegates rendering to the operator's original status line** (captured
by the installer into `.claude/telemetry-statusline.json`) and prints its output
**unchanged**. No original → a minimal default bar. It never fails the status
line. Project-scoped (RTFM: a project `.claude/settings.json` statusLine
overrides the global one).

### Plano B — governance / workflow → `governance/<session>.ndjson`

`hooks/record-event.sh <category>` appends one **thin** NDJSON line per wired
hook event:

| Hook | Category | Captures |
|------|----------|----------|
| `SessionStart` | `session_start` | session begins (+ `source`) |
| `UserPromptSubmit` | `prompt` | human intent (the prompt) |
| `PreToolUse` matcher `Task\|Agent\|Skill` | `tool` | agent spawns / skill invocations |
| `SessionEnd` | `session_end` | session ends (+ `reason` as `source`) |

```json
{"ts":"...","session":"<uuid>","repo":"<owner/repo>","branch":"<b>","category":"prompt","event":"UserPromptSubmit","detail":"implementar a fase 2"}
{"ts":"...","session":"<uuid>","repo":"<owner/repo>","branch":"<b>","category":"tool","event":"PreToolUse","actor":"agent","name":"backend","detail":"fix auth bug"}
```

- `actor`/`name`: `Skill` → `skill`/`tool_input.skill`; `Task`/`Agent` →
  `agent`/`tool_input.subagent_type`; any other tool → `tool`/`tool_name`.
- `detail` is the **short** semantic signal the Fase 3 monitor needs (prompt
  text / task descriptor / skill args), whitespace-collapsed and **capped to 280
  chars** (not the old 4000-char firehose). Outcomes are NOT stored here — the
  aggregator reads those from git (commits/PRs) and the transcript (DRY).
- **No cost/token fields** in this stream — usage lives in Plano A.
- Empty fields are dropped; `session` is sanitized before use as a path segment.

## Strategic-drift alert (consumer for Fase 3)

`hooks/drift-guard.sh` runs on `UserPromptSubmit`. When the semantic monitor
(Fase 3) writes `memory-system/telemetry/drift.flag` (`<severity>|<message>`),
this hook injects a `<strategic-drift>` system-reminder so the operator sees the
misalignment in-session. Silent when the flag is absent. Same mechanism as
`context-guard.sh` / `footer.sh`.

## Activation & runtime guard (zero-toil)

`scripts/install-hooks.sh` is idempotent, self-healing and non-destructive: in
one run it wires the governance hooks, the SessionStart runtime guard
(`hooks/session-guard.sh`), and the statusLine tap (capturing the operator's
existing bar as a delegate). `bootstrap` and `update-upstream` run it so the
environment is left **active and verified**, with no manual step. The runtime
guard detects if the tap fell off (status line reset, fresh machine) and surfaces
a `<system-reminder>` with remediation — falha-visível, never a silent config
rewrite.

## Design invariants

- All producers emit nothing to stdout and always exit 0 — telemetry must never
  block a turn or disturb the prompt cache / governance footer. (The statusLine
  wrapper's only stdout is the delegated bar; the runtime guard's only stdout is
  the explicit drift/heal reminder.)
- JSON is built with `jq` (never hand-rolled) so values are escaped. If `jq` is
  missing, recording fails silent.
- The orphan branch never touches `main`: no working-tree write, ever.

## Verify

```
bash skills/telemetry/scripts/smoke.sh                 # umbrella (orphan + hooks + install)
bash scripts/tests/test-telemetry-orphan.sh            # 1a plumbing
bash scripts/tests/test-telemetry-statusline-tap.sh    # 1b usage tap
bash scripts/tests/test-telemetry-stream.sh            # 1c governance stream
bash scripts/tests/test-telemetry-install.sh           # activation
```
