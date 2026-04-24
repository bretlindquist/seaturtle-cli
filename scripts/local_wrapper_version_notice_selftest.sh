#!/usr/bin/env zsh
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

if ! strings ./bin/ct | grep -q "CT_LOCAL_WRAPPER_REPO_VERSION_OVERRIDE"; then
  echo "local_wrapper_version_notice_selftest: skipped (wrapper override seam unavailable)"
  exit 0
fi

output="$(
  CT_LOCAL_WRAPPER_REPO_VERSION_OVERRIDE=1.06 \
  CT_LOCAL_WRAPPER_BUILT_VERSION_OVERRIDE=1.05 \
  ./bin/ct --version 2>&1 || true
)"

if [[ "$output" != *"Local CT version is outdated: installed 1.05, current 1.06."* ]]; then
  echo "expected stale local build notice from bin/ct" >&2
  echo "$output" >&2
  exit 1
fi

if [[ "$output" != *"(CT)"* ]]; then
  echo "expected wrapped dist version output after stale build notice" >&2
  echo "$output" >&2
  exit 1
fi

quit_output="$(
  CT_LOCAL_WRAPPER_REPO_VERSION_OVERRIDE=1.06 \
  CT_LOCAL_WRAPPER_BUILT_VERSION_OVERRIDE=1.05 \
  CT_LOCAL_WRAPPER_ASSUME_INTERACTIVE=1 \
  CT_LOCAL_WRAPPER_STALE_ACTION=quit \
  ./bin/ct 2>&1 || true
)"

if [[ "$quit_output" != *"Choose: [u] update now, [c] continue with current installed version, [q] quit"* ]]; then
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
