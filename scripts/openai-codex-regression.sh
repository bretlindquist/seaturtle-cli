#!/usr/bin/env zsh
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

if [[ "${LC_ALL:-}" == "C.UTF-8" ]]; then
  unset LC_ALL
fi

export SEATURTLE_MAIN_PROVIDER=openai-codex
export SEATURTLE_USE_OPENAI_CODEX=1
export SEATURTLE_USE_GEMINI=0
export CLAUDE_CODE_USE_OPENAI_CODEX=1
export CLAUDE_CODE_USE_GEMINI=0

exec python3 scripts/openai_codex_regression.py
