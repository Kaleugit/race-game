# Threat Modeling (Lite)

## Step 1: Context
- What component or flow is changing?
- Which actors interact with it?
- What data is sensitive?

## Step 2: Attack Surface
- Entry points (API/UI/jobs/webhooks).
- External dependencies.
- Privileged operations.

## Step 3: Top Threats
For each threat:
- Threat description
- Impact (`high`/`medium`/`low`)
- Likelihood (`high`/`medium`/`low`)
- Proposed mitigation

## Step 4: Decision
- Mitigated now
- Deferred with explicit risk acceptance
- Blocked pending human decision
