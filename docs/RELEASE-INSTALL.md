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

## Contributor Build

If you want to work from source, use the contributor installer instead:

```bash
./scripts/install-local-cli.sh --build
```

That path is for repo development. It rebuilds the local source checkout and
is intentionally separate from the normal user install path.

## Release Publishing

Release artifacts are built and uploaded by:

- `node scripts/build-release-artifact.mjs`
- `scripts/publish-release-assets.sh <tag>`

Current published artifact matrix in that workflow:

- `darwin-arm64`
- `darwin-x64`
- `linux-arm64`
- `linux-x64`

Maintainer-local validation helpers:

- `node scripts/build-release-artifact.mjs`
- `scripts/publish-release-assets.sh <tag>`
- `bash scripts/release-installer-smoke.sh`
- `bash scripts/release-installer-docker-smoke.sh`
