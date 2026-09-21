#!/usr/bin/env bash
# install-pre-commit-hook.sh
#
# Installs a local pre-commit hook that:
#   1. Runs `scripts/assert_isolated.sh --pre-commit` — a harness-independent
#      worktree-isolation guard that BLOCKS commits to a TASK-* branch made from
#      the primary repo worktree (the dominant cross-session bleed signature;
#      anthropics/claude-code #33045). This forces every committer — including
#      manually-launched agent teams and ad-hoc agents — to do task work in a
#      dedicated linked worktree.
#   2. Runs `scripts/validate-all.sh` — governance validation. Intended for
#      projects running governance CI in mode `off` (see `.governance/ci-mode.conf`).
#
# Installed into the SHARED hooks dir (`git rev-parse --git-common-dir`/hooks)
# so the hook applies to every linked worktree, not just the one it was run from.
#
# Idempotent: safe to run multiple times. If a pre-commit hook already exists
# and is not this one, it is backed up to `<hooks>/pre-commit.bak` (no
# overwrite of an existing `.bak`).
#
# Usage:
#   ./scripts/install-pre-commit-hook.sh
#
# Exit codes:
#   0 success (installed or already current)
#   1 not inside a git repository or other fatal error
set -euo pipefail

MARKER="# managed-by: scripts/install-pre-commit-hook.sh"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "ERROR: not inside a git repository." >&2
  exit 1
fi

# Use the COMMON git dir so the hook is shared by every linked worktree
# (a hook installed in a per-worktree dir would not protect other worktrees).
COMMON_DIR="$(cd "$(git rev-parse --git-common-dir)" && pwd)"
HOOKS_DIR="$COMMON_DIR/hooks"
HOOK_PATH="$HOOKS_DIR/pre-commit"

mkdir -p "$HOOKS_DIR"

# Backup any pre-existing non-managed hook (do not overwrite a previous backup).
if [ -f "$HOOK_PATH" ] && ! grep -qF "$MARKER" "$HOOK_PATH"; then
  if [ ! -e "$HOOK_PATH.bak" ]; then
    cp "$HOOK_PATH" "$HOOK_PATH.bak"
    echo "Backed up existing pre-commit hook to $HOOK_PATH.bak"
  else
    echo "WARN: $HOOK_PATH.bak already exists; not overwriting backup."
  fi
fi

cat > "$HOOK_PATH" <<'HOOK'
#!/usr/bin/env bash
# managed-by: scripts/install-pre-commit-hook.sh
# Pre-commit gate: (1) worktree-isolation guard, then (2) governance validation
# (authoritative when `.governance/ci-mode.conf` is `off`).
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"

# (1) Worktree-isolation guard — blocks task-branch commits from the primary
# repo worktree. Forces manual teams / ad-hoc agents into a dedicated worktree.
GUARD="$REPO_ROOT/scripts/assert_isolated.sh"
if [ -f "$GUARD" ]; then
  [ -x "$GUARD" ] || chmod +x "$GUARD" || true
  if ! "$GUARD" --pre-commit; then
    echo "ERROR: pre-commit blocked by worktree-isolation guard (see message above)." >&2
    exit 1
  fi
fi

# (2) Governance validation.
VALIDATOR="$REPO_ROOT/scripts/validate-all.sh"
if [ ! -x "$VALIDATOR" ]; then
  if [ -f "$VALIDATOR" ]; then
    chmod +x "$VALIDATOR" || true
  else
    echo "WARN: $VALIDATOR not found; skipping local governance validation."
    exit 0
  fi
fi

"$VALIDATOR"
HOOK

chmod +x "$HOOK_PATH"
echo "Installed pre-commit hook at $HOOK_PATH"
echo "Hook runs: scripts/assert_isolated.sh --pre-commit, then scripts/validate-all.sh"
