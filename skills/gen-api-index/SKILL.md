---
name: gen-api-index
description: Use this skill to regenerate `docs/INDEX-API.md` from JSDoc tags (`@module`, `@summary`, `@element`, `@attr`, `@fires`, `@slot`, `@method`) present in the project's JS/TS sources. Generates an explicit coverage header so readers see what fraction of files is documented and treats absence as "not yet tagged" rather than "doesn't exist". Useful before large PRs, during onboarding, and as a hook into pre-commit on derived projects.

metadata:
  kind: workflow
  user-invocable: true
---

<!--
 @module gen-api-index/SKILL
 Meta example: this skill's own SKILL.md and generator script carry the JSDoc
 head tags that the skill itself enforces in derived projects. The CI step
 added by this task does not scan the boilerplate's `skills/` tree — only
 derived `src/` and `public/` — but the tag is here as a concrete reference.
-->

# Gen API Index Skill

This skill regenerates `docs/INDEX-API.md` from JSDoc tags in the project's source files. It is the human-facing companion of the on-touch CI enforcement added to `.github/workflows/governance.yml` (see `AGENTS.md` §"Code Conventions").

## When To Use
- Before large PRs that touch many JS/TS files, to refresh the documented API surface.
- During onboarding, to see at a glance which modules and custom elements are documented.
- As a hook integration in derived projects (pre-commit or manual run).
- After bulk renames or refactors to keep the index aligned with the codebase.

## How To Invoke
Run the generator directly:
```
./skills/gen-api-index/scripts/gen-api-index.sh
```

Optional configuration: place additional globs in `.governance/api-index.conf` (one glob per line, `#` for comments). Defaults are `src/**/*.{js,ts,jsx,tsx}` and `public/**/*.js`.

## Inputs To Read
1. `.governance/api-index.conf` (optional — additional globs).
2. JS/TS files matching the configured globs.
3. Existing `docs/INDEX-API.md` (only to overwrite, not to read).

## Workflow
1. Resolve the active glob list (defaults + `.governance/api-index.conf` if present).
2. Enumerate matching files via `find` (portable; no globstar dependency). Test
   files (`*.test.*`, `*.spec.*`) are excluded — the index covers API surface,
   not test modules.
3. For each file, parse the head tags. A tag is recognized whether it sits in a
   block comment (` * @module`), a line comment (`// @module`), or bare — matching
   the on-touch JSDoc gate (`governance.yml`), which also accepts `//`:
   - `@module <name> — <one-line purpose>` (backend modules).
   - `@element <tag-name>` with optional `@attr`, `@fires`, `@slot`, `@method` (frontend custom elements).
   - `@summary <one-line>` capturing each exported surface.
4. Compute coverage counts (tagged-files / total-candidates).
5. Render `docs/INDEX-API.md` with the coverage header, transition-phase guidance, the Backend modules section, and the Frontend custom elements section.
6. Write the file atomically.

## Mandatory Rules
- Use only bash + standard POSIX tooling (`find`, `grep`, `sed`, `awk`). No new npm/Python dependencies. KISS / CDT-003.
- Never read or modify source files beyond the JSDoc head block.
- Re-running on identical sources must produce a byte-identical output except for the `Last regenerated` timestamp.
- Files without `@module`/`@element` head tags are NOT auto-summarized. They are counted in coverage but absent from the index — this is the "transition phase" contract.
- Respect `AGENTS.md` Decision Resolution Precedence and `PROJECT_SPECS.md` Section 10 criteria for ambiguity. Escalate only on Mandatory Escalation Conditions.

## Required Outputs
- `docs/INDEX-API.md` regenerated with header + sections.
- Exit code 0 on success; non-zero on parse/IO error.

## Quality Bar
- Output is deterministic given the same inputs.
- Coverage header is honest — does not hide untagged files behind a fake "100%".
- The index points readers to fix the absence (boy-scout rule), not at the skill maintainer.

## Reference Files
- JSDoc conventions and examples: `references/jsdoc-conventions.md`
- Test harness: `scripts/tests/test-gen-api-index.sh`
