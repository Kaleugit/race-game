# Deduction Confidence Rules

Use this rubric before editing any document.

## Confidence Levels
- `high`: explicit statement in source docs, no conflict, no placeholders.
- `medium`: implied by one source plus repository context, but not explicit.
- `low`: guess, assumption, or unresolved conflict.

Only `high` confidence facts should be applied automatically.
`medium` and `low` require human confirmation.

## Placeholder Detection
Treat values like below as non-facts:
- `[Item]`, `[Project Name]`, `[Primary goal]`
- `YYYY-MM-DD`
- empty fields after labels (for example `Name:` with no value)

## Safe Edit Patterns
- Update a specific bullet under an existing heading.
- Replace a single line value when key and scope are explicit.
- Append a dated entry to an existing change log section.

## Forbidden Patterns
- Rewriting the entire file content.
- Deleting whole sections to "clean up" uncertainty.
- Filling ambiguous fields with invented content.

## Conflict Handling
If two sources disagree:
1. Keep current target content unchanged for that conflict area.
2. Record the conflict with file + section.
3. Ask the human for a decision.
