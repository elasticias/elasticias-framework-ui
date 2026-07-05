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

**Cards:** use the `ef-card` primitive (`titleKey`/`metaKey`/`tone`, slots `[head-extra]` / default body / `[foot]`) for every card container — even inside other shared components. **Do not hand-roll `.card` / `.card-head` / `.card-body` markup or duplicate card chrome in a component's own SCSS** — `ef-card` already provides the shell, head, 16px body padding, and separators (defined once in `_patterns.scss`). A component should only style the content it projects into the card body, not the card itself.

**Async card bodies:** while a card's data is in flight, show the reusable `ef-skeleton` (variants `text` / `kpi` / `chart` / `table`) — never an empty body or bespoke spinners. Prefer `ef-card`'s `[loading]` + `skeleton` inputs (the card swaps its body and flags `aria-busy`); use `<ef-skeleton>` directly only for non-card shells like KPI tile rows.

**Report/dashboard accent color:** the dominant color of report and dashboard visuals is the **active module's color** — the `--module` token set by `ef-app-main`'s `[data-module]` (Sales blue `--m-sales`, Purchase green, …). `ef-chart` resolves `--module` at render time and gives it the palette's first slot (chart.js canvases can't consume CSS `var()` strings); `ef-kpi-card` sparklines default to `var(--module)` directly. `EF_CHART_PALETTE` accents only color secondary series/slices, and an explicit per-series `color` still wins. Don't hardcode teal/tenant hues in report widgets — inherit the module color.

## Screen Abstractions

Consuming apps build screens by extending the abstract base classes in `@elasticias/screens` — never as standalone components. The base classes own the `ef-toolbar` wiring, `ScreenContext`, reference-data loading, server-error handling, and the `ToastService` integration.

| Screen kind | Base class | Pattern |
|---|---|---|
| List + criteria | `AbstractSearchScreenComponent` | Override `getConfig()`, `getTableColumns()`, optional `beforeSearch()`. |
| Form (id-driven CRUD) | `AbstractDetailScreenComponent` | Override `getConfig()`, `beforeSave()`, optional `afterLoad()`. The base handles route param → `loadData()` → `save()` → toast → navigation. |
| Singleton (one document, no list, no `:id`) | `AbstractDetailScreenComponent` (still!) | Override `ngAfterViewInit` (skip the route subscription, set `entityId` to a sentinel like `'default'`, set `editionState=true`, call `loadData()`), `loadData()` (call `serviceInstance.get()` with no id), `save()` (call `serviceInstance.update(this.entity)`, preserve `toastService.showSuccess()` + `afterSave()`), and `afterSave()` (no-op — there's no list to navigate back to). Don't write a custom standalone component to dodge the abstract. |

`ScreenConfig.SERVICE` is the NSwag-generated client (e.g. `CountriesClient`, `TenantProfileClient`); the abstract resolves it via the Angular injector. The matching `SCREEN` constant must equal the backend's screen-code seed value so permission grants line up.

## API Client Conventions

Apps consume the backend via the NSwag-generated `web-api-client.ts` (regenerated by `npm run generate-api` from the OpenAPI doc). **Components and screen base classes never inject `HttpClient` directly** — that includes multipart/file uploads. The framework's pattern: app's `config.nswag` references an `api-client.extensions.ts` sibling that defines `FileParameter { data: any; fileName: string; }`, so generated typed methods like `client.uploadLogo({ data: file, fileName: file.name })` compile out of the box.

Backend rule that keeps this working: file-upload endpoints take exactly one `IFormFile file` parameter (no sibling `[FromForm]` strings). NSwag's TypeScript template only appends named `[FromForm]` parts to FormData and silently drops the implicit file when both kinds coexist — leaving an upload that posts an empty body. If you need additional fields alongside a file, use `[FromQuery]` or expose a follow-up PUT.

## Nx Guidelines

- Prefix nx commands with `npx` (no global install)
- Run tasks through `nx` (not underlying tooling directly)
- Check `--help` before guessing CLI flags
