---
name: bootstrap
description: Use this skill to initialize a project from BRIEFING.md and leave bootstrap artifacts ready for human handoff. Handles both simple projects (BRIEFING only) and complex projects (BRIEFING + pre-authored specs).

metadata:
  kind: workflow
---

# Bootstrap Skill

This skill is for derived projects in `PRE_BOOTSTRAP` / `INCOMPLETE` state.
It keeps bootstrap lean: fill only mandatory contract fields and stop at handoff.

Supports two entry modes:
- **Simple**: human provides only `BRIEFING.md`. Bootstrap creates all artifacts from scratch.
- **Complex**: human provides `BRIEFING.md` plus pre-authored specs (`docs/PROJECT_SPECS.md`, `docs/specs/*`, etc.). Bootstrap validates, enriches, and aligns existing artifacts without overwriting authored content.

## When To Use
- Project is starting and `Bootstrap Gate` is `PRE_BOOTSTRAP` or `INCOMPLETE`.
- Simple mode: `BRIEFING.md` is the only project-specific input.
- Complex mode: `BRIEFING.md` plus additional specs already exist with project-specific content.

## Inputs To Read
1. `BRIEFING.md` (mandatory)
2. `memory-system/2-tasks.md`
3. `docs/PROJECT_SPECS.md`
4. `memory-system/1-project-context.md`
5. `docs/PREREQUISITES.md` (if exists)
6. `docs/specs/*` (if exists — pre-authored domain specs)
7. `README.md` (root)
8. `AGENTS.md` (Gate 0 bootstrap contract)

## Workflow

### Step 1: Setup Repository Remotes
- Prerequisite: `gh` installed and authenticated (`gh auth status`).
- `gh repo create <owner>/<repo> --private`
- `git remote rename origin upstream`
- `git remote set-url --push upstream DISABLED`
- `git remote add origin <project-repo-url>`
- `git push -u origin main` (or equivalent initial branch)

### Step 1b: Activate Inherited Telemetry Capture

The boilerplate ships the `skills/telemetry/` capture mechanism but does NOT
wire it in its own `.claude/settings.json` (it must not generate telemetry about
itself). A NEW derived project activates it here, once — leaving the environment
COMPLETELY configured, no manual step to remember (DA-zero-toil):
- `./skills/telemetry/scripts/install-hooks.sh`
- Idempotent, self-healing, non-destructive. In one run it wires:
  - the governance stream hooks (SessionStart, UserPromptSubmit + drift alert,
    PreToolUse `Task|Agent|Skill`, SessionEnd) → the `telemetry` orphan branch
    via git plumbing (never pollutes `main`);
  - the SessionStart runtime guard (`session-guard.sh`) that surfaces a
    `<system-reminder>` if the usage tap ever falls off;
  - the non-destructive **statusLine usage tap** (`statusline-tap.sh`), capturing
    the operator's existing status line as a delegate so it renders unchanged.
- Takes effect on the next Claude Code session (the new statusLine loads in a
  fresh session). Verify NOW (no restart needed) with
  `bash skills/telemetry/scripts/smoke.sh` (ALL PASS) — this is the activation's
  PASS evidence.

### Step 2: Detect Entry Mode

Read `BRIEFING.md` and scan for pre-existing authored content:
- Check if `docs/PROJECT_SPECS.md` has project-specific content (not template).
- Check if `docs/specs/` contains any files.
- Check if `docs/PREREQUISITES.md` has project-specific content.

**Simple mode**: PROJECT_SPECS is template/empty AND no files in `docs/specs/`.
**Complex mode**: PROJECT_SPECS has real content OR `docs/specs/` has files.

Report detected mode to human.

### Step 3: Process Artifacts (mode-dependent)

#### Simple Mode

1. (Optional) Generate scaffold with `./skills/bootstrap/scripts/generate-bootstrap-from-briefing.sh`.
   - Script is intentionally mechanical: updates metadata + briefing snapshot.
   - Use `--force-overwrite` only when intentionally replacing refined files.
2. Fill semantic fields from scratch in:
   - `docs/PROJECT_SPECS.md` — all sections from template.
   - `memory-system/1-project-context.md` — name, type, status, goals.
   - `README.md` — project-facing summary.

#### Complex Mode

1. Do NOT run the scaffold script (it would overwrite authored content).
2. Do NOT overwrite existing content in `docs/PROJECT_SPECS.md` or `docs/specs/*`.
3. Instead, for each pre-authored artifact:
   a. **Read** the full content.
   b. **Validate** against bootstrap minimum criteria (structure, required fields).
   c. **Enrich** — fill only missing mandatory fields that the human left empty.
   d. **Align** — check consistency with `BRIEFING.md` and flag contradictions.
   e. **Preserve** — do not rewrite, rephrase, or reorganize authored content.
4. For `memory-system/1-project-context.md`:
   - Fill from PROJECT_SPECS and BRIEFING (this is always generated, not authored).
5. For `README.md`:
   - If template/placeholder: generate from project context.
   - If already authored: preserve, update only metadata fields.

### Step 4: Extract Decision Criteria

Extract technical decision criteria from `BRIEFING.md` (and pre-authored specs in complex mode) into `PROJECT_SPECS.md` Section 10:
- Map explicit project constraints, technology preferences, and quality requirements to structured `CDC-xxx` entries.
- Always include the default criteria (pre-filled in template).
- If BRIEFING contains implicit preferences (e.g., "must be fast" implies delivery speed priority), extract as explicit criteria with source reference.
- In complex mode: also extract criteria from `docs/specs/*` (domain-specific constraints).
- If no extractable criteria found, record `DA-xxx: "No project-specific criteria extracted"`.

### Step 5: Fill Prerequisites

Fill `docs/PREREQUISITES.md` with project-specific items:
- Review each category (Environment, Accounts, Infrastructure, External Dependencies, Design Assets, Domain Knowledge).
- In complex mode: cross-reference `docs/specs/*` for additional prerequisites (APIs, services, tools mentioned in specs).
- Check items already satisfied or mark `N/A` with justification.
- Leave unchecked items that the human must resolve before automated execution.
- Add project-specific prerequisites not covered by the template.

### Step 6: Resolve Ambiguities

Identify ambiguous or missing points across ALL artifacts.
For each ambiguity, attempt resolution using `PROJECT_SPECS.md` Section 10 criteria.
Document each autonomous decision in the "Autonomous Decisions" section of `PROJECT_SPECS.md`.

### Step 7: Escalate to Human

Escalate only decisions that cannot be safely resolved by criteria (see Mandatory Escalation Conditions in `AGENTS.md`). Consolidate remaining questions into a single batch to minimize interruptions.

### Step 8: Update Bootstrap Gate

Confirm bootstrap artifacts are coherent and update `Bootstrap Gate` status:
- Keep `PRE_BOOTSTRAP` while `BRIEFING.md` is still placeholder/template.
- Move to `INCOMPLETE` as soon as there is a first real project-specific briefing.
- Keep `INCOMPLETE` while ambiguities remain.
- Set `COMPLETE` only when mandatory criteria are satisfied and human approves epic decomposition readiness.
- `READY_FOR_EXECUTION` is set later by `/gen-epics` after human approval of `docs/EPICOS.md`.

### Step 9: Validate and Deliver

1. Run (or request) semantic delivery validation via `skills/delivery/` before integration to `main`.
2. Present bootstrap artifacts to human for final approval. Include:
   - Summary of all autonomous decisions made.
   - Pending items in `docs/PREREQUISITES.md` for human resolution.
   - In complex mode: list of pre-authored specs preserved without modification.
3. Recommend running `/review-all` for exhaustive validation (especially in complex mode).

### Step 10: Commit

Bootstrap is a special case: prefer commit/push directly on `main`.
If using delivery script: `./skills/delivery/scripts/deliver-to-main.sh --docs-main`.

## AI Agent Execution Principles

Bootstrap artifacts are consumed by AI agents during planning and execution.
Apply these principles when filling or enriching specs:

- **Domain boundaries**: identify bounded contexts early. Each domain should map to a future epic without overlap. If unclear, mark as `TBD`.
- **Precision over prose**: prefer structured fields (key-value, enums, bullet lists) over narrative. An undefined field (`TBD`) is better than an ambiguous sentence.
- **Machine-verifiable acceptance criteria**: every functional requirement should have at least one criterion evaluable as `PASS`/`FAIL` without human interpretation.
- **Context budget**: keep each artifact self-contained. An agent should not need to read more than 3 files to understand any one domain.
- **Escalation markers**: when a decision cannot be made from input alone, first try Section 10 criteria. If insufficient, record as `NEEDS_HUMAN: <question>`. Record autonomous resolutions as `RESOLVED_BY_CRITERIA: CDC-xxx — <decision>`.
- **Decision criteria extraction**: actively extract criteria from all input sources into `CDC-xxx` entries. Every explicit constraint becomes a structured criterion with source reference.
- **Spec preservation**: in complex mode, pre-authored specs represent deliberate human decisions. Enrich but do not rewrite.

## Mandatory Rules
- If any mandatory bootstrap field is ambiguous, attempt resolution using Section 10 criteria. If insufficient, escalate to human. Document all autonomous resolutions. Never leave a resolvable ambiguity as `NEEDS_HUMAN` when criteria can safely resolve it.
- Keep bootstrap as `INCOMPLETE` until mandatory fields are filled.
- Script output is scaffolding only; semantic completeness must come from human+LLM review.
- `README.md` replacement is expected during simple mode bootstrap; preserve refined project README unless `--force-overwrite` is explicit.
- Avoid editing `BRIEFING.md`. If you must edit, commit before modifying and report to human.
- In complex mode: NEVER overwrite pre-authored content in `docs/PROJECT_SPECS.md` or `docs/specs/*`. Only add missing mandatory fields and flag inconsistencies.

## Scripts
- Scaffold generator: `./skills/bootstrap/scripts/generate-bootstrap-from-briefing.sh`
- Telemetry activation (Step 1b): `./skills/telemetry/scripts/install-hooks.sh`

## Reference Files
- Ambiguity checklist: `references/bootstrap-ambiguity-checklist.md`
- Base bootstrap docs: `../../docs/PROJECT_SPECS.md`
- Base bootstrap docs: `../../memory-system/1-project-context.md`
