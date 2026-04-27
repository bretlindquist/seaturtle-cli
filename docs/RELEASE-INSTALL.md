# SeaTurtle Release Install

This doc is the production install path for normal users.

It is not the contributor source-build path.

## Normal Install

Install the published SeaTurtle artifact for your machine:

```bash
curl -fsSL https://raw.githubusercontent.com/bretlindquist/seaturtle-cli/master/scripts/install-release-cli.sh | bash
```

That path:

- downloads the published release artifact
- verifies the checksum before installing it
- installs `ct` and `seaturtle` into your user bin directory
- avoids the contributor overlay build entirely

## After Install

Verify:

```bash
ct --version
```

Then start CT:

```bash
ct
```

Inside CT, the first commands to know are:

- `/login`
- `/model`
- `/status`

Release installs update with:

```bash
ct update
```

On Windows GitHub-release installs, CT now also checks for newer GitHub
release versions when it starts. If a newer `ct.exe` is available, CT shows a
simple startup prompt with `Yes` as the default Enter action. Accepting it
stages the new binary, exits CT, and lets Windows swap in the updated
`ct.exe`.

## Contributor Build

If you want to work from source, use the contributor installer instead:

```bash
./scripts/install-local-cli.sh --build
```

That path is for repo development. It rebuilds the local source checkout and
is intentionally separate from the normal user install path.

## Release Publishing

Release artifacts are built and uploaded by:

- `.github/workflows/release-artifacts.yml`
- `node scripts/build-release-artifact.mjs --target <platform>`
- `scripts/publish-release-assets.sh <tag>`

Current GitHub Actions release-artifact matrix:

- `darwin-arm64`
- `windows-x64`

Windows release artifacts are published to GitHub releases as `.zip` archives containing `ct.exe`.
The curl installer remains Unix-only today, but Windows GitHub-release installs
now use the same published `.zip` asset for both startup update prompts and
`ct update`.

## Maintainer GitHub Actions Release Path

If you need the shipped Windows build, use the GitHub Actions release workflow
instead of trying to cross-build `ct.exe` from macOS by hand.

Release sequence:

1. bump `source/package.json`, update `CHANGELOG.md`, and update `README.md`
2. run the release helper validation locally
3. commit and push the release checkpoint
4. trigger `.github/workflows/release-artifacts.yml` with the matching tag
5. verify the `windows-x64` job uploaded `seaturtle-windows-x64.zip`
6. verify the GitHub release now includes the Windows `.zip` and `.sha256`
7. optionally launch the shipped Windows build once and confirm startup update
   detection still points at the GitHub-release path

There are two supported trigger paths:

- tag push:
  - `git tag v1.13`
  - `git push origin v1.13`
- manual dispatch:
  - GitHub Actions UI: run `Release Artifacts` with `tag=v1.13`
  - or CLI: `gh workflow run release-artifacts.yml -f tag=v1.13`

The workflow builds both matrix targets:

- `darwin-arm64`
- `windows-x64`

The Windows job already smoke-tests the zipped artifact by expanding it and
running `ct.exe --version` on `windows-latest`.

That published `seaturtle-windows-x64.zip` artifact is the same asset consumed
by:

- Windows startup update prompts on GitHub-release installs
- `ct update` on Windows GitHub-release installs

Maintainer-local validation helpers:

- `node scripts/build-release-artifact.mjs --target darwin-arm64`
- `node scripts/build-release-artifact.mjs --target windows-x64`
- `scripts/publish-release-assets.sh <tag>`
- `bash scripts/release-installer-smoke.sh`
- `bash scripts/release-installer-docker-smoke.sh`
