#!/usr/bin/env bash
set -euo pipefail

if [[ "${LC_ALL:-}" == "C.UTF-8" ]]; then
  unset LC_ALL
fi
if [[ "${LC_CTYPE:-}" == "C.UTF-8" ]]; then
  unset LC_CTYPE
fi

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

tmp_root="$(mktemp -d)"
server_pid=""
cleanup() {
  if [[ -n "$server_pid" ]]; then
    kill "$server_pid" >/dev/null 2>&1 || true
  fi
  rm -rf "$tmp_root"
}
trap cleanup EXIT

node scripts/build-release-artifact.mjs --outdir "$tmp_root/release-assets" >/dev/null

platform=""
case "$(uname -s):$(uname -m)" in
  Darwin:arm64) platform="darwin-arm64" ;;
  Darwin:x86_64) platform="darwin-x64" ;;
  Linux:x86_64|Linux:amd64) platform="linux-x64" ;;
  Linux:aarch64|Linux:arm64) platform="linux-arm64" ;;
  *)
    echo "Unsupported platform for release installer smoke test: $(uname -s) / $(uname -m)" >&2
    exit 1
    ;;
esac

asset="seaturtle-${platform}.tar.gz"
checksum="${asset}.sha256"
web_root="$tmp_root/web"
repo_path="test-owner/test-repo"
download_dir="$web_root/$repo_path/releases/latest/download"
mkdir -p "$download_dir"
cp "$tmp_root/release-assets/$asset" "$download_dir/$asset"
cp "$tmp_root/release-assets/$checksum" "$download_dir/$checksum"

python3 -m http.server --directory "$web_root" 8765 >/dev/null 2>&1 &
server_pid="$!"
sleep 1

install_prefix="$tmp_root/bin"
data_home="$tmp_root/data"
SEATURTLE_RELEASE_REPO="$repo_path" \
SEATURTLE_RELEASE_WEB_BASE_URL="http://127.0.0.1:8765" \
XDG_DATA_HOME="$data_home" \
bash scripts/install-release-cli.sh --prefix "$install_prefix" >/dev/null

"$install_prefix/ct" --version | grep -q '1.09 (CT)'
test -L "$install_prefix/seaturtle"
test -f "$data_home/seaturtle/install.json"

echo "release-installer smoke test passed"
