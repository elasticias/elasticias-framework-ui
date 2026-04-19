# Elasticias Framework UI

[![CI](https://github.com/elasticias/elasticias-framework-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/elasticias/elasticias-framework-ui/actions/workflows/ci.yml)
[![Publish](https://github.com/elasticias/elasticias-framework-ui/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/elasticias/elasticias-framework-ui/actions/workflows/npm-publish.yml)
[![@elasticias/core](https://img.shields.io/badge/%40elasticias%2Fcore-0.0.3-blue)](https://github.com/elasticias/elasticias-framework-ui/pkgs/npm/core)
[![@elasticias/ui](https://img.shields.io/badge/%40elasticias%2Fui-0.0.3-blue)](https://github.com/elasticias/elasticias-framework-ui/pkgs/npm/ui)

Shared Angular libraries for the Elasticias ecosystem, published as `@elasticias/*` npm packages to GitHub Packages.

This is a **libs-only** [Nx](https://nx.dev) workspace. No apps live here — apps remain in their respective .NET repos and consume these libraries via npm.

## Libraries

| Package | Path | Purpose |
|---------|------|---------|
| `@elasticias/types` | `libs/types` | Pure TypeScript interfaces and enums |
| `@elasticias/utils` | `libs/utils` | Framework-agnostic utilities (StorageUtils, AppUtils, UuidUtils) |
| `@elasticias/core` | `libs/core` | Angular services (LoaderService, CacheService, auth, i18n) |
| `@elasticias/screens` | `libs/screens` | CRUD screen framework (AbstractScreenComponent, ScreenConfig) |
| `@elasticias/ui` | `libs/ui` | PrimeNG wrapper components (ef-datatable, ef-dialog, ef-button, etc.) |

### Dependency Graph

```
types ──> screens ──> ui
utils ──> core    ──> ui
```

## Project Structure

```
elasticias-framework-ui/
├── libs/
│   ├── types/              # @elasticias/types
│   ├── utils/              # @elasticias/utils
│   ├── core/               # @elasticias/core
│   ├── screens/            # @elasticias/screens
│   └── ui/                 # @elasticias/ui
├── dist/                   # Build output (published from here)
├── .github/workflows/
│   ├── ci.yml              # Lint, test, build, typecheck on push/PR
│   └── npm-publish.yml     # Publish to GitHub Packages on v* tags
├── nx.json                 # Nx workspace configuration
├── tsconfig.base.json      # Shared TypeScript config
└── eslint.config.mjs       # Root ESLint config
```

## Getting Started

```bash
# Install dependencies
npm install

# Build all libraries
npx nx run-many -t build --projects=types,utils,core,screens,ui

# Run tests
npx nx run-many -t test

# Lint
npx nx run-many -t lint

# Build a single library
npx nx build core
```

## Consuming Packages

Add `.npmrc` to your project root:

```
@elasticias:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
```

Then install:

```bash
npm install @elasticias/types @elasticias/utils @elasticias/core @elasticias/screens @elasticias/ui
```

## Local Development (Verdaccio)

Use the local [Verdaccio](https://verdaccio.org/) registry to test library changes in consuming apps (e.g. ElasticERP) before publishing to GitHub Packages.

### 1. Start the local registry

In a dedicated terminal:

```bash
npx nx run @elasticias/framework-ui:local-registry
```

This starts Verdaccio on `http://localhost:4873` and proxies any missing packages to npmjs.org.

### 2. Build and publish all libs locally

In another terminal, run the publish script:

```bash
./publish-local.sh
```

This builds all libraries in dependency order and publishes them to the local registry. If a version is already published, it is silently skipped.

<details>
<summary>Manual step-by-step (without the script)</summary>

```bash
# Build
npx nx run-many -t build --projects=types,utils,core,screens,ui

# Publish each lib
for lib in types utils core screens ui; do
  cd dist/libs/$lib
  npm publish --registry http://localhost:4873 --tag latest
  cd -
done
```

</details>

### 3. Configure the consuming app

Add or update `.npmrc` in the consuming app root (e.g. `ElasticERP/src/Web/ClientApp/`):

```ini
@elasticias:registry=http://localhost:4873
```

Then install as usual:

```bash
npm install
```

npm will resolve `@elasticias/*` packages from Verdaccio and everything else from npmjs.org.

### 4. Iterate

After making changes to a library:

1. Bump the version in the library's `package.json` (or use `npx nx release version`)
2. Re-run `./publish-local.sh`
3. In the consuming app: `npm install` to pick up the new version

### Cleanup

Stop the Verdaccio process (`Ctrl+C`) and remove the local storage:

```bash
rm -rf tmp/local-registry
```

Restore the consuming app's `.npmrc` to point back to GitHub Packages before committing:

```ini
@elasticias:registry=https://npm.pkg.github.com
```

---

## Local Development (npm link)

The fastest way to iterate on shared libraries during development. Changes are picked up instantly after rebuilding — no version bumps, no publishing.

### Setup

```bash
./link-all.sh
```

This script:
1. Builds all libs (`types`, `utils`, `core`, `screens`, `ui`)
2. Creates global npm symlinks from each `dist/libs/<lib>`
3. Links them into the ElasticERP ClientApp's `node_modules`

### Workflow

After making changes to a shared lib:

```bash
npx nx build ui        # rebuild the changed lib (~1s)
# Angular dev server hot-reloads automatically
```

### Teardown

```bash
./link-all.sh --unlink
```

This removes all symlinks and runs `npm install` to restore packages from the registry.

> **Note:** Running `npm install` in the ClientApp will break the links. Re-run `./link-all.sh` after any `npm install`.

---

## Local Development (Verdaccio)

Use the local [Verdaccio](https://verdaccio.org/) registry to test library changes as if they were published — useful for validating the full publish flow before pushing to GitHub Packages.

### Setup

```bash
# Terminal 1: start Verdaccio
npx nx run @elasticias/framework-ui:local-registry

# Terminal 2: build & publish
./publish-local.sh
```

The `publish-local.sh` script:
1. Starts Verdaccio on `http://localhost:4874` if not already running
2. Builds all libraries in dependency order
3. Unpublishes existing versions (force) and republishes to the local registry

You can publish specific libs only:

```bash
./publish-local.sh ui core    # only publish ui and core
```

### Configure the consuming app

Add to `.npmrc` in the ClientApp root:

```ini
@elasticias:registry=http://localhost:4874
```

Then `npm install` to resolve from Verdaccio.

### Iterate

1. Edit library code
2. Bump version in `libs/<lib>/package.json`
3. `./publish-local.sh`
4. `npm install` in the consuming app

### Cleanup

Stop Verdaccio (`Ctrl+C`), remove local storage, and restore `.npmrc`:

```bash
rm -rf tmp/local-registry
```

### When to use which?

| | `link-all.sh` | `publish-local.sh` |
|---|---|---|
| Speed | Instant (symlink) | Requires npm install |
| Version bump needed | No | Yes |
| Tests full publish flow | No | Yes |
| Survives `npm install` | No (re-run link) | Yes |
| Best for | Active development | Pre-release validation |

---

## Publishing & Deployment

All libraries are versioned together (fixed release group) using [Nx Release](https://nx.dev/features/manage-releases) and published to [GitHub Packages](https://github.com/orgs/elasticias/packages) under the `@elasticias` npm scope.

### Prerequisites

1. **`NPM_TOKEN` secret** must be configured in the GitHub repository settings with `packages:write` scope.
2. Your GitHub account must have write access to the `elasticias` organization packages.

### Publishing via CI (recommended)

1. **Bump versions** — Nx will prompt you for the version bump type (patch, minor, major):

   ```bash
   npx nx release version patch   # or: minor, major, or a specific version like 0.1.0
   ```

   This updates all 5 `libs/*/package.json` files to the same version.

2. **Commit the version bump:**

   ```bash
   git add libs/*/package.json
   git commit -m "chore(release): v0.0.3"
   ```

3. **Tag and push:**

   ```bash
   git tag v0.0.3
   git push origin main v0.0.3
   ```

4. The [`npm-publish.yml`](.github/workflows/npm-publish.yml) workflow runs automatically on `v*` tags and will:
   - Install dependencies
   - Lint, test, and typecheck all 5 libraries
   - Build all libraries
   - Publish to GitHub Packages via `npx nx release publish`
   - Create a GitHub Release with auto-generated release notes

### Dry-run (validate without publishing)

Use the manual workflow dispatch to test the full pipeline without actually publishing:

1. Go to **Actions** → **Publish** → **Run workflow**
2. Leave **"Dry run"** checked (default)
3. Click **Run workflow**

This runs lint, test, typecheck, and build but skips the publish and GitHub Release steps.

### Publishing manually (local)

```bash
# Build all libraries
npx nx run-many -t build --projects=types,utils,core,screens,ui

# Publish (requires NPM_TOKEN env var)
export NPM_TOKEN=<your-github-pat>
npx nx release publish
```

### Verifying published packages

```bash
# List all published packages in the org
gh api '/orgs/elasticias/packages?package_type=npm' --jq '.[].name'

# Check versions of a specific package
npm view @elasticias/types versions --registry=https://npm.pkg.github.com

# View full package info
npm view @elasticias/ui --registry=https://npm.pkg.github.com
```

> **Note:** The `gh api` commands require `read:packages` scope. Run `gh auth refresh -s read:packages` if you get a 403.

### Version history

| Version | Tag | Status |
|---------|-----|--------|
| 0.0.2 | `v0.0.2` | Published |
| 0.0.1 | — | Published |

## Published Packages

All libraries are published to GitHub Packages (npm) from the [`elasticias-framework-ui`](https://github.com/elasticias/elasticias-framework-ui) repo. All packages share a single version number (see [ADR-003](../../docs/adrs/003-unified-versioning-ui-libraries.md)).

| Package | Registry |
|---------|----------|
| [`@elasticias/types`](https://github.com/elasticias/elasticias-framework-ui/pkgs/npm/types) | `npm.pkg.github.com` |
| [`@elasticias/utils`](https://github.com/elasticias/elasticias-framework-ui/pkgs/npm/utils) | `npm.pkg.github.com` |
| [`@elasticias/core`](https://github.com/elasticias/elasticias-framework-ui/pkgs/npm/core) | `npm.pkg.github.com` |
| [`@elasticias/screens`](https://github.com/elasticias/elasticias-framework-ui/pkgs/npm/screens) | `npm.pkg.github.com` |
| [`@elasticias/ui`](https://github.com/elasticias/elasticias-framework-ui/pkgs/npm/ui) | `npm.pkg.github.com` |

## Tech Stack

| Component | Version |
|-----------|---------|
| Angular | 21.x |
| PrimeNG | 21.x |
| Nx | 22.x |
| TypeScript | 5.9.x |
| ng-packagr | 21.x |
| Vitest | 4.x |
