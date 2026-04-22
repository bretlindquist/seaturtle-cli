#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
prefix=""
should_build=0
install_default_claude=0
prefix_explicit=0
default_bun_bin="${HOME}/.bun/bin"

MIN_NODE_MAJOR=18

choose_default_prefix() {
  local path_entry
  local fallback="${HOME}/.local/bin"
  local old_ifs="$IFS"

  IFS=':'
  for path_entry in ${PATH:-}; do
    [[ -z "$path_entry" ]] && continue
    if [[ "$path_entry" == "$HOME"/* || "$path_entry" == "$HOME/.local/bin" ]]; then
      if [[ -d "$path_entry" && -w "$path_entry" ]]; then
        IFS="$old_ifs"
        printf '%s\n' "$path_entry"
        return 0
      fi
    fi
  done
  IFS="$old_ifs"

  printf '%s\n' "$fallback"
}

usage() {
  cat <<'EOF'
Usage: ./scripts/install-local-cli.sh [--build] [--prefix DIR] [--as-default-claude]

Install SeaTurtle contributor wrappers from this source checkout:
  ct
  seaturtle
  ct-dev
  buildct

Options:
  --build               Build the local CLI first with --no-minify
  --prefix DIR          Install symlinks into DIR (default: ~/.local/bin)
  --as-default-claude   Also install a "claude" symlink to ct
  -h, --help            Show this help
EOF
}

print_install_hint() {
  local tool="$1"

  case "$tool" in
    node)
      cat <<'EOF'
Next step:
  Install Node.js 18+ first, then rerun this installer.
EOF
      ;;
    npm)
      cat <<'EOF'
Next step:
  npm should ship with Node.js. Reinstall or repair your Node.js install, then rerun this installer.
EOF
      ;;
    bun)
      cat <<'EOF'
Next step:
  Install Bun, then rerun this installer.
  One common path is:
    curl -fsSL https://bun.sh/install | bash
EOF
      ;;
    codex)
      cat <<'EOF'
Next step:
  Install the OpenAI Codex CLI before using OpenAI/Codex OAuth inside CT.
  CT can still be installed now, but OpenAI login/setup will stay unavailable until `codex` is on PATH.
EOF
      ;;
  esac
}

require_command() {
  local tool="$1"
  local reason="$2"

  if command -v "$tool" >/dev/null 2>&1; then
    return 0
  fi

  cat <<EOF >&2
Missing required dependency: $tool

Why it matters:
  $reason
EOF
  print_install_hint "$tool" >&2
  exit 1
}

check_node_version() {
  local node_version node_major

  node_version="$(node -p 'process.versions.node' 2>/dev/null || true)"
  node_major="${node_version%%.*}"

  if [[ -z "$node_version" || -z "$node_major" ]]; then
    cat <<EOF >&2
Unable to read your Node.js version.

Next step:
  Confirm that \`node\` runs successfully, then rerun this installer.
EOF
    exit 1
  fi

  if (( node_major < MIN_NODE_MAJOR )); then
    cat <<EOF >&2
Node.js $node_version is too old for this repo.

Why it matters:
  Building this fork requires Node.js $MIN_NODE_MAJOR or newer.

Next step:
  Upgrade Node.js, then rerun this installer.
EOF
    exit 1
  fi
}

show_optional_codex_note() {
  if command -v codex >/dev/null 2>&1; then
    return 0
  fi

  cat <<'EOF'

OpenAI/Codex note:
  `codex` is not installed or not on PATH yet.
  CT can still be installed now.
  When you want OpenAI/Codex OAuth inside CT, install the Codex CLI first.
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

if [[ -d "$default_bun_bin" && ":$PATH:" != *":$default_bun_bin:"* ]]; then
  export PATH="$default_bun_bin:$PATH"
fi

if (( ! prefix_explicit )); then
  prefix="$(choose_default_prefix)"
fi

if (( should_build )); then
  require_command node "The build step runs the repo's bundler entrypoint."
  check_node_version
  require_command npm "The build overlay installs runtime dependencies with npm."
  require_command bun "The build pipeline bundles the CLI with Bun."

  cat <<'EOF'
Building SeaTurtle CT from source...
This prepares the local build workspace, installs the bundled dependency overlay when needed,
and then packages the CT runtime. The first build can take a few minutes.
If dependency installation stalls, SeaTurtle will stop and print the exact npm recovery steps.
EOF
  if ! node scripts/build-cli.mjs --no-minify; then
    cat <<'EOF' >&2

SeaTurtle CT build did not complete.
Review the npm output above, follow the printed recovery steps, and then rerun:
  ./scripts/install-local-cli.sh --build
EOF
    exit 1
  fi
elif [[ ! -f "$repo_root/dist/cli.js" ]]; then
  cat <<'EOF'
CT is not built yet.

Next step:
  Rerun this installer with:
    ./scripts/install-local-cli.sh --build

For a normal product install, use the published release installer instead:
  ./scripts/install-release-cli.sh
EOF
  exit 1
fi

mkdir -p "$prefix"

ln -sf "$repo_root/bin/ct" "$prefix/ct"
ln -sf "$repo_root/bin/seaturtle" "$prefix/seaturtle"
ln -sf "$repo_root/bin/ct-dev" "$prefix/ct-dev"
ln -sf "$repo_root/bin/buildct" "$prefix/buildct"

if (( install_default_claude )); then
  ln -sf "$repo_root/bin/ct" "$prefix/claude"
fi

installed_ct="$prefix/ct"
installed_seaturtle="$prefix/seaturtle"
installed_ct_dev="$prefix/ct-dev"
installed_buildct="$prefix/buildct"

if [[ ! -L "$installed_ct" || ! -L "$installed_seaturtle" || ! -L "$installed_ct_dev" || ! -L "$installed_buildct" ]]; then
  echo "Install failed: expected wrapper symlinks were not created in $prefix" >&2
  exit 1
fi

ct_on_path=""
if command -v ct >/dev/null 2>&1; then
  ct_on_path="$(command -v ct)"
fi

cat <<EOF
SeaTurtle contributor wrappers installed.

Step 1: Repo-local commands were linked into:
  $prefix

Step 2: Available commands:
  ct         Start SeaTurtle CT from this source checkout
  seaturtle  Same as ct, alternate branded entrypoint
  ct-dev     Run the repo-local development wrapper
  buildct    Rebuild and reinstall local CT wrappers
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
EOF

show_optional_codex_note

cat <<EOF

Step 5: Inside CT, pick the next setup step you need:
  /login      Connect Anthropic, Gemini, or OpenAI/Codex
  /model      Choose the provider model you want to use
  /telegram   Pair a Telegram bot for this project
  /status     Check runtime, auth, and Telegram readiness
EOF
