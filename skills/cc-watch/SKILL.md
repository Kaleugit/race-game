---
name: cc-watch
description: Use this skill to triage new Claude Code releases for changes relevant to this boilerplate (orchestration, subagents, hooks, skills, isolation, MCP) and surface a curated finding without polluting the working directory. Runs daily as a background subagent (auto-dispatched by a hook) or on demand via /cc-watch.

metadata:
  kind: workflow
---

# cc-watch Skill — Claude Code release triage

Detects what changed in Claude Code upstream and decides, **semantically**, whether
any change justifies adjusting this boilerplate. A dumb keyword diff is deliberately
avoided: genuinely new primitives arrive with new vocabulary (e.g. "agent teams",
"Workflow tool" did not exist before they shipped), so relevance is judged by reading
the full new entries, not by matching known terms.

## Execution model

- **Auto (daily):** the `hooks/user-prompt.sh` hook injects, at most once per day, a
  system-reminder instructing the main agent to dispatch a **background** subagent
  (`run_in_background: true`) that reads and follows this skill. Background so it never
  blocks the user's current task. There is no cheap pre-filter gate — running one agent
  per day is negligible cost, and the agent's reading is the only robust relevance test.
- **Manual:** `/cc-watch` runs the same procedure in-session.

## State (all under /tmp — never pollute the working directory)

State dir: `/tmp/cc-watch/<repo-basename>/` (namespaced per repo so derived projects
don't collide). **When auto-dispatched, the hook passes the exact `STATE_DIR` in your
task prompt — use it verbatim and do NOT re-derive it from your cwd** (a background
subagent's cwd can differ from the project dir, which would make the notify hook and
this skill look at different dirs and silently lose the finding). For a manual
`/cc-watch` run with no path given, compute it from the repo root, not `$PWD`:
`STATE_DIR="/tmp/cc-watch/$(basename "$(git rev-parse --show-toplevel)")"`.

Files:

- `last-reviewed-version` — highest Claude Code version already triaged. Baseline.
- `findings.md` — the ephemeral **inbox** of relevant findings (human-facing, Portuguese).
  Its mere presence is what later prompts notify about. Absent/empty ⇒ nothing pending.

`/tmp` is the inbox, not the archive. The durable record is whatever the human chooses
to act on (a boilerplate edit, an issue, a doc). Do not write findings into the repo.

## Procedure

1. **Resolve paths.**
   - `STATE_DIR`: use the one given in your task prompt; only if absent (manual run),
     `STATE_DIR="/tmp/cc-watch/$(basename "$(git rev-parse --show-toplevel)")"`. Then
     `mkdir -p "$STATE_DIR"`.
   - `INSTALLED="$(claude --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -n1)"`.

2. **Baseline.** Read `$STATE_DIR/last-reviewed-version` if present; else baseline =
   `$INSTALLED`. The triage window is every version **strictly greater** than the baseline.
   - **cc-watch is forward-only** (conscious decision): on first activation the baseline is
     the installed version, so versions at or below what you run today are never triaged —
     cc-watch only watches the delta from activation forward. This is the MVP scope.
   - **Abort if the baseline is indeterminable:** if there is no `last-reviewed-version` AND
     `$INSTALLED` came back empty (e.g. `claude` not on PATH), stop silently — do not write
     findings, do not advance state. Same fail-silent posture as a network error.

3. **Fetch the changelog** (deterministic, full text — do NOT use a summarizing fetch):
   ```
   curl -fsSL https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md
   ```
   If the fetch fails (offline, non-200), stop silently: do not touch state, do not write
   findings. Try again next run.

4. **Extract new entries.** The changelog lists sections as `## X.Y.Z` headers, **newest
   first (descending), with no `v` prefix**. Compare versions by **semver, numerically field
   by field** (MAJOR, MINOR, PATCH as integers) — never lexicographically (`2.1.100` would
   string-sort below `2.1.9`). Practical recipe: the topmost header is the latest
   (`grep -oE '^## [0-9]+\.[0-9]+\.[0-9]+' CHANGELOG | head -n1`), and the new window is every
   header version that `sort -V` ranks strictly above the baseline. If there are none, go to
   step 7 with no findings.

5. **Judge relevance — semantically.** For each new entry, ask: *does this touch the surface
   this boilerplate actually uses, in a way that could justify changing it?* The boilerplate's
   surface, for orientation (not a filter — read everything):
   - Orchestration: the Workflow tool, the Agent tool / subagents, agent teams, parallelism,
     background tasks, inter-agent messaging (`implement`, `gohorse`, `parallel`).
   - Hooks & settings: new hook events, payload fields, `settings.json`, env vars, permissions
     (governance injection + telemetry depend on these).
   - Skills & commands: skills, slash commands, `.claude/agents`, plan mode, output styles.
   - Isolation & integrations: git worktrees / isolation, MCP servers & tools, statusline,
     context/compaction, memory.
   Ignore pure bug fixes, cosmetic/UX tweaks, and anything with no bearing on how the
   boilerplate orchestrates agents or wires governance. Be conservative: when unsure whether
   something is relevant, include it but mark it as *baixa confiança*.

6. **Write findings** (only if at least one relevant item) to `$STATE_DIR/findings.md`,
   in Portuguese, concise. One block per item:
   ```
   ## <versão> — <título curto>
   - **O que é:** <1-2 frases>
   - **Por que importa aqui:** <qual peça do boilerplate é tocada>
   - **O que talvez ajustar:** <sugestão concreta, ou "avaliar">
   - **Confiança:** alta | média | baixa
   ```
   Prepend a one-line header: `# cc-watch — <N> achado(s) relevante(s) (baseline <X> → atual <Y>), <data>`.
   If there were new versions but none relevant, do **not** create `findings.md` (and if a stale
   one exists from a prior run that the human already saw, leave it — see step 8).

7. **Advance the baseline.** Write the **latest** version (the topmost `## X.Y.Z` header,
   per the semver rule in step 4) to `$STATE_DIR/last-reviewed-version`. Do this even when
   nothing was relevant, so the next run does not re-scan the same versions. Never advance it
   on a failed fetch (step 3) or an indeterminable baseline (step 2).

8. **Report.**
   - Auto/background run: your final message is the return value — state plainly how many new
     versions were scanned and whether `findings.md` was written (and where). Do not dump the
     full changelog.
   - The `hooks/user-prompt.sh` notify path will surface `findings.md` on subsequent prompts
     until it is cleared. **Removing it is the default action after presenting it** — the
     durable record is whatever the human decides to do, not this inbox. Keep the file only if
     the human explicitly asks to revisit it later; otherwise `rm` it so the notify stops.

## Invariants

- Never write to the repository working tree. All state lives under `/tmp/cc-watch/`.
- Fail silent and non-destructive on network errors — never advance the baseline on a failed fetch.
- Background dispatch must use `run_in_background: true` so it never delays the user's turn.
- No paid infrastructure: triage is in-session Claude (free); the changelog fetch is a plain curl.

## Inheritance (derived projects)

Unlike the `telemetry` skill (shipped but deliberately NOT wired in the boilerplate's own
`.claude/settings.json`), cc-watch **is** wired here, because watching Claude Code releases is
maintenance of the boilerplate itself. Derived projects clone that wiring and will therefore
also dispatch a daily background triage. That is usually desirable (any Claude Code project
benefits from knowing what changed upstream), but it is a recurring cost. A derived project
that does not want it can **opt out** by removing the `skills/cc-watch/hooks/user-prompt.sh`
entry from its `.claude/settings.json` `UserPromptSubmit` array — the skill stays available for
manual `/cc-watch` runs.
