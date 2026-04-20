# Elasticias Framework UI — Shared Angular Libraries

This is a **libs-only** Nx workspace. It contains publishable Angular libraries consumed by ElasticERP and ElasticStore via npm packages (`@elasticias/*`).

**No apps live here.** Apps remain in their respective .NET repos (`ElasticERP/src/Web/ClientApp/`, `ElasticStore/src/Web/ClientApp/`).

## Libraries

| Library | Package | Purpose |
|---------|---------|---------|
| `libs/core` | `@elasticias/core` | Angular services (LoaderService, CacheService, auth, i18n) |
| `libs/ui` | `@elasticias/ui` | PrimeNG wrapper components (ef-datatable, ef-dialog, ef-button, etc.) |
| `libs/screens` | `@elasticias/screens` | CRUD screen framework (AbstractScreenComponent, ScreenConfig, ReferenceDataService) |
| `libs/types` | `@elasticias/types` | Pure TypeScript interfaces and enums |
| `libs/utils` | `@elasticias/utils` | Framework-agnostic utilities (StorageUtils, AppUtils, UuidUtils) |

## Commands

```bash
# Build all libs
npx nx run-many -t build --projects=types,utils,core,screens,ui

# Build single lib
npx nx build ui

# Test
npx nx run-many -t test

# Lint
npx nx run-many -t lint

# Local registry (Verdaccio)
npx nx run @elasticias/framework-ui:local-registry

# Publish (after build)
cd dist/libs/ui && npm publish
```

## Publishing

Libs are published to GitHub Packages under `@elasticias` scope. Apps consume them as regular npm dependencies.

## i18n Convention

All `ef-*` UI components expose `*Key` input variants for i18n: `labelKey`, `placeholderKey`, `legendKey`, `headerKey`. Consuming apps **must** use these instead of the plain `label`/`placeholder`/`legend`/`header` inputs. The `*Key` inputs are translated via `ngx-translate`'s `TranslateModule`. Translation files live in each app's `src/assets/i18n/` directory (e.g. `fr.json`, `ar.json`). Always add keys to **both** `fr.json` (with proper French accents: é, è, ê, ë, à, ô, ù, ç, etc.) and `ar.json` (Arabic).

## Nx Guidelines

- Prefix nx commands with `npx` (no global install)
- Run tasks through `nx` (not underlying tooling directly)
- Check `--help` before guessing CLI flags
