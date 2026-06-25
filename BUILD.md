# Build & Release Guide

This document describes how to build, test, and release `@kjerneverk/riotprompt`.

## Prerequisites

- Node.js 24 or later
- npm 10 or later
- Git

## Development

### Install Dependencies

```bash
npm install
```

### Build

```bash
npm run build
```

This builds:
- Main library bundle (`dist/riotprompt.js`)
- CLI bundle (`dist/cli.js`)
- MCP server bundle (`dist/mcp-server.js`)
- Type declarations (`dist/*.d.ts`)

### Test

```bash
npm test
```

### Lint

```bash
npm run lint
npm run lint:fix  # auto-fix
```

### Precommit (lint + build + test)

```bash
npm run precommit
```

## Release Process

RiotPrompt uses a two-branch release workflow:

- **`working`** branch: Development happens here. Pushing to `working` triggers a dev version publish to npm (`--tag dev`).
- **`main`** branch: Production releases. GitHub releases on `main` trigger a production publish to npm (`--tag latest`).

### Dev Release (Automatic)

1. Commit changes on `working` branch
2. Push to `origin/working`
3. GitHub Actions automatically:
   - Detects the `-dev` version suffix in `package.json`
   - Appends timestamp + short SHA (e.g., `2.0.0-dev.20260131210612.ab169e2`)
   - Publishes to npm with `--tag dev`

```bash
git add -A
git commit -m "feat: remove agentic code, update docs"
git push origin working
```

### Production Release

1. **Ensure `working` is up to date and tests pass:**
   ```bash
   npm run precommit
   ```

2. **Bump version to a non-dev release:**
   ```bash
   # Edit package.json: "version": "2.0.0" (remove -dev.0 suffix)
   git add package.json
   git commit -m "chore(release): bump to 2.0.0"
   git push origin working
   ```

3. **Create a PR from `working` to `main`:**
   ```bash
   gh pr create --base main --head working --title "Release 2.0.0" --body "Production release 2.0.0"
   ```

4. **Merge the PR to `main`:**
   ```bash
   gh pr merge --squash --delete-branch
   ```

5. **Create a GitHub release on `main`:**
   ```bash
   git checkout main
   git pull origin main
   gh release create v2.0.0 --title "v2.0.0" --notes "Release notes here"
   ```

6. **GitHub Actions automatically:**
   - Detects the non-dev version
   - Publishes to npm with `--tag latest`

### Version Bumping

Follow [Semantic Versioning](https://semver.org/):

- **Major** (`2.0.0`): Breaking changes (removed APIs, changed signatures)
- **Minor** (`1.1.0`): New features, backward compatible
- **Patch** (`1.0.1`): Bug fixes, backward compatible

After a production release, bump the version on `working` to the next dev version:

```bash
# Edit package.json: "version": "2.0.1-dev.0"
git add package.json
git commit -m "chore: bump to 2.0.1-dev.0"
git push origin working
```

## npm Tags

- `latest`: Production releases (installed by default with `npm install @kjerneverk/riotprompt`)
- `dev`: Development releases (installed with `npm install @kjerneverk/riotprompt@dev`)

## CI/CD

### GitHub Actions Workflows

| Workflow | File | Trigger |
|----------|------|---------|
| Tests | `.github/workflows/test.yml` | Push to `working`, PRs |
| npm Publish | `.github/workflows/npm-publish.yml` | Push to `working` (dev), GitHub releases (prod) |
| Docs Deploy | `.github/workflows/deploy-docs.yml` | Push to `main` |

### Dev Version Format

Dev versions follow the pattern: `{base}-dev.{timestamp}.{short_sha}`

Example: `2.0.0-dev.20260131210612.ab169e2`

The CI automatically generates the timestamp and SHA — you just need the `-dev.0` suffix in `package.json`.

## Documentation

Docs are built with Vitepress and deployed via GitHub Pages on push to `main`.

```bash
npm run docs:dev    # Local dev server
npm run docs:build  # Build docs
```

## Troubleshooting

### Build Fails

- Ensure Node.js 24+ is installed
- Delete `node_modules` and `dist`, then `npm install && npm run build`

### Tests Fail

- Run `npm test` to see failures
- Check for missing dependencies

### npm Publish Fails

- Check that the version doesn't already exist on npm
- Ensure `NPM_TOKEN` is set in GitHub Secrets
- For dev versions, ensure the `-dev` suffix is present
