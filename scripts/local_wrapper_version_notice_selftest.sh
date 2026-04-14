#!/usr/bin/env zsh
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

output="$(./bin/ct --version 2>&1 || true)"

if [[ "$output" != *"Local CT build is stale: built 1.05, repo 1.06."* ]]; then
  echo "expected stale local build notice from bin/ct" >&2
  echo "$output" >&2
  exit 1
fi

if [[ "$output" != *"1.05 (CT)"* ]]; then
  echo "expected wrapped dist version output after stale build notice" >&2
  echo "$output" >&2
  exit 1
fi

echo "local_wrapper_version_notice_selftest: ok"
