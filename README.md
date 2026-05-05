# Elasticias Framework UI

[![CI](https://github.com/elasticias/elasticias-framework-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/elasticias/elasticias-framework-ui/actions/workflows/ci.yml)
[![Publish](https://github.com/elasticias/elasticias-framework-ui/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/elasticias/elasticias-framework-ui/actions/workflows/npm-publish.yml)
[![@elasticias/types](https://img.shields.io/github/package-json/v/elasticias/elasticias-framework-ui?filename=libs/types/package.json&label=%40elasticias%2Ftypes)](https://github.com/elasticias/elasticias-framework-ui/pkgs/npm/types)
[![@elasticias/utils](https://img.shields.io/github/package-json/v/elasticias/elasticias-framework-ui?filename=libs/utils/package.json&label=%40elasticias%2Futils)](https://github.com/elasticias/elasticias-framework-ui/pkgs/npm/utils)
[![@elasticias/core](https://img.shields.io/github/package-json/v/elasticias/elasticias-framework-ui?filename=libs/core/package.json&label=%40elasticias%2Fcore)](https://github.com/elasticias/elasticias-framework-ui/pkgs/npm/core)
[![@elasticias/screens](https://img.shields.io/github/package-json/v/elasticias/elasticias-framework-ui?filename=libs/screens/package.json&label=%40elasticias%2Fscreens)](https://github.com/elasticias/elasticias-framework-ui/pkgs/npm/screens)
[![@elasticias/ui](https://img.shields.io/github/package-json/v/elasticias/elasticias-framework-ui?filename=libs/ui/package.json&label=%40elasticias%2Fui)](https://github.com/elasticias/elasticias-framework-ui/pkgs/npm/ui)

Shared Angular libraries for the Elasticias ecosystem, published as `@elasticias/*` npm packages to GitHub Packages.

This is a **libs-only** [Nx](https://nx.dev) workspace. No apps live here — apps remain in their respective .NET repos and consume these libraries via npm.

## Install

```bash
npm install @elasticias/types @elasticias/utils @elasticias/core @elasticias/screens @elasticias/ui
```

Packages are hosted on GitHub Packages — see [Consuming Packages](#consuming-packages) for the `.npmrc` token setup.

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
   git commit -m "chore(release): vX.Y.Z"
   ```

3. **Tag and push:**

   ```bash
   git tag vX.Y.Z
   git push origin main vX.Y.Z
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

See the [GitHub Releases page](https://github.com/elasticias/elasticias-framework-ui/releases) for the full list of published versions and auto-generated release notes.

## Published Packages

All libraries are published to GitHub Packages (npm) from the [`elasticias-framework-ui`](https://github.com/elasticias/elasticias-framework-ui) repo. All packages share a single version number to keep peer-dependency alignment simple — bump one, bump all.

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

## License

[MIT](./LICENSE) — see the LICENSE file for details. Security issues should be reported per [SECURITY.md](./SECURITY.md).
