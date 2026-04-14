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

quit_output="$(
  CT_LOCAL_WRAPPER_ASSUME_INTERACTIVE=1 \
  CT_LOCAL_WRAPPER_STALE_ACTION=quit \
  ./bin/ct 2>&1 || true
)"

if [[ "$quit_output" != *"Choose: [b] rebuild now, [c] continue with stale build, [q] quit"* ]]; then
  echo "expected stale interactive prompt from bin/ct" >&2
  echo "$quit_output" >&2
  exit 1
fi

if [[ "$quit_output" == *"SeaTurtle"* ]]; then
  echo "expected quit path to stop before launching stale CLI" >&2
  echo "$quit_output" >&2
  exit 1
fi

echo "local_wrapper_version_notice_selftest: ok"
