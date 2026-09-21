#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
TASK_ID_GREP='TASK-[a-z0-9][a-z0-9-]*-(EP-[0-9]{3,}-[0-9]{2,}|[0-9]{14})'
TASK_REF_GREP='task-[a-z0-9][a-z0-9-]*-(([Ee][Pp]-[0-9]{3,}-[0-9]{2,})|[0-9]{14})'
SOURCE_BRANCH=""
PR_TITLE=""
PR_BODY=""
# ADR-018 (decisão do gestor, 2026-08-24): auto-merge passa a ser OPT-IN.
# Motivos: (1) o GitHub recusa habilitar auto-merge em PR draft, e agora todo PR
# nasce draft; (2) sem required checks neste repositório, o auto-merge mergeia
# IMEDIATAMENTE, sem esperar a validação — foi o que ocorreu no PR #266; (3) a
# regra do gestor é merge sempre manual. Ligue com `--auto-merge` se precisar.
AUTO_MERGE=0
DOCS_MAIN=0
FORCE_PUSH=0
KEEP_WORKTREE_ON_ERROR=0
VALIDATION_NOTE=""
BOILERPLATE_REVIEW_NOTE=""
PROTECTED_PATHS_FILE="$ROOT_DIR/skills/delivery/references/protected-boilerplate-paths.txt"
declare -a PROTECTED_PATTERNS=()
declare -a GH_REPO_ARGS=()
declare -A ALLOWED_TASK_IDS=()
ORIGIN_REPO=""
if command -v gh >/dev/null 2>&1; then
  export GH_TOKEN="${GH_TOKEN:-$(gh auth token 2>/dev/null || true)}"
fi
TASKS_DIR="$ROOT_DIR/memory-system/tasks"
TASK_FILE=""

usage() {
  cat <<'USAGE'
Usage:
  deliver-to-main.sh [--source-branch <branch>] [--title "<pr-title>"] [--body "<pr-body>"] [--validation-note <path>] [--boilerplate-review-note <path>] [--auto-merge] [--no-auto-merge] [--force-push] [--docs-main] [--keep-worktree-on-error]

Examples:
  deliver-to-main.sh
  deliver-to-main.sh --source-branch TASK-oda-20260224123000-backend
  deliver-to-main.sh --validation-note memory-system/task-docs/TASK-oda-20260224123000-backend-delivery-validation-2026-02-25.md
  deliver-to-main.sh --boilerplate-review-note memory-system/task-docs/TASK-oda-20260224123000-backend-boilerplate-review-2026-02-25.md
  deliver-to-main.sh --force-push
  deliver-to-main.sh --title "chore(task-oda-20260224123000): deliver backend scope"
  deliver-to-main.sh --docs-main
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source-branch)
      SOURCE_BRANCH="${2:-}"
      shift 2
      ;;
    --title)
      PR_TITLE="${2:-}"
      shift 2
      ;;
    --body)
      PR_BODY="${2:-}"
      shift 2
      ;;
    --validation-note)
      VALIDATION_NOTE="${2:-}"
      shift 2
      ;;
    --boilerplate-review-note)
      BOILERPLATE_REVIEW_NOTE="${2:-}"
      shift 2
      ;;
    --auto-merge)
      AUTO_MERGE=1
      shift
      ;;
    --no-auto-merge)
      # Mantida por compatibilidade: já é o padrão desde o ADR-018.
      AUTO_MERGE=0
      shift
      ;;
    --force-push)
      FORCE_PUSH=1
      shift
      ;;
    --docs-main)
      DOCS_MAIN=1
      shift
      ;;
    --keep-worktree-on-error)
      KEEP_WORKTREE_ON_ERROR=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "ERROR: unknown option '$1'"
      usage
      exit 1
      ;;
  esac
done

cleanup_on_error() {
  local exit_code="${1:-0}"
  local common_dir_raw=""
  local common_dir=""

  # Success path: existing finalize_workspace_context already handled cleanup.
  [[ "$exit_code" -eq 0 ]] && return 0

  # Honor explicit opt-out.
  if [[ "$KEEP_WORKTREE_ON_ERROR" -eq 1 ]]; then
    echo "Delivery aborted (exit $exit_code). Worktree preserved at '$ROOT_DIR' due to --keep-worktree-on-error."
    return 0
  fi

  # Only act on linked task worktrees ('.git' is a file). Never touch the primary workspace.
  [[ -f "$ROOT_DIR/.git" ]] || return 0

  # If worktree disappeared mid-flight, nothing to clean.
  [[ -d "$ROOT_DIR" ]] || return 0

  # Preserve user work: never destroy a worktree with uncommitted changes.
  if [[ -n "$(git -C "$ROOT_DIR" status --porcelain 2>/dev/null)" ]]; then
    echo "Delivery aborted (exit $exit_code). Worktree at '$ROOT_DIR' preserved due to uncommitted changes. Inspect and remove manually." >&2
    return 0
  fi

  common_dir_raw="$(git -C "$ROOT_DIR" rev-parse --git-common-dir 2>/dev/null || true)"
  [[ -z "$common_dir_raw" ]] && return 0
  if [[ "$common_dir_raw" == /* ]]; then
    common_dir="$common_dir_raw"
  else
    common_dir="$(cd "$ROOT_DIR/$common_dir_raw" && pwd -P)"
  fi

  # cd out of the worktree before removing (git refuses if shell cwd is inside it).
  cd "$(dirname "$ROOT_DIR")" 2>/dev/null || cd /
  if git --git-dir="$common_dir" worktree remove --force "$ROOT_DIR" >/dev/null 2>&1; then
    git --git-dir="$common_dir" worktree prune --expire now >/dev/null 2>&1 || true
    echo "Delivery aborted (exit $exit_code). Linked task worktree removed: $ROOT_DIR" >&2
  else
    echo "Delivery aborted (exit $exit_code). Worktree at '$ROOT_DIR' could not be removed automatically; remove manually." >&2
  fi
}

trap 'cleanup_on_error "$?"' EXIT

if ! git -C "$ROOT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ERROR: not a git repository: $ROOT_DIR"
  exit 1
fi

if [[ -n "$(git -C "$ROOT_DIR" status --porcelain)" ]]; then
  echo "ERROR: working tree must be clean before delivery"
  exit 1
fi

finalize_workspace_context() {
  local branch_tip_merged="${1:-0}"
  local common_dir_raw=""
  local common_dir=""

  if [[ -f "$ROOT_DIR/.git" ]]; then
    if [[ -n "$(git -C "$ROOT_DIR" status --porcelain)" ]]; then
      echo "ERROR: linked worktree must remain clean after delivery finalization."
      exit 1
    fi

    if [[ "$branch_tip_merged" -ne 1 ]]; then
      echo "Linked task worktree kept on branch '$SOURCE_BRANCH' until its current tip is merged into origin/main."
      return 0
    fi

    common_dir_raw="$(git -C "$ROOT_DIR" rev-parse --git-common-dir)"
    if [[ "$common_dir_raw" == /* ]]; then
      common_dir="$common_dir_raw"
    else
      common_dir="$(cd "$ROOT_DIR/$common_dir_raw" && pwd -P)"
    fi

    cd "$(dirname "$ROOT_DIR")"
    git --git-dir="$common_dir" worktree remove "$ROOT_DIR"
    git --git-dir="$common_dir" worktree prune --expire now >/dev/null 2>&1 || true
    echo "Linked task worktree removed after merge: $ROOT_DIR"
    return 0
  fi

  if ! git -C "$ROOT_DIR" show-ref --verify --quiet "refs/heads/main"; then
    echo "ERROR: local branch 'main' not found; cannot finalize workspace context."
    exit 1
  fi

  git -C "$ROOT_DIR" checkout main
  git -C "$ROOT_DIR" pull --ff-only origin main

  if [[ -n "$(git -C "$ROOT_DIR" status --porcelain)" ]]; then
    echo "ERROR: workspace must remain clean after delivery finalization."
    exit 1
  fi

  echo "Workspace ready for next task: clean working tree on branch 'main'."
}

detect_origin_repo() {
  local remote_url repo
  remote_url="$(git -C "$ROOT_DIR" remote get-url origin 2>/dev/null || true)"
  if [[ -z "$remote_url" ]]; then
    echo "ERROR: git remote 'origin' is required for delivery"
    exit 1
  fi

  repo="$remote_url"
  repo="${repo#git@github.com:}"
  repo="${repo#https://github.com/}"
  repo="${repo#ssh://git@github.com/}"
  repo="${repo%.git}"

  if [[ "$repo" != */* ]]; then
    echo "ERROR: could not resolve origin repository from remote URL: $remote_url"
    exit 1
  fi

  echo "$repo"
}

add_allowed_task_id() {
  local task_id="$1"
  [[ -z "$task_id" ]] && return
  ALLOWED_TASK_IDS["$task_id"]=1
}

collect_dependency_task_ids() {
  local root_task_id="$1"
  local queue=()
  local current task_file depends_line dep
  declare -A seen=()

  queue+=("$root_task_id")
  seen["$root_task_id"]=1
  add_allowed_task_id "$root_task_id"

  while [[ "${#queue[@]}" -gt 0 ]]; do
    current="${queue[0]}"
    queue=("${queue[@]:1}")
    task_file="$TASKS_DIR/$current.md"

    if [[ ! -f "$task_file" ]]; then
      continue
    fi

    depends_line="$(sed -nE 's/^- Depends On:[[:space:]]*(.*)$/\1/p' "$task_file" | head -n 1)"
    [[ -z "$depends_line" ]] && continue

    while IFS= read -r dep; do
      [[ -z "$dep" ]] && continue
      add_allowed_task_id "$dep"
      if [[ -z "${seen[$dep]:-}" ]]; then
        seen["$dep"]=1
        queue+=("$dep")
      fi
    done < <(echo "$depends_line" | grep -oE "$TASK_ID_GREP" || true)
  done
}

is_task_allowed() {
  local task_id="$1"
  [[ -n "${ALLOWED_TASK_IDS[$task_id]:-}" ]]
}

detect_cross_task_file_contamination() {
  local branch="$1"
  local foreign_paths=()
  local path matched_task
  local changed

  changed="$(git -C "$ROOT_DIR" diff --name-only "origin/main...$branch")"
  while IFS= read -r path; do
    [[ -z "$path" ]] && continue
    if [[ "$path" =~ ($TASK_ID_GREP) ]]; then
      matched_task="${BASH_REMATCH[1]}"
      if ! is_task_allowed "$matched_task"; then
        foreign_paths+=("$path")
      fi
    fi
  done <<< "$changed"

  if [[ "${#foreign_paths[@]}" -gt 0 ]]; then
    echo "ERROR: cross-task contamination detected. Branch '$branch' contains files for other tasks:"
    printf '  - %s\n' "${foreign_paths[@]}"
    echo "Rebase/cherry-pick to isolate only '$TASK_ID' artifacts (or declared dependencies) before delivery."
    exit 1
  fi
}

detect_overlapping_task_commits() {
  local branch="$1"
  local msg task_ref normalized
  local foreign_refs=()
  declare -A seen=()

  while IFS= read -r msg; do
    [[ -z "$msg" ]] && continue

    while IFS= read -r task_ref; do
      [[ -z "$task_ref" ]] && continue
      if ! is_task_allowed "$task_ref" && [[ -z "${seen[$task_ref]:-}" ]]; then
        seen["$task_ref"]=1
        foreign_refs+=("$task_ref")
      fi
    done < <(echo "$msg" | grep -oE "$TASK_ID_GREP" || true)

    while IFS= read -r task_ref; do
      [[ -z "$task_ref" ]] && continue
      normalized="TASK-${task_ref#task-}"
      if ! is_task_allowed "$normalized" && [[ -z "${seen[$normalized]:-}" ]]; then
        seen["$normalized"]=1
        foreign_refs+=("$normalized")
      fi
    done < <(echo "$msg" | grep -oE "$TASK_REF_GREP" || true)
    # --first-parent --no-merges: scan only the branch's own commits, not the
    # ones pulled in by a `git merge --no-ff upstream/main` (update-upstream
    # sync). Those carry upstream TASK-* subjects that would otherwise read as
    # cross-task contamination and wrongly abort the sanctioned sync delivery.
    # The strong path-based guard (detect_cross_task_file_contamination) still
    # inspects the full net diff, so genuine file-level overlap is unaffected.
  done < <(git -C "$ROOT_DIR" log --first-parent --no-merges --format='%s' "origin/main..$branch")

  if [[ "${#foreign_refs[@]}" -gt 0 ]]; then
    echo "ERROR: overlapping commits detected in '$branch' referencing other task IDs:"
    printf '  - %s\n' "${foreign_refs[@]}"
    echo "Rebase/squash the branch to keep only '$TASK_ID' scope before delivery."
    exit 1
  fi
}

ensure_gh_repo_binding() {
  if ! command -v gh >/dev/null 2>&1; then
    return
  fi

  local detected
  detected="$(gh repo view --json nameWithOwner --jq '.nameWithOwner' 2>/dev/null || true)"
  if [[ -n "$detected" && "$detected" != "$ORIGIN_REPO" ]]; then
    echo "ERROR: gh is targeting '$detected', but origin points to '$ORIGIN_REPO'."
    echo "Run: gh repo set-default \"$ORIGIN_REPO\""
    exit 1
  fi

  GH_REPO_ARGS=(-R "$ORIGIN_REPO")
}

# Reliability wrapper for `gh pr create` (issue #14 Problem 1).
# Path 1 attempts the normal GraphQL-backed command under a 15s timeout.
# Path 2 falls back to the REST endpoint (`POST /repos/<owner>/<repo>/pulls`),
# which has historically remained reachable when GraphQL `pr create` returns
# 401 or hangs (see issue #13 and downstream artboss_poc PR #387).
# Circuit-breaker: no retries; second failure aborts the script with a clear
# message so the agent does NOT diagnose network issues (see AGENTS.md
# §"GitHub network failures").
gh_pr_create_with_fallback() {
  local base="" head="" title="" body=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --base)  base="${2:-}";  shift 2 ;;
      --head)  head="${2:-}";  shift 2 ;;
      --title) title="${2:-}"; shift 2 ;;
      --body)  body="${2:-}";  shift 2 ;;
      *)       echo "ERROR: gh_pr_create_with_fallback: unknown arg '$1'" >&2; return 2 ;;
    esac
  done

  local timeout_cmd=(timeout 15)
  command -v timeout >/dev/null 2>&1 || timeout_cmd=()

  # Path 1: native gh pr create with timeout. Use `&& :` / `|| rc=$?` so we
  # never toggle the caller's `set -e` state.
  local rc=0
  # ADR-018: o PR NASCE EM DRAFT. Enquanto estiver em draft, o job de governança
  # é pulado sem alocar runner (custo zero); ele só é marcado como pronto no
  # último passo da entrega (`mark_pr_ready`), depois do último push da branch.
  "${timeout_cmd[@]}" gh "${GH_REPO_ARGS[@]}" pr create \
    --base "$base" --head "$head" \
    --title "$title" --body "$body" --draft >/dev/null 2>&1 || rc=$?
  if [[ $rc -eq 0 ]]; then
    return 0
  fi
  echo "WARN: 'gh pr create' failed (exit $rc) — falling back to REST API." >&2

  if [[ -z "${ORIGIN_REPO:-}" ]]; then
    echo "ERROR: cannot fall back to REST: ORIGIN_REPO is empty (gh-unavailable)." >&2
    return 1
  fi

  # Build the JSON payload without depending on jq (controlled fields only).
  local esc_title esc_head esc_base esc_body payload
  esc_title="$(printf '%s' "$title" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g')"
  esc_head="$(printf  '%s' "$head"  | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g')"
  esc_base="$(printf  '%s' "$base"  | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g')"
  esc_body="$(printf  '%s' "$body"  | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' | awk 'BEGIN{ORS="\\n"} {print}' | sed 's/\\n$//')"
  # ADR-018: `"draft":true` também aqui. Esquecer neste caminho seria SILENCIOSO —
  # o fallback abriria um PR já pronto e a validação dispararia antes da hora.
  payload="{\"title\":\"$esc_title\",\"head\":\"$esc_head\",\"base\":\"$esc_base\",\"body\":\"$esc_body\",\"draft\":true}"

  rc=0
  local resp
  resp="$("${timeout_cmd[@]}" gh api -X POST "repos/$ORIGIN_REPO/pulls" --input - <<< "$payload" 2>&1)" || rc=$?
  if [[ $rc -eq 0 ]] && printf '%s' "$resp" | grep -qE '"number"[[:space:]]*:[[:space:]]*[0-9]+'; then
    echo "INFO: PR created via gh api REST (fallback)." >&2
    return 0
  fi

  echo "ERROR: PR creation failed via both GraphQL and REST (gh-unavailable). REST response/error:" >&2
  printf '%s\n' "$resp" | head -n 5 >&2
  return 1
}

# mark_pr_ready <pr-number> <branch>
# ADR-018: tira o PR de draft, disparando o run único de governança sobre o SHA
# final. DEVE ser chamada por último, depois do último push da branch.
# Falha aqui é FATAL de propósito: um PR que fica em draft não pode ser mergeado
# e nunca receberia validação — silenciar isso entregaria um PR morto ao gestor.
mark_pr_ready() {
  local pr_number="$1" branch="$2"

  # Um PR em conflito com a base não tem merge ref; o checkout do CI falharia já
  # depois do ready. Avisar aqui é mais barato que descobrir no run vermelho.
  git -C "$ROOT_DIR" fetch origin main --quiet 2>/dev/null || true
  if ! git -C "$ROOT_DIR" merge-base --is-ancestor origin/main "$branch" 2>/dev/null; then
    echo "WARN: '$branch' está atrás de origin/main. Se houver conflito, o CI falha no checkout." >&2
  fi

  if ! gh "${GH_REPO_ARGS[@]}" pr ready "$pr_number"; then
    echo "ERROR: 'gh pr ready' falhou para o PR #$pr_number." >&2
    echo "       O PR ficou em DRAFT: não será validado pelo CI nem pode ser mergeado." >&2
    echo "       Recupere com: gh pr ready $pr_number" >&2
    return 1
  fi
  return 0
}

# check_gh_billing_exhaustion <branch>
# Best-effort detection of GitHub Actions billing exhaustion. Looks at the most
# recent governance.yml run on the given branch; if its log contains the known
# billing-exhaustion markers, prints the literal token `gh-billing-exhausted`
# on stderr and returns 1. Returns 0 silently when no signal is found (including
# when `gh` itself is unable to list/view runs — that case is handled by the
# existing `gh-unavailable` flow elsewhere).
check_gh_billing_exhaustion() {
  local branch="${1:-}"
  if [[ -z "$branch" ]]; then
    return 0
  fi
  if ! command -v gh >/dev/null 2>&1; then
    return 0
  fi

  local last_run_id=""
  last_run_id="$(gh "${GH_REPO_ARGS[@]}" run list --workflow=governance.yml --branch "$branch" --limit 1 --json databaseId --jq '.[0].databaseId // empty' 2>/dev/null || true)"
  if [[ -z "$last_run_id" ]]; then
    return 0
  fi

  # Inspect both the run summary (annotations show up here when jobs are not
  # started at all — typical billing case) and the raw log (covers messages
  # surfaced mid-run). Both are bounded with `head -n 200` to stay cheap.
  local run_summary="" run_log=""
  run_summary="$(gh "${GH_REPO_ARGS[@]}" run view "$last_run_id" 2>&1 | head -n 200 || true)"
  run_log="$(gh "${GH_REPO_ARGS[@]}" run view "$last_run_id" --log 2>&1 | head -n 200 || true)"
  if [[ -z "$run_summary" && -z "$run_log" ]]; then
    return 0
  fi

  if printf '%s\n%s' "$run_summary" "$run_log" | grep -qE 'payments have failed|spending limit'; then
    echo "ERROR: gh-billing-exhausted — CI cannot run due to GitHub Actions billing exhaustion. Resolve billing or set .governance/ci-mode.conf to 'off' before retry." >&2
    return 1
  fi
  return 0
}

push_source_branch() {
  local output=""
  local rc=0

  if [[ "$FORCE_PUSH" -eq 1 ]]; then
    git -C "$ROOT_DIR" push --force-with-lease -u origin "$SOURCE_BRANCH"
    return
  fi

  set +e
  output="$(git -C "$ROOT_DIR" push -u origin "$SOURCE_BRANCH" 2>&1)"
  rc=$?
  set -e

  if [[ "$rc" -eq 0 ]]; then
    [[ -n "$output" ]] && echo "$output"
    return
  fi

  echo "$output"
  if echo "$output" | grep -qiE 'non-fast-forward|fetch first|rejected'; then
    echo "ERROR: push rejected (non-fast-forward). Rebase branch and rerun with --force-push if needed."
  else
    echo "ERROR: failed to push branch '$SOURCE_BRANCH'."
  fi
  exit 1
}

upsert_task_field() {
  local file="$1"
  local key="$2"
  local value="$3"
  local tmp

  tmp="$(mktemp)"
  awk -v key="$key" -v value="$value" '
    BEGIN { updated = 0 }
    {
      if (index($0, "- " key ":") == 1) {
        print "- " key ": " value
        updated = 1
      } else {
        print $0
      }
    }
    END {
      if (!updated) {
        print "- " key ": " value
      }
    }
  ' "$file" > "$tmp"
  mv "$tmp" "$file"
}

ensure_on_source_branch() {
  local current
  current="$(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD)"
  if [[ "$current" != "$SOURCE_BRANCH" ]]; then
    git -C "$ROOT_DIR" checkout "$SOURCE_BRANCH"
  fi
}

# Is the repo-wide governance CI disabled (.governance/ci-mode.conf first line == off)?
# When off, governance.yml does NOT run validate-all on PR/push, so CI is NOT the
# repo-wide net — the per-task gate must run the full validators locally instead.
governance_ci_off() {
  local f="$ROOT_DIR/.governance/ci-mode.conf"
  [[ -f "$f" ]] && [[ "$(head -n 1 "$f" | tr -d '[:space:]')" == "off" ]]
}

# Pre-merge governance gate scope (#57/#62, hardened per H1). Picks the cheapest gate
# that still guarantees a repo-wide net SOMEWHERE:
#   - ci-mode=off       → no CI net → run the FULL repo-wide validate-all locally so
#                         the per-task gate is never weaker than it was before #62;
#   - origin/main known → cheap INCREMENTAL validate-changed (base origin/main…tip),
#                         the common case (CI/governance.yml is the repo-wide net);
#   - origin/main absent→ fall back to full validate-all so a gate always runs.
# Fetches origin/main first (M2) so the incremental diff is against a FRESH base.
run_governance_gate() {
  local tip="$1"
  git -C "$ROOT_DIR" fetch origin main --quiet 2>/dev/null || true
  if governance_ci_off; then
    echo "NOTE: ci-mode=off (governance CI disabled) — running repo-wide validate-all.sh as the local net"
    "$ROOT_DIR/scripts/validate-all.sh"
  elif git -C "$ROOT_DIR" rev-parse --verify --quiet "origin/main^{commit}" >/dev/null; then
    "$ROOT_DIR/scripts/validate-changed.sh" --base origin/main --tip "$tip"
  else
    echo "NOTE: origin/main unavailable — falling back to repo-wide validate-all.sh"
    "$ROOT_DIR/scripts/validate-all.sh"
  fi
}

update_task_delivery_metadata() {
  local pr_number="$1"
  local delivery_status="$2"
  local merged_at="$3"
  local now merged_fmt task_commit_ref

  if [[ -z "$TASK_FILE" || ! -f "$TASK_FILE" ]]; then
    echo "WARNING: task file not found for metadata update: $TASK_FILE"
    return 0
  fi

  ensure_on_source_branch

  now="$(date '+%Y-%m-%d %H:%M')"
  upsert_task_field "$TASK_FILE" "Status" "COMPLETED"
  upsert_task_field "$TASK_FILE" "Last Updated" "$now"
  upsert_task_field "$TASK_FILE" "Completed" "$now"
  upsert_task_field "$TASK_FILE" "Delivery Handoff" "DONE (owner: skills/delivery)"
  upsert_task_field "$TASK_FILE" "Delivery PR" "#${pr_number}"
  upsert_task_field "$TASK_FILE" "Delivery Status" "$delivery_status"

  if [[ -n "$merged_at" && "$merged_at" != "null" ]]; then
    merged_fmt="$(date -d "$merged_at" '+%Y-%m-%d %H:%M' 2>/dev/null || echo "$merged_at")"
    upsert_task_field "$TASK_FILE" "Delivery Merged At" "$merged_fmt"
  else
    upsert_task_field "$TASK_FILE" "Delivery Merged At" "Pending"
  fi

  if git -C "$ROOT_DIR" diff --quiet -- "$TASK_FILE"; then
    echo "Task delivery metadata already up to date: $TASK_FILE"
    return 0
  fi

  # Incremental gate on the metadata change (#57/#62): this commit touches only the
  # task file, so validate the change set — not the whole repo a second time (scope
  # picked by run_governance_gate: full validate-all when CI is off / origin/main
  # absent, incremental otherwise).
  run_governance_gate HEAD

  git -C "$ROOT_DIR" add -- "$TASK_FILE"
  if git -C "$ROOT_DIR" diff --cached --quiet; then
    echo "No staged task metadata changes after update: $TASK_FILE"
    return 0
  fi

  task_commit_ref="task-${TASK_ID#TASK-}"
  git -C "$ROOT_DIR" commit -m "chore(${task_commit_ref}-delivery): update task delivery metadata"
  push_source_branch
}

if [[ -z "$SOURCE_BRANCH" ]]; then
  SOURCE_BRANCH="$(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD)"
fi

ORIGIN_REPO="$(detect_origin_repo)"
ensure_gh_repo_binding

if [[ "$DOCS_MAIN" -eq 1 ]]; then
  if [[ "$SOURCE_BRANCH" != "main" ]]; then
    echo "ERROR: --docs-main requires source branch 'main'"
    exit 1
  fi

  "$ROOT_DIR/scripts/validate-all.sh"

  git -C "$ROOT_DIR" fetch origin

  ahead_count="$(git -C "$ROOT_DIR" rev-list --count origin/main..main)"
  if [[ "$ahead_count" == "0" ]]; then
    echo "No local commits ahead of origin/main. Nothing to push."
    exit 0
  fi

  if ! bash "$ROOT_DIR/scripts/validate-docs-only-scope.sh" --from "origin/main" --to "main"; then
    echo "ERROR: --docs-main supports documentation-only scope only."
    exit 1
  fi

  git -C "$ROOT_DIR" pull --ff-only origin main
  git -C "$ROOT_DIR" push origin main
  echo "Documentation delivery complete on main (docs-only scope validated)."
  finalize_workspace_context 1
  exit 0
fi

if [[ "$SOURCE_BRANCH" == "main" ]]; then
  echo "ERROR: source branch cannot be main (use --docs-main only for allowed direct-to-main delivery)"
  exit 1
fi

if ! git -C "$ROOT_DIR" show-ref --verify --quiet "refs/heads/$SOURCE_BRANCH"; then
  echo "ERROR: source branch not found locally: $SOURCE_BRANCH"
  exit 1
fi

if [[ ! "$SOURCE_BRANCH" =~ ^(TASK-[a-z0-9][a-z0-9-]*-(EP-[0-9]{3,}-[0-9]{2,}|[0-9]{14}))-[a-z0-9-]+$ ]]; then
  echo "ERROR: source branch does not follow pattern TASK-<github-login>-<task-key>-<role|workstream>"
  exit 1
fi

TASK_ID="${BASH_REMATCH[1]}"
TASK_FILE="$TASKS_DIR/$TASK_ID.md"

# Pre-merge gate — INCREMENTAL by default, scoped to THIS task's change set (#57/#62).
# The repo-wide validate-all.sh is the right net for the whole repo but the wrong scope
# for a per-task gate: it re-scans untouched files on the serial critical path
# (validate-conventions is super-linear in git history) and couples sibling tasks (a
# missing completion field left by task A would block task B's delivery).
# validate-changed.sh validates only base...tip ∪ working tree, so a red is attributable
# to THIS branch. The repo-wide net still runs in CI (governance.yml on PR + push) and —
# under the gohorse optimistic model — once per wave at the boundary after merge.
# run_governance_gate falls back to the FULL validate-all when CI is disabled
# (ci-mode=off) or origin/main is unavailable, so a repo-wide net always exists somewhere.
run_governance_gate "$SOURCE_BRANCH"

load_protected_patterns() {
  local line

  if [[ ! -f "$PROTECTED_PATHS_FILE" ]]; then
    echo "ERROR: protected boilerplate paths file not found: $PROTECTED_PATHS_FILE"
    exit 1
  fi

  while IFS= read -r line; do
    line="$(echo "$line" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')"
    [[ -z "$line" ]] && continue
    [[ "$line" == \#* ]] && continue
    PROTECTED_PATTERNS+=("$line")
  done < "$PROTECTED_PATHS_FILE"

  if [[ "${#PROTECTED_PATTERNS[@]}" -eq 0 ]]; then
    echo "ERROR: no protected boilerplate patterns found in $PROTECTED_PATHS_FILE"
    exit 1
  fi
}

is_protected_boilerplate_path() {
  local path="$1"
  local pattern
  for pattern in "${PROTECTED_PATTERNS[@]}"; do
    # shellcheck disable=SC2053
    # intentional glob matching against protected-boilerplate-paths.txt patterns
    if [[ "$path" == $pattern ]]; then
      return 0
    fi
  done
  return 1
}

resolve_validation_note() {
  local task_id="$1"
  local task_docs_dir="$ROOT_DIR/memory-system/task-docs"
  local candidates=()
  local matched=()
  local file

  if [[ ! -d "$task_docs_dir" ]]; then
    return 1
  fi

  while IFS= read -r file; do
    candidates+=("$file")
  done < <(find "$task_docs_dir" -maxdepth 1 -type f -name "*${task_id}*.md" | sort)

  for file in "${candidates[@]}"; do
    if grep -q '^# Delivery Validation Note' "$file"; then
      matched+=("$file")
    fi
  done

  if [[ "${#matched[@]}" -eq 1 ]]; then
    echo "${matched[0]}"
    return 0
  fi

  return 1
}

resolve_boilerplate_review_note() {
  local task_id="$1"
  local task_docs_dir="$ROOT_DIR/memory-system/task-docs"
  local candidates=()
  local matched=()
  local file

  if [[ ! -d "$task_docs_dir" ]]; then
    return 1
  fi

  while IFS= read -r file; do
    candidates+=("$file")
  done < <(find "$task_docs_dir" -maxdepth 1 -type f -name "*${task_id}*.md" | sort)

  for file in "${candidates[@]}"; do
    if grep -q '^# Boilerplate Change Review Note' "$file"; then
      matched+=("$file")
    fi
  done

  if [[ "${#matched[@]}" -eq 1 ]]; then
    echo "${matched[0]}"
    return 0
  fi

  return 1
}

resolve_note_path() {
  local value="$1"
  if [[ "$value" != /* ]]; then
    value="$ROOT_DIR/$value"
  fi
  echo "$value"
}

validate_boilerplate_review_note() {
  local note_path="$1"

  if [[ ! -f "$note_path" ]]; then
    echo "ERROR: boilerplate review note file not found: $note_path"
    exit 1
  fi

  if ! grep -q '^# Boilerplate Change Review Note' "$note_path"; then
    echo "ERROR: boilerplate review note does not use expected template heading: $note_path"
    exit 1
  fi

  if ! grep -Eq "Task ID:[[:space:]]*${TASK_ID}" "$note_path"; then
    echo "ERROR: boilerplate review note Task ID does not match branch task '$TASK_ID': $note_path"
    exit 1
  fi

  if ! grep -Eq 'Architect review completed:[[:space:]]*YES' "$note_path"; then
    echo "ERROR: boilerplate review note must include 'Architect review completed: YES'."
    exit 1
  fi

  if ! grep -Eq 'Delivery unblock:[[:space:]]*YES' "$note_path"; then
    echo "ERROR: boilerplate review note must include 'Delivery unblock: YES'."
    exit 1
  fi

  if ! grep -Eq 'Upstream action:[[:space:]]*(NONE|ISSUE|PR|PR_AND_ISSUE)' "$note_path"; then
    echo "ERROR: boilerplate review note has invalid Upstream action (expected NONE|ISSUE|PR|PR_AND_ISSUE)."
    exit 1
  fi
}

extract_upstream_action() {
  local note_path="$1"
  local action
  action="$(sed -nE 's/^- Upstream action:[[:space:]]*(NONE|ISSUE|PR|PR_AND_ISSUE).*/\1/p' "$note_path" | head -n 1)"
  echo "$action"
}

git -C "$ROOT_DIR" fetch origin
collect_dependency_task_ids "$TASK_ID"
detect_cross_task_file_contamination "$SOURCE_BRANCH"
detect_overlapping_task_commits "$SOURCE_BRANCH"
load_protected_patterns

changed_files="$(git -C "$ROOT_DIR" diff --name-only "origin/main...$SOURCE_BRANCH")"
protected_changes=""
while IFS= read -r path; do
  [[ -z "$path" ]] && continue
  if is_protected_boilerplate_path "$path"; then
    protected_changes+="${path}"$'\n'
  fi
done <<< "$changed_files"

if [[ -n "$protected_changes" ]]; then
  if [[ -z "$BOILERPLATE_REVIEW_NOTE" ]]; then
    if ! BOILERPLATE_REVIEW_NOTE="$(resolve_boilerplate_review_note "$TASK_ID")"; then
      echo "ERROR: protected boilerplate files changed on branch '$SOURCE_BRANCH':"
      printf '%s' "$protected_changes"
      echo "Run architect evaluation and create review note from:"
      echo "  memory-system/templates/boilerplate-change-review-template.md"
      echo "Then rerun with --boilerplate-review-note <path>."
      exit 1
    fi
  fi

  BOILERPLATE_REVIEW_NOTE="$(resolve_note_path "$BOILERPLATE_REVIEW_NOTE")"
  validate_boilerplate_review_note "$BOILERPLATE_REVIEW_NOTE"
  upstream_action="$(extract_upstream_action "$BOILERPLATE_REVIEW_NOTE")"
  echo "Protected boilerplate changes detected and approved by architect review note:"
  echo "  $BOILERPLATE_REVIEW_NOTE"
  if [[ "$upstream_action" == "PR" || "$upstream_action" == "PR_AND_ISSUE" || "$upstream_action" == "ISSUE" ]]; then
    echo "Architect requested upstream follow-up ($upstream_action)."
    echo "Use ./skills/delivery/scripts/manage-upstream-contribution.sh after delivery validation."
  fi
fi

if [[ -z "$VALIDATION_NOTE" ]]; then
  if ! VALIDATION_NOTE="$(resolve_validation_note "$TASK_ID")"; then
    echo "ERROR: delivery validation note not found for task '$TASK_ID'."
    echo "Create one from memory-system/templates/delivery-validation-template.md and pass --validation-note <path>."
    exit 1
  fi
fi

if [[ "$VALIDATION_NOTE" != /* ]]; then
  VALIDATION_NOTE="$ROOT_DIR/$VALIDATION_NOTE"
fi

if [[ ! -f "$VALIDATION_NOTE" ]]; then
  echo "ERROR: validation note file not found: $VALIDATION_NOTE"
  exit 1
fi

if ! grep -q '^# Delivery Validation Note' "$VALIDATION_NOTE"; then
  echo "ERROR: validation note does not use expected template heading: $VALIDATION_NOTE"
  exit 1
fi

if ! grep -Eq "Task ID:[[:space:]]*${TASK_ID}" "$VALIDATION_NOTE"; then
  echo "ERROR: validation note Task ID does not match branch task '$TASK_ID': $VALIDATION_NOTE"
  exit 1
fi

if ! grep -Eq 'Ready for delivery script:[[:space:]]*YES' "$VALIDATION_NOTE"; then
  echo "ERROR: validation note is not marked as ready for delivery (expected 'Ready for delivery script: YES')."
  exit 1
fi

# Issue #49: keep docs/INDEX-API.md in sync. Delivery is the natural per-task
# boundary, so regenerate the API index here and commit it on the source branch —
# but ONLY when substantive content changed. The generator stamps a volatile
# `Last regenerated` timestamp, so a timestamp-only delta is discarded to avoid a
# noise commit (and an always-failing CI staleness gate). CI enforces staleness
# (governance.yml). No-op when there are no taggable sources.
regenerate_api_index() {
  local gen="$ROOT_DIR/skills/gen-api-index/scripts/gen-api-index.sh"
  local idx="$ROOT_DIR/docs/INDEX-API.md"
  [[ -x "$gen" ]] || { echo "WARN: gen-api-index not found; skipping index regeneration." >&2; return 0; }
  local before=""
  [[ -f "$idx" ]] && before="$(grep -v 'Last regenerated' "$idx")"
  if ! bash "$gen" >/dev/null 2>&1; then
    echo "WARN: gen-api-index failed; skipping index regeneration." >&2
    git -C "$ROOT_DIR" checkout -- docs/INDEX-API.md 2>/dev/null || true
    return 0
  fi
  local after=""
  [[ -f "$idx" ]] && after="$(grep -v 'Last regenerated' "$idx")"
  if [[ "$before" == "$after" ]]; then
    git -C "$ROOT_DIR" checkout -- docs/INDEX-API.md 2>/dev/null || true   # timestamp-only delta: discard
    return 0
  fi
  git -C "$ROOT_DIR" add docs/INDEX-API.md
  git -C "$ROOT_DIR" commit -q -m "chore(${TASK_ID}): regenerate docs/INDEX-API.md (#49)"
  echo "docs/INDEX-API.md regenerated and committed (substantive change)."
}
regenerate_api_index

push_source_branch

if ! command -v gh >/dev/null 2>&1; then
  echo "ERROR: GitHub CLI (gh) is required for PR delivery"
  echo "Push completed. Create a PR manually from '$SOURCE_BRANCH' to 'main'."
  exit 1
fi

if [[ -z "$PR_TITLE" ]]; then
  PR_TITLE="chore(${TASK_ID}): delivery ${SOURCE_BRANCH}"
fi

if [[ -z "$PR_BODY" ]]; then
  PR_BODY="Delivery prepared by skills/delivery after syntax and semantic validation."
fi

pr_number="$(gh "${GH_REPO_ARGS[@]}" pr list --head "$SOURCE_BRANCH" --base main --state open --json number --jq '.[0].number' 2>/dev/null || true)"

if [[ -z "$pr_number" || "$pr_number" == "null" ]]; then
  if ! gh_pr_create_with_fallback --base main --head "$SOURCE_BRANCH" --title "$PR_TITLE" --body "$PR_BODY"; then
    echo "ERROR: aborting delivery — PR creation is unavailable. Resolve and rerun once GitHub is reachable." >&2
    exit 1
  fi
  pr_number="$(gh "${GH_REPO_ARGS[@]}" pr list --head "$SOURCE_BRANCH" --base main --state open --json number --jq '.[0].number')"
  echo "PR created: #$pr_number"
else
  echo "Using existing PR: #$pr_number"
fi

delivery_status="PR_OPEN_MANUAL_MERGE"
if [[ "$AUTO_MERGE" -eq 1 ]]; then
  delivery_status="PR_OPEN_AUTO_MERGE"
fi

pr_merged_at="$(gh "${GH_REPO_ARGS[@]}" pr view "$pr_number" --json mergedAt --jq '.mergedAt // ""' 2>/dev/null || true)"
if [[ -n "$pr_merged_at" && "$pr_merged_at" != "null" ]]; then
  delivery_status="MERGED"
fi

# ATENÇÃO À ORDEM (ADR-018): esta chamada faz o ÚLTIMO push da branch (commit de
# metadata). Por isso o PR só pode sair de draft DEPOIS dela — marcar antes
# deixaria o check preso a um commit que o push seguinte tornaria obsoleto.
update_task_delivery_metadata "$pr_number" "$delivery_status" "$pr_merged_at"

# ADR-018: PR sai de draft aqui, no fim de tudo. É o que dispara o run único de
# governança, sobre o SHA final. Se qualquer passo acima tiver falhado, o script
# já terá abortado e o PR permanece em draft — fail-safe: nunca é apresentado
# como pronto para merge sem ter passado pela validação local.
mark_pr_ready "$pr_number" "$SOURCE_BRANCH"

# ADR-018 (decisão do gestor): o alarme de esgotamento de cota vivia dentro do
# bloco de auto-merge, que agora é opt-in — ficaria morto por padrão. Movido para
# cá, logo após o ready, que é quando um run passa a ser esperado. É exatamente o
# aviso que faltou no incidente de 22/08 (ADR-017).
if ! check_gh_billing_exhaustion "$SOURCE_BRANCH"; then
  exit 1
fi

if [[ "$AUTO_MERGE" -eq 1 ]]; then
  # Só chega aqui com `--auto-merge` explícito. Precisa ser DEPOIS do ready: o
  # GitHub recusa habilitar auto-merge em PR draft.
  echo "WARN: --auto-merge pedido explicitamente. Sem required checks configurados neste" >&2
  echo "      repositório, o GitHub pode mergear IMEDIATAMENTE, sem esperar a validação." >&2
  merge_rc=0
  gh "${GH_REPO_ARGS[@]}" pr merge "$pr_number" --auto --merge || merge_rc=$?
  if [[ $merge_rc -ne 0 ]]; then
    echo "ERROR: 'gh pr merge --auto' failed (exit $merge_rc). Inspect PR #$pr_number manually." >&2
    exit 1
  fi
  echo "Auto-merge enabled for PR #$pr_number."
else
  echo "PR #$pr_number marcado como pronto — a validação de governança dispara agora sobre o SHA final."
  echo "Merge manual do gestor após o check verde."
fi

branch_tip_merged=0
git -C "$ROOT_DIR" fetch origin
if git -C "$ROOT_DIR" merge-base --is-ancestor "$SOURCE_BRANCH" "origin/main"; then
  branch_tip_merged=1
fi

finalize_workspace_context "$branch_tip_merged"
