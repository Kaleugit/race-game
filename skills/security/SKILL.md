---
name: security
description: Use this skill when assessing or implementing application security controls, threat modeling, secure coding, auth/authz hardening, secrets handling, dependency vulnerability remediation, compliance-oriented checks, and security acceptance criteria for releases.
user-invocable: false
metadata:
  kind: persona
---

# Security Skill

This skill standardizes security work in the boilerplate with pragmatic, risk-based gates.

## When To Use
- When assessing security controls, threat modeling, auth hardening, or vulnerability remediation.

## Additional Inputs To Read
Assume baseline context from `AGENTS.md` is already loaded.

1. `memory-system/workstreams/security/notes.md` (mandatory if exists)
2. `INTEGRITY-RULES.md`
3. `docs/PROJECT_SPECS.md`
4. `docs/architecture.md`
5. `docs/api-contracts.md` (if API/system boundary is in scope)
6. `memory-system/task-docs/TASK-<github-login>-<task-key>-[role|workstream]-planning-[YYYY-MM-DD].md` (if exists)

## Workflow
1. Identify scope, assets, trust boundaries, and threat surface.
2. Map top risks by impact and likelihood.
3. Define minimum controls and acceptance checks for the task.
4. Implement/fix controls with root-cause mindset.
5. Validate security behavior with explicit evidence.
6. Record findings, residual risks, and decisions.

## Mandatory Rules
- Application source code must stay in `src/` (or `*/src/` in monorepo).
- Never hide vulnerabilities with superficial patches.
- Keep authn/authz and input validation explicit at boundaries.
- If risk acceptance or expected behavior is unclear, ask the human before closing.
- Resolve ambiguities using `AGENTS.md` Decision Resolution Precedence and `PROJECT_SPECS.md` Section 10 criteria before escalating to human. Escalate only for Mandatory Escalation Conditions (`AGENTS.md`).

## Required Outputs
- Security findings list with severity (`high`/`medium`/`low`).
- Mitigations implemented or explicit residual risk documented.
- Acceptance criteria status with evidence (`PASS`/`FAIL`).
- Updated task planning/report artifacts when task-driven.

## Quality Bar
- Top risks in scope are addressed or formally escalated.
- No fake green state from disabled checks/tests.
- Security-sensitive changes are traceable in docs and reports.

## Reference Files
- Security review checklist: `references/security-review-checklist.md`
- Threat modeling (lite): `references/threat-modeling-lite.md`
- Secure coding baseline: `references/secure-coding-baseline.md`
- Vulnerability and incident response: `references/vulnerability-response.md`
