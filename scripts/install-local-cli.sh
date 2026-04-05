#!/usr/bin/env zsh
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
prefix=""
should_build=0
install_default_claude=0
prefix_explicit=0

choose_default_prefix() {
  local path_entry
  local fallback="${HOME}/.local/bin"

  for path_entry in ${(s/:/)PATH}; do
    [[ -z "$path_entry" ]] && continue
    if [[ "$path_entry" == "$HOME"/* || "$path_entry" == "$HOME/.local/bin" ]]; then
      if [[ -d "$path_entry" && -w "$path_entry" ]]; then
        printf '%s\n' "$path_entry"
        return 0
      fi
    fi
  done

  printf '%s\n' "$fallback"
}

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
      prefix_explicit=1
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

if (( ! prefix_explicit )); then
  prefix="$(choose_default_prefix)"
fi

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

installed_ct="$prefix/ct"
installed_seaturtle="$prefix/seaturtle"
installed_ct_dev="$prefix/ct-dev"

if [[ ! -L "$installed_ct" || ! -L "$installed_seaturtle" || ! -L "$installed_ct_dev" ]]; then
  echo "Install failed: expected wrapper symlinks were not created in $prefix" >&2
  exit 1
fi

ct_on_path=""
if command -v ct >/dev/null 2>&1; then
  ct_on_path="$(command -v ct)"
fi

cat <<EOF
CT wrappers installed.

Step 1: Local commands were linked into:
  $prefix

Step 2: Available commands:
  ct         Start CT with OpenAI/Codex enabled
  seaturtle  Same as ct, alternate branded entrypoint
  ct-dev     Run the repo-local development wrapper
EOF

if (( install_default_claude )); then
  cat <<EOF
  claude     Compatibility alias to ct
EOF
fi

if [[ -n "$ct_on_path" ]]; then
  cat <<EOF

Step 3: ct is available on your PATH now:
  $ct_on_path
EOF
else
  cat <<EOF

Step 3: Your current shell does not see `ct` on PATH yet.

If "$prefix" is not on your PATH yet, add:
  export PATH="$prefix:\$PATH"

If you already have "$prefix" on PATH, refresh zsh's command cache:
  rehash
EOF
fi

cat <<EOF

Step 4: Start CT:
  ct

Step 5: Inside CT, pick the next setup step you need:
  /login      Connect Anthropic or OpenAI/Codex auth
  /telegram   Pair a Telegram bot for this project
  /status     Check runtime, auth, and Telegram readiness
EOF
