# Epic Quality Checklist

Use this checklist before finalizing `docs/EPICOS.md`.

- Each epic has a stable ID (`EP-XXX`).
- Sequence is explicit and coherent.
- Each epic maps to a single bounded domain (no cross-domain epics).
- Each epic has explicit `Scope In` and `Scope Out` lists (no narrative prose).
- Each epic has a completion signal that is observable and machine-verifiable where possible.
- Each epic has escalation triggers defined.
- Dependencies are explicit (`None` or specific epic IDs).
- No duplicated scope between epics.
- No implementation-level task granularity inside epics.
- Existing `DONE` epics are not rewritten in scope.
- Undefined items are marked `TBD`, not filled with ambiguous prose.
- Document is in the project language.
- Human explicitly approved the final epic list.
- Approved epic documentation is committed on `main`.
