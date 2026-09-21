# Issue Template (boilerplate-level)

Use this template when the classification is `boilerplate-level`. The
issue is filed against `eduoda/agents` and should be self-contained: a
maintainer should understand the gap, the proposed rule, and the
originating evidence without opening the source conversation.

## Title pattern

```
governance: <one-sentence rule statement in imperative form>
```

Examples:
- `governance: persist expensive computed artifacts so they survive re-runs`
- `governance: re-confirm intent before implementing after heavy exploration`
- `governance: persona skills must never edit governance artifacts they consume`

Keep under 80 characters when possible.

## Body template

```markdown
## Context
<1-2 sentences. What kind of work surfaced this gap. Which project. What
the agent was doing.>

## Observed incident
<2-4 sentences describing the divergence concretely. If transcript
citations are available, include 2-3 short quotes with their references.
Otherwise note "no transcript citation available".>

## Why this belongs in the boilerplate
<2-3 sentences. Why this rule generalizes beyond the originating
project. Which downstream projects would benefit.>

## Proposed rule

Target source document: `<AGENTS.md | INTEGRITY-RULES.md | docs/PROJECT_SPECS.md>`
Target section: `<exact section heading>`

```yaml
- id: <to-be-assigned-by-gen-governance-core>
  category: <integrity | applicable to NN only>
  priority: <blocking | high | normal>
  trigger: <before_task_start | before_tool_use | before_declaring_done | on_compaction | on_session_start | always>
  action: <imperative verb phrase>
  rationale: <optional, only if WHY is non-obvious>
  source: <file>#<section>
```

## Suggested category
- [ ] `non_negotiable` (integrity safeguard)
- [ ] `rules[]` (operational scaffolding)
- [ ] `cdt[]` (decision criterion / tie-breaker)

## Acceptance
- [ ] Rule added to the indicated source document.
- [ ] `/gen-governance-core` regenerates `.governance/CORE.md` without
      exceeding the 10K hook output cap.
- [ ] At least one downstream project review confirms the rule is
      applicable there.

## Originating session
- Project: `<path or name>`
- Transcript: `<.jsonl filename, if available>`
- Date: `<YYYY-MM-DD>`
```

## Command template

After the human reviews and says "abra a issue", run:

```bash
gh issue create \
  --repo eduoda/agents \
  --title "<title from template>" \
  --body "$(cat <<'EOF'
<full body from template, interpolated with the analysis>
EOF
)"
```

Use a HEREDOC for the body so the Markdown stays intact and shell
expansion doesn't corrupt it.

## When to add labels

If the maintainer's repo uses labels, suggest `governance`, `boilerplate`,
and one of `incident:drift` / `incident:gap` / `incident:upstream`.
Do not invent labels without checking — the persona may run
`gh label list --repo eduoda/agents` if uncertain.
