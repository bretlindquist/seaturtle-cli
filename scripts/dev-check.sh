#!/usr/bin/env zsh
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

# macOS bash warns on LC_ALL=C.UTF-8 because that locale usually does not
# exist there. Keep the repo check quiet and local instead of changing the
# user's global shell locale.
if [[ "${LC_ALL:-}" == "C.UTF-8" ]]; then
  unset LC_ALL
fi

if ! command -v node >/dev/null 2>&1; then
  echo "error: node is required" >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "error: npm is required" >&2
  exit 1
fi

if ! command -v bun >/dev/null 2>&1; then
  echo "error: bun is required" >&2
  echo "install it with: curl -fsSL https://bun.sh/install | bash" >&2
  exit 1
fi

echo "Node: $(node --version)"
echo "npm:  $(npm --version)"
echo "Bun:  $(bun --version)"

build_cmd=(node scripts/build-cli.mjs --no-minify)

echo
echo "[1/2] Building"
if ! "${build_cmd[@]}"; then
  echo
  echo "Initial build failed. Resetting generated overlay install state and retrying once."
  rm -rf .cache/workspace/node_modules
  rm -f .cache/workspace/.overlay-install.json
  "${build_cmd[@]}"
fi

echo
echo "[2/3] Smoke check"
node dist/cli.js --help >/dev/null
node dist/cli.js auth status --json >/dev/null
python3 scripts/openai_codex_regression.py --self-test >/dev/null
bun scripts/side_question_context_selftest.ts >/dev/null
bun scripts/project_todo_selftest.ts >/dev/null
bun scripts/telegram_typing_lifecycle_selftest.ts >/dev/null
bash scripts/repl-footer-controls-smoke.sh >/dev/null

echo
echo "[3/3] Lint"
npm run lint:openai-codex >/dev/null

echo
echo "dev-check passed"
