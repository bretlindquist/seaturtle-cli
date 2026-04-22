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

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required for the release installer Docker smoke test" >&2
  exit 1
fi

docker run --rm \
  -v "$repo_root:/workspace" \
  -w /workspace \
  node:20-bookworm \
  bash -lc '
    set -euo pipefail
    export DEBIAN_FRONTEND=noninteractive
    apt-get update >/dev/null
    apt-get install -y curl ca-certificates unzip python3 tar >/dev/null
    curl -fsSL https://bun.sh/install | bash >/dev/null
    export PATH="$HOME/.bun/bin:$PATH"
    ln -sf "$HOME/.bun/bin/bun" /usr/local/bin/bun
    ln -sf "$HOME/.bun/bin/bun" /usr/local/bin/bunx

    node scripts/build-cli.mjs --no-minify >/dev/null
    node scripts/build-release-artifact.mjs --outdir /tmp/release-assets >/dev/null

    artifact_name="$(basename "$(find /tmp/release-assets -maxdepth 1 -type f -name "seaturtle-linux-*.tar.gz" | head -n 1)")"
    if [[ -z "$artifact_name" ]]; then
      echo "missing Linux release artifact in /tmp/release-assets" >&2
      exit 1
    fi
    checksum_name="${artifact_name}.sha256"

    repo_path="test-owner/test-repo"
    download_dir="/tmp/web/${repo_path}/releases/latest/download"
    mkdir -p "$download_dir"
    cp "/tmp/release-assets/${artifact_name}" "$download_dir/"
    cp "/tmp/release-assets/${checksum_name}" "$download_dir/"

    python3 -m http.server --directory /tmp/web 8766 >/dev/null 2>&1 &
    server_pid="$!"
    trap "kill \$server_pid >/dev/null 2>&1 || true" EXIT
    sleep 1

    SEATURTLE_RELEASE_REPO="$repo_path" \
    SEATURTLE_RELEASE_WEB_BASE_URL="http://127.0.0.1:8766" \
    XDG_DATA_HOME="/tmp/xdg-data" \
    bash scripts/install-release-cli.sh --prefix /tmp/bin >/dev/null

    /tmp/bin/ct --version | grep -q "1.10 (CT)"
    test -f /tmp/xdg-data/seaturtle/install.json
  '

echo "release-installer Docker smoke test passed"
