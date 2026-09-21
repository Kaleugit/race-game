# Language Policy

This repository uses a strict language split to improve AI reliability and reduce ambiguity.
Classification: AI-facing governance artifact.

## 1. Canonical Language For AI-Facing Artifacts
Use **English only** in AI-facing artifacts:
- `AGENTS.md`, `CLAUDE.md`, `INTEGRITY-RULES.md`
- `skills/**`
- `memory-system/**`
- operational templates and governance rules

## 2. User-Facing Documentation Language
Use the **product language** for human-facing documentation.
For this boilerplate default, use **PT-BR** in:
- `README.md`
- `boilerplate-docs/**`
- `docs/**` (except files explicitly marked as AI-facing)

Explicit AI-facing exceptions that may remain in English:
- `docs/language-policy.md`
- `docs/PREREQUISITES.md`

## 3. One Language Per File
Do not mix languages inside the same file.
Allowed exceptions:
- code, commands, paths, and identifiers
- fixed tokens such as `PASS`/`FAIL`
- external proper names
- localized string literals required to generate user-facing templates/docs

## 4. Encoding Standard
All text files must use UTF-8 encoding.
For PT-BR content, preserve proper accents and diacritics.

## 5. Migration Rule
When touching a mixed-language file, normalize it to the canonical language for that file category in the same change.
