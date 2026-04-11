#!/usr/bin/env zsh
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

if [[ "${LC_ALL:-}" == "C.UTF-8" ]]; then
  unset LC_ALL
fi

export CLAUDE_CODE_USE_OPENAI_CODEX=1

exec python3 scripts/openai_codex_regression.py
