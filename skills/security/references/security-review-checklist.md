# Security Review Checklist

Use before completing security-sensitive work.

## Risk Scope
- Critical assets and trust boundaries are identified.
- Top abuse cases are listed.
- Acceptance criteria include security checks.

## Core Controls
- Input validation at boundaries.
- Authn/authz checks are explicit.
- Secrets are not hardcoded and are properly sourced.
- Sensitive data handling is minimized and protected.

## Dependency And Config Hygiene
- New dependencies are reviewed for known vulnerabilities.
- Security-relevant configs are explicit (no silent defaults).
- Error responses do not leak sensitive internals.

## Evidence
- Findings severity is documented.
- Mitigations or residual risks are documented.
- PASS/FAIL evidence is linked to acceptance criteria.
