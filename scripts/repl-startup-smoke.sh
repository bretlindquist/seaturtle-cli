#!/usr/bin/env zsh
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

if ! command -v script >/dev/null 2>&1; then
  echo "repl-startup-smoke skipped: 'script' is unavailable" >&2
  exit 0
fi

tmp_out="$(mktemp)"
cleanup() {
  rm -f "$tmp_out"
}
trap cleanup EXIT

# This is a startup/render smoke, not an interaction test. Give the REPL a
# real PTY, let it paint, then terminate it. That is enough to catch the
# render-time regressions the refactor kept surfacing.
script -q "$tmp_out" zsh -lc 'PATH=/Users/bretlindquist/.bun/bin:$PATH node dist/cli.js --bare & pid=$!; sleep 3; kill -TERM "$pid" >/dev/null 2>&1 || true; wait "$pid" >/dev/null 2>&1 || true' >/dev/null 2>&1

if grep -q " ERROR " "$tmp_out"; then
  cat "$tmp_out"
  echo "repl-startup-smoke failed: REPL threw a runtime error during startup" >&2
  exit 1
fi

if ! grep -q "SeaTurtle" "$tmp_out"; then
  cat "$tmp_out"
  echo "repl-startup-smoke failed: REPL did not reach a recognizable startup frame" >&2
  exit 1
fi

echo "repl-startup-smoke passed"
