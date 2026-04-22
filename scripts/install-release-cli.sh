#!/usr/bin/env bash
set -euo pipefail

if [[ "${LC_ALL:-}" == "C.UTF-8" ]]; then
  unset LC_ALL
fi
if [[ "${LC_CTYPE:-}" == "C.UTF-8" ]]; then
  unset LC_CTYPE
fi

prefix=""
prefix_explicit=0
version="latest"
repo="${SEATURTLE_RELEASE_REPO:-bretlindquist/seaturtle-cli}"
web_base="${SEATURTLE_RELEASE_WEB_BASE_URL:-https://github.com}"

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
Usage: ./scripts/install-release-cli.sh [--version VERSION] [--prefix DIR]

Install the production SeaTurtle CT release artifact for this machine.

Options:
  --version VERSION  Install a specific release version (default: latest)
  --prefix DIR       Install into DIR (default: first writable user bin dir or ~/.local/bin)
  -h, --help         Show this help
EOF
}

require_command() {
  local command_name="$1"
  local reason="$2"
  if command -v "$command_name" >/dev/null 2>&1; then
    return 0
  fi

  cat >&2 <<EOF
Missing required dependency: $command_name

Why it matters:
  $reason
EOF
  exit 1
}

get_sha256_command() {
  if command -v shasum >/dev/null 2>&1; then
    printf 'shasum -a 256'
    return 0
  fi
  if command -v sha256sum >/dev/null 2>&1; then
    printf 'sha256sum'
    return 0
  fi

  return 1
}

detect_platform() {
  local uname_s uname_m
  uname_s="$(uname -s)"
  uname_m="$(uname -m)"

  case "$uname_s" in
    Darwin)
      case "$uname_m" in
        arm64) printf 'darwin-arm64\n' ;;
        x86_64) printf 'darwin-x64\n' ;;
        *) return 1 ;;
      esac
      ;;
    Linux)
      case "$uname_m" in
        aarch64|arm64) printf 'linux-arm64\n' ;;
        x86_64|amd64) printf 'linux-x64\n' ;;
        *) return 1 ;;
      esac
      ;;
    *)
      return 1
      ;;
  esac
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      version="${2:?missing value for --version}"
      shift 2
      ;;
    --prefix)
      prefix="${2:?missing value for --prefix}"
      prefix_explicit=1
      shift 2
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

require_command curl "SeaTurtle release installs download the published release artifact."
require_command tar "SeaTurtle release artifacts are shipped as tar.gz bundles."

sha_cmd="$(get_sha256_command || true)"
if [[ -z "$sha_cmd" ]]; then
  echo "Missing required dependency: shasum or sha256sum" >&2
  echo "Why it matters:" >&2
  echo "  SeaTurtle verifies the downloaded release artifact checksum before installing it." >&2
  exit 1
fi

if (( ! prefix_explicit )); then
  prefix="$(choose_default_prefix)"
fi

platform="$(detect_platform || true)"
if [[ -z "$platform" ]]; then
  echo "Unsupported platform for the SeaTurtle release installer: $(uname -s) / $(uname -m)" >&2
  exit 1
fi

asset_name="seaturtle-${platform}.tar.gz"
checksum_name="${asset_name}.sha256"
if [[ "$version" == "latest" || "$version" == "stable" ]]; then
  download_base="${web_base}/${repo}/releases/latest/download"
else
  normalized_version="${version#v}"
  download_base="${web_base}/${repo}/releases/download/v${normalized_version}"
fi

tmp_dir="$(mktemp -d)"
archive_path="${tmp_dir}/${asset_name}"
checksum_path="${tmp_dir}/${checksum_name}"
cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

echo "Installing SeaTurtle CT..."
echo "Step 1: Downloading the published ${platform} release artifact"
curl -fsSL "${download_base}/${asset_name}" -o "$archive_path"
curl -fsSL "${download_base}/${checksum_name}" -o "$checksum_path"

echo "Step 2: Verifying the release checksum"
expected_checksum="$(awk '{print $1}' "$checksum_path")"
actual_checksum="$($sha_cmd "$archive_path" | awk '{print $1}')"
if [[ -z "$expected_checksum" || "$expected_checksum" != "$actual_checksum" ]]; then
  echo "SeaTurtle checksum verification failed." >&2
  echo "Expected: $expected_checksum" >&2
  echo "Actual:   $actual_checksum" >&2
  exit 1
fi

echo "Step 3: Installing SeaTurtle CT into ${prefix}"
mkdir -p "$prefix"
tar -xzf "$archive_path" -C "$tmp_dir"
cp "$tmp_dir/ct" "$prefix/ct"
chmod 755 "$prefix/ct"
ln -sf ct "$prefix/seaturtle"

data_home="${XDG_DATA_HOME:-$HOME/.local/share}"
metadata_dir="${data_home}/seaturtle"
metadata_path="${metadata_dir}/install.json"
mkdir -p "$metadata_dir"
installed_version="$("$prefix/ct" --version | awk '{print $1}')"
cat >"$metadata_path" <<EOF
{
  "type": "github-release",
  "repo": "${repo}",
  "installedPath": "${prefix}/ct",
  "version": "${installed_version}",
  "installedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

cat <<EOF
Step 4: SeaTurtle CT is installed.

Installed commands:
  ct
  seaturtle

Verify:
  ct --version

Then start:
  ct

Inside CT:
  /login
  /model
EOF
