#!/usr/bin/env zsh
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
prefix="${HOME}/.local/bin"
should_build=0
install_default_claude=0

usage() {
  cat <<'EOF'
Usage: ./scripts/install-local-cli.sh [--build] [--prefix DIR] [--as-default-claude]

Installs local branded wrappers for this fork:
  ct
  seaturtle
  ct-dev

Options:
  --build               Build the local CLI first with --no-minify
  --prefix DIR          Install symlinks into DIR (default: ~/.local/bin)
  --as-default-claude   Also install a "claude" symlink to ct
  -h, --help            Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --build)
      should_build=1
      shift
      ;;
    --prefix)
      prefix="${2:?missing value for --prefix}"
      shift 2
      ;;
    --as-default-claude)
      install_default_claude=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

cd "$repo_root"

if (( should_build )); then
  echo "Building local CLI..."
  node scripts/build-cli.mjs --no-minify
fi

mkdir -p "$prefix"

ln -sf "$repo_root/bin/ct" "$prefix/ct"
ln -sf "$repo_root/bin/seaturtle" "$prefix/seaturtle"
ln -sf "$repo_root/bin/ct-dev" "$prefix/ct-dev"

if (( install_default_claude )); then
  ln -sf "$repo_root/bin/ct" "$prefix/claude"
fi

cat <<EOF
Installed local wrappers into:
  $prefix

Available commands:
  ct
  seaturtle
  ct-dev
EOF

if (( install_default_claude )); then
  cat <<EOF
  claude
EOF
fi

cat <<EOF

If "$prefix" is not on your PATH yet, add:
  export PATH="$prefix:\$PATH"

Next steps:
  ct
  /login
  /telegram
EOF
