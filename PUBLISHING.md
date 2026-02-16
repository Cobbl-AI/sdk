# Publishing Guide

This guide covers how to publish the Cobbl SDK to npm.

## Pre-requisites

1. **npm account**: You need an npm account with access to publish `@cobbl-ai/sdk`
2. **npm login**: Run `npm login` to authenticate
3. **Build system**: Ensure you have pnpm installed

## Pre-publish Checklist

- [ ] Update version in `package.json` (follow [semver](https://semver.org/))
- [ ] Update `CHANGELOG.md` with changes
- [ ] Run tests (if available)
- [ ] Build the package: `pnpm build`
- [ ] Check TypeScript: `pnpm typecheck`
- [ ] Review bundle size: `ls -lh dist/`
- [ ] Test locally with `pnpm pack`

## Version Numbering

Follow semantic versioning:

- **Patch** (0.1.0 → 0.1.1): Bug fixes, no breaking changes
- **Minor** (0.1.0 → 0.2.0): New features, no breaking changes
- **Major** (0.1.0 → 1.0.0): Breaking changes

## Publishing Steps

### 1. Test Locally

Create a test package without publishing:

```bash
cd /path/to/sdk
pnpm pack
```

This creates a `.tgz` file you can install in a test project:

```bash
cd /path/to/test-project
npm install /path/to/sdk/cobbl-ai-sdk-0.1.0.tgz
```

### 2. Publish to npm

For a standard release:

```bash
pnpm publish --access public
```

For a pre-release (beta, alpha, rc):

```bash
# Update version to include tag (e.g., 0.2.0-beta.1)
pnpm publish --tag beta --access public
```

### 3. Verify Publication

After publishing:

1. Check the package page: https://www.npmjs.com/package/@cobbl-ai/sdk
2. Try installing in a fresh project: `npm install @cobbl-ai/sdk`
3. Verify the README displays correctly on npm

## Common Issues

### "You cannot publish over the previously published versions"

You're trying to publish a version that already exists. Bump the version in `package.json`.

### "You do not have permission to publish"

Make sure you're logged in with an account that has access to the `@cobbl-ai` scope:

```bash
npm login
npm whoami  # Verify you're logged in
```

### Build fails

Ensure all dependencies are installed:

```bash
pnpm install
```

## Automated Publishing (CI/CD)

For automated publishing via GitHub Actions or similar:

1. Add `NPM_TOKEN` to your repository secrets
2. Create a workflow file:

```yaml
name: Publish to npm

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      - run: pnpm install
      - run: pnpm build
      - run: pnpm publish --access public --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Post-publish

After publishing:

1. Tag the release in git: `git tag v0.1.0 && git push --tags`
2. Create a GitHub release with the changelog
3. Announce on social media / Discord / etc.
4. Update documentation if needed
