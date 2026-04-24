#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

tag="${1:-}"
outdir="${2:-dist/release}"

if [[ -z "$tag" ]]; then
  cat <<'EOF' >&2
Usage: scripts/publish-release-assets.sh <tag> [outdir]

Upload the current platform's SeaTurtle release artifacts to a GitHub release.

Expected artifacts:
  seaturtle-<platform>.tar.gz
  seaturtle-<platform>.tar.gz.sha256
  seaturtle-<platform>.zip
  seaturtle-<platform>.zip.sha256

Typical flow:
  node scripts/build-cli.mjs --no-minify
  node scripts/build-release-artifact.mjs --target linux-x64
  node scripts/build-release-artifact.mjs --target windows-x64
  scripts/publish-release-assets.sh v1.10
EOF
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "gh is required to publish SeaTurtle release assets" >&2
  exit 1
fi

artifact_files=()
while IFS= read -r -d '' file; do
  artifact_files+=("$file")
done < <(find "$outdir" -maxdepth 1 -type f \( -name 'seaturtle-*.tar.gz' -o -name 'seaturtle-*.tar.gz.sha256' -o -name 'seaturtle-*.zip' -o -name 'seaturtle-*.zip.sha256' \) -print0 | sort -z)

if [[ "${#artifact_files[@]}" -eq 0 ]]; then
  echo "No SeaTurtle release artifacts found in $outdir" >&2
  exit 1
fi

if ! gh release view "$tag" >/dev/null 2>&1; then
  gh release create "$tag" --verify-tag --title "$tag" --generate-notes
fi

gh release upload "$tag" "${artifact_files[@]}" --clobber

echo "Published SeaTurtle release assets for $tag:"
printf '  %s\n' "${artifact_files[@]}"
