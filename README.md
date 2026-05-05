# Elasticias Framework UI

[![CI](https://github.com/elasticias/elasticias-framework-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/elasticias/elasticias-framework-ui/actions/workflows/ci.yml)
[![Publish](https://github.com/elasticias/elasticias-framework-ui/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/elasticias/elasticias-framework-ui/actions/workflows/npm-publish.yml)
[![@elasticias/types](https://img.shields.io/npm/v/@elasticias/types?label=%40elasticias%2Ftypes)](https://www.npmjs.com/package/@elasticias/types)
[![@elasticias/utils](https://img.shields.io/npm/v/@elasticias/utils?label=%40elasticias%2Futils)](https://www.npmjs.com/package/@elasticias/utils)
[![@elasticias/core](https://img.shields.io/npm/v/@elasticias/core?label=%40elasticias%2Fcore)](https://www.npmjs.com/package/@elasticias/core)
[![@elasticias/screens](https://img.shields.io/npm/v/@elasticias/screens?label=%40elasticias%2Fscreens)](https://www.npmjs.com/package/@elasticias/screens)
[![@elasticias/ui](https://img.shields.io/npm/v/@elasticias/ui?label=%40elasticias%2Fui)](https://www.npmjs.com/package/@elasticias/ui)

Shared Angular libraries for the Elasticias ecosystem, published as public `@elasticias/*` packages on [npmjs.com](https://www.npmjs.com/org/elasticias).

This is a **libs-only** [Nx](https://nx.dev) workspace. No apps live here — apps remain in their respective .NET repos and consume these libraries via npm.

## Install

```bash
npm install @elasticias/types @elasticias/utils @elasticias/core @elasticias/screens @elasticias/ui
```

No `.npmrc` or auth token required — packages are public on npmjs.com.

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
│   └── npm-publish.yml     # Publish to npmjs.com on v* tags
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

Packages are public on npmjs.com — no auth required:

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

Use the local [Verdaccio](https://verdaccio.org/) registry to test library changes as if they were published — useful for validating the full publish flow before pushing to npmjs.com.

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

All libraries are versioned together (fixed release group) using [Nx Release](https://nx.dev/features/manage-releases) and published to [npmjs.com](https://www.npmjs.com/org/elasticias) under the public `@elasticias` scope.

### Prerequisites

1. **`NPM_TOKEN` secret** must be configured in the GitHub repository settings — generate a [granular Automation token](https://docs.npmjs.com/creating-and-viewing-access-tokens) on npmjs.com with publish access to the `@elasticias` scope.
2. Your npmjs.com account must be a member (with publish rights) of the `@elasticias` org.

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
   - Publish to npmjs.com via `npx nx release publish`
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

# Publish (requires NPM_TOKEN env var — automation token from npmjs.com)
export NPM_TOKEN=<your-npmjs-automation-token>
npx nx release publish
```

### Verifying published packages

```bash
# Check versions of a specific package
npm view @elasticias/types versions

# View full package info
npm view @elasticias/ui

# Browse the org on npmjs.com
open https://www.npmjs.com/org/elasticias
```

### Version history

See the [GitHub Releases page](https://github.com/elasticias/elasticias-framework-ui/releases) for the full list of published versions and auto-generated release notes.

## Published Packages

All libraries are published as public packages on npmjs.com from the [`elasticias-framework-ui`](https://github.com/elasticias/elasticias-framework-ui) repo. All packages share a single version number to keep peer-dependency alignment simple — bump one, bump all.

| Package | Link |
|---------|------|
| [`@elasticias/types`](https://www.npmjs.com/package/@elasticias/types) | npmjs.com |
| [`@elasticias/utils`](https://www.npmjs.com/package/@elasticias/utils) | npmjs.com |
| [`@elasticias/core`](https://www.npmjs.com/package/@elasticias/core) | npmjs.com |
| [`@elasticias/screens`](https://www.npmjs.com/package/@elasticias/screens) | npmjs.com |
| [`@elasticias/ui`](https://www.npmjs.com/package/@elasticias/ui) | npmjs.com |

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
