# Secure Coding Baseline

## Input And Output
- Validate and normalize input.
- Encode/escape output where needed.
- Reject unexpected fields or formats.

## Auth And Access
- Enforce least privilege.
- Check authorization on every protected action.
- Avoid implicit trust based on client-side state.

## Data And Secrets
- Do not commit secrets.
- Use environment/secret manager integration.
- Protect sensitive data in logs and responses.

## Error Handling
- Return safe error messages to clients.
- Keep diagnostic details in server logs.
- Do not swallow security-relevant errors.
