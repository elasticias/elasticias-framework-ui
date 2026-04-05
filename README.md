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
