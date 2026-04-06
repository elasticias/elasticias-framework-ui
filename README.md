# Elasticias Framework UI

[![CI](https://github.com/elasticias/elasticias-framework-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/elasticias/elasticias-framework-ui/actions/workflows/ci.yml)
[![Publish](https://github.com/elasticias/elasticias-framework-ui/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/elasticias/elasticias-framework-ui/actions/workflows/npm-publish.yml)
[![npm @elasticias/core](https://img.shields.io/npm/v/@elasticias/core?label=%40elasticias%2Fcore&registry_uri=https%3A%2F%2Fnpm.pkg.github.com)](https://github.com/orgs/elasticias/packages)
[![npm @elasticias/ui](https://img.shields.io/npm/v/@elasticias/ui?label=%40elasticias%2Fui&registry_uri=https%3A%2F%2Fnpm.pkg.github.com)](https://github.com/orgs/elasticias/packages)

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
│   └── npm-publish.yml     # Publish to GitHub Packages on libs-v* tags
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

## Releases

All libraries are versioned together (fixed release group) using [Nx Release](https://nx.dev/features/manage-releases).

### Publishing via CI

Push a tag matching `libs-v*` to trigger the publish workflow:

```bash
git tag libs-v0.1.0
git push origin libs-v0.1.0
```

### Publishing manually

```bash
npx nx release
```

### Version history

| Version | Tag |
|---------|-----|
| 0.0.2 | `libs-v0.0.2` |

## Tech Stack

| Component | Version |
|-----------|---------|
| Angular | 21.x |
| PrimeNG | 21.x |
| Nx | 22.x |
| TypeScript | 5.9.x |
| ng-packagr | 21.x |
| Vitest | 4.x |
