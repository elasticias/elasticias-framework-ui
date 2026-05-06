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

Libs are published to the public npm registry (`registry.npmjs.org`) under the `@elasticias` scope (`access: public`). Apps consume them as regular npm dependencies — no auth required to install.

**All 5 libs are versioned in lockstep** (`projectsRelationship: "fixed"` in `nx.json`). They always share the same version and ship together under a single `vX.Y.Z` git tag. Never bump a single lib's `package.json` by hand — use:

```bash
npx nx release version <patch|minor|major>   # bumps all 5 libs together
git push                                     # → CI → Release workflow publishes
```

Release flow: bump → push to `main` → CI runs → on green CI, the `Release` workflow verifies all 5 libs share the same version (fails if not), builds, and publishes via `nx release publish` using `NPM_TOKEN`.

## i18n Convention

All `ef-*` UI components expose `*Key` input variants for i18n: `labelKey`, `placeholderKey`, `legendKey`, `headerKey`. Consuming apps **must** use these instead of the plain `label`/`placeholder`/`legend`/`header` inputs. The `*Key` inputs are translated via `ngx-translate`'s `TranslateModule`. Translation files live in each app's `src/assets/i18n/` directory (e.g. `fr.json`, `ar.json`). Always add keys to **both** `fr.json` (with proper French accents: é, è, ê, ë, à, ô, ù, ç, etc.) and `ar.json` (Arabic).

## Wrapper Convention

Always prefer the `ef-*` wrappers (`ef-button`, `ef-select`, `ef-inputnumber`, `ef-datepicker`, `ef-label`, `ef-fieldset`, `ef-datatable`, `ef-dialog`, ...) over raw PrimeNG primitives (`p-button`, `p-dropdown`, `p-inputnumber`, ...). This applies inside both the shared libs and consuming apps. The wrappers enforce the `*Key` i18n inputs, rounded styling defaults, and consistent severities/sizes. New components and templates should use `ef-*`; don't refactor existing `p-*` usages unless the task requires it.

## Nx Guidelines

- Prefix nx commands with `npx` (no global install)
- Run tasks through `nx` (not underlying tooling directly)
- Check `--help` before guessing CLI flags
