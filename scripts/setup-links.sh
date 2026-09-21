#!/usr/bin/env bash
# Cria os links de descoberta de skills: .claude/skills e .agents/skills -> skills/
#
# Eles NÃO são versionados: no Windows são junctions (o git as atravessa e
# duplicaria as 31 skills três vezes no índice), e symlink exige Developer Mode
# ou privilégio de administrador. Rode este script uma vez por clone/cópia.
#
# Uso: bash scripts/setup-links.sh

set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

[ -d skills ] || { echo "ERRO: $ROOT/skills não existe — rode a partir da raiz do projeto." >&2; exit 1; }

link_dir() {
  parent="$1"   # .claude | .agents
  target="$ROOT/skills"
  link="$ROOT/$parent/skills"

  mkdir -p "$ROOT/$parent"

  if [ -L "$link" ]; then
    # Já é link (symlink ou junction — `test -L` detecta os dois no Git Bash).
    if [ -f "$link/implement/SKILL.md" ]; then
      echo "ok    $parent/skills (já aponta para skills/)"
      return 0
    fi
    # Link quebrado ou apontando para o lugar errado: remove só a entrada,
    # nunca o conteúdo real do alvo.
    case "$(uname -s)" in
      MINGW*|MSYS*|CYGWIN*) cmd //c rmdir "$(cygpath -w "$link")" >/dev/null 2>&1 || rm -f "$link" ;;
      *) rm -f "$link" ;;
    esac
  elif [ -d "$link" ]; then
    # Diretório REAL, não link. Acontece quando a pasta do projeto foi duplicada
    # pelo Explorer/cp: a junction vira cópia independente das skills, que passa
    # a divergir de skills/. Aqui rm -rf é seguro justamente por não ser link.
    echo "aviso $parent/skills era cópia real das skills — substituindo por link"
    rm -rf "$link"
  elif [ -e "$link" ]; then
    rm -f "$link"
  fi

  case "$(uname -s)" in
    MINGW*|MSYS*|CYGWIN*)
      cmd //c mklink //J "$(cygpath -w "$link")" "$(cygpath -w "$target")" >/dev/null
      echo "criado $parent/skills (junction)"
      ;;
    *)
      ln -s ../skills "$link"
      echo "criado $parent/skills (symlink)"
      ;;
  esac
}

link_dir .claude
link_dir .agents

echo
echo "Verificação:"
for p in .claude .agents; do
  if [ -f "$p/skills/implement/SKILL.md" ]; then
    echo "  PASS $p/skills resolve para skills/"
  else
    echo "  FAIL $p/skills não resolve" >&2
    exit 1
  fi
done
