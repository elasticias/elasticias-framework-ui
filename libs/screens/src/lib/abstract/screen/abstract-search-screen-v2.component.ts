import {
  Component,
  computed,
  inject,
  Injector,
  OnDestroy, OnInit,
  signal,
} from '@angular/core';
import { take } from 'rxjs';
import { AbstractScreenComponent } from './abstract-screen.component';
import { ScreenStateEnum } from '../../config/screen-state.enum';
import { ActiveFilter } from '../../entities/active-filter.entity';
import { CsvUtils } from '@elasticias/utils';
import { TranslateService } from '@ngx-translate/core';
import {
  EfDataCardColumn,
  EfDataCardExportRequest,
  EfDataCardSort,
  EfReferenceColumnOpts,
} from '../../entities/data-card-column.entity';
import { EfDateRange } from '../../entities/date-range.entity';
import {
  PaginationEnum,
  SearchEntity,
  SortDirectionEnum,
} from '../../entities/search.entity';

/**
 * Declarative definition of an advanced-search select filter rendered in
 * the filter drawer. One `<ef-select>` is rendered per entry; the screen
 * stays type-agnostic — `key` is simply the criteria property name sent to
 * the backend (which must expose a matching typed query prop, e.g.
 * `CityIds: List<int>`, `ClientIds: List<string>`, a scalar code, …). Works
 * for both single-select (`multiple` omitted/false → scalar value) and
 * multi-select (`multiple: true` → array value).
 */
export interface AdvancedSelectFilter {
  /** Criteria property name sent to the backend (must match a typed query prop). */
  key: string;
  /** Reference-data key supplying the options (e.g. `'cities'`). */
  refKey: string;
  /** i18n key for the field label (rendered by `ef-select`). */
  labelKey: string;
  /** Multi-select when `true` (array value); single-select otherwise (scalar). */
  multiple?: boolean;
  /** Option value field (default `'code'`). */
  valueField?: string;
  /** Option label field (default `'label'`). */
  labelField?: string;
  /** Placeholder i18n key (default `'common_all'`). */
  placeholderKey?: string;
}

/**
 * Signal-first counterpart to {@link AbstractSearchScreenComponent}.
 *
 * Built for V2 + zoneless apps: state is exposed as signals
 * (`items`, `loading`, `errorMsg`, `totalCount`, `criteria`) and the
 * class is intentionally **decoupled from PrimeNG `<p-table>`** —
 * subclasses render however they want (Comptoir `.tbl` patterns,
 * cards, virtual lists, …) and call the helpers below to mutate the
 * search criteria + re-execute.
 *
 * Same `ScreenConfig` surface as the legacy abstract:
 * - `SCREEN` (string code matching backend grants)
 * - `SERVICE` (NSwag client class with `search(criteria)` method)
 * - `SEARCH_REFERENTIALS_KEYS` / `SEARCH_STATIC_LISTS` for ref-data
 * - `DEFAULT_SORT` for first load
 *
 * Subclasses typically:
 *
 * ```ts
 * @Component({ ... })
 * export class FooComponent extends AbstractSearchScreenV2<FooDto> {
 *   protected override getConfig() { return FooConfig; }
 *   readonly rows = computed(() => this.items().map(toRow));
 * }
 * ```
 */
@Component({ template: '', standalone: true })
export abstract class AbstractSearchScreenV2<TItem = any>
  extends AbstractScreenComponent
  implements OnInit
{
  protected readonly screenState = ScreenStateEnum.SEARCH;
  protected readonly injector = inject(Injector);
  private serviceInstance: any;

  /**
   * Translate lazily, through the injector.
   *
   * Taking `TranslateService` as a field injection makes it a hard
   * construction-time requirement of every screen that extends this base,
   * which is more than the one method needing it deserves — and it is the
   * same shape as the DI cycle ADR-021 records in the app. Resolving it
   * here keeps the dependency optional: an app without ngx-translate gets
   * the key back rather than a crash.
   */
  protected t(key: string, params?: Record<string, unknown>): string {
    const translate = this.injector.get(TranslateService, null);
    return translate ? translate.instant(key, params) : key;
  }

  /** Monotonic guard: bumped on every `search()` call so an
   *  out-of-order (stale) response from an earlier search can be
   *  dropped instead of overwriting the latest results. */
  private searchSeq = 0;

  /** Current search results — populated after each `search()`. */
  readonly items = signal<TItem[]>([]);
  readonly totalCount = signal(0);
  readonly loading = signal(false);
  readonly errorMsg = signal<string | null>(null);

  /** Live search criteria (paging, sort, text, dates, custom). */
  readonly criteria = signal<SearchEntity>(new SearchEntity({}));

  /**
   * Active date-range filter shown in `ef-datepicker-advanced`'s
   * trigger. Display-only at construction time — actually filters
   * the search once `onDateRangeChange()` fires (or a screen wires
   * one in `ngOnInit`).
   *
   * Override `buildDefaultDateRange()` per screen to ship a
   * different starting preset.
   */
  readonly dateRange = signal<EfDateRange>(this.buildDefaultDateRange());

  /* ── Filter-bar UI state (DRY) ──────────────────────────────────
       Identical across every list screen — lifted up so subclasses
       don't re-declare. `clear()` resets all four signals. */

  /** Free-text search input value — bound `[(searchText)]` on
   *  ef-smart-bar; drives `runSearch()`. */
  readonly searchQuery = signal('');

  /** Active status pill-group selection (defaults to `'all'`). */
  readonly statusFilter = signal<string>('all');

  /** Whether the advanced-filter drawer is open. */
  readonly drawerOpen = signal(false);

  /** Active named filter chips shown in the smart-bar. */
  readonly activeFilters = signal<ActiveFilter[]>([]);

  /* ── Advanced-filter selects (DRY) ──────────────────────────────
       Declarative `<ef-select>` filters rendered in the filter drawer.
       Override `advancedFilters` per screen; the base owns the value
       state, the apply→criteria push, and the reset. Type-agnostic:
       each `key` maps to a typed backend query prop of any shape. */

  /** Advanced-filter select definitions. Empty = no advanced filters. */
  readonly advancedFilters: AdvancedSelectFilter[] = [];

  /** Criteria key of the screen's activation tri-state filter
   *  (`ef-activation-filter`), e.g. `'isActive'`. When set, the base
   *  applies, baseline-clears, and cache-restores the boolean like any
   *  declared advanced filter — the screen only binds the component to
   *  `advancedValues()` / `setAdvancedValue()`. `null` = no activation
   *  filter. */
  protected readonly activationFilterKey: string | null = null;

  /** Live values per advanced filter, keyed by `AdvancedSelectFilter.key`. */
  readonly advancedValues = signal<Record<string, unknown>>({});

  /** Store the picked value(s) for one advanced filter (no search yet —
   *  the drawer's `(apply)` runs it). */
  setAdvancedValue(key: string, value: unknown): void {
    this.advancedValues.update((v) => ({ ...v, [key]: value }));
  }

  /** Push every advanced-filter value into the criteria as typed
   *  top-level props and re-run the search. Wired to the drawer's
   *  `(apply)`. Every DECLARED key is written on apply — a cleared
   *  control must actively remove its (possibly cache-restored)
   *  criteria value, not silently leave it behind. */
  applyAdvancedFilters(): void {
    const patch: Record<string, any> = {};
    for (const f of this.advancedFilters) patch[f.key] = undefined;
    if (this.activationFilterKey) patch[this.activationFilterKey] = undefined;
    Object.assign(patch, this.advancedValues());
    this.patchCriteria(patch);
  }

  /* ── Selection (DRY) ────────────────────────────────────────────
       Per-row checkbox state, used by `ef-bulk-bar` and the auto
       row-actions cell. */

  /** Selected row ids — keyed by `String(rowId(row))`. */
  readonly selected = signal<ReadonlySet<string>>(new Set());

  /** Live count derived from `selected`. */
  readonly selectionCount = computed(() => this.selected().size);

  /* ── Sort indicator (DRY) ───────────────────────────────────────
       ef-data-card consumes `[sort]` as `{ field, direction: 'asc' |
       'desc' }`. The base criteria stores the legacy
       'Ascending' / 'Descending' strings — convert lazily here. */

  readonly currentSort = computed<EfDataCardSort | null>(() => {
    const s = this.criteria().sort?.[0];
    if (!s?.field) return null;
    return {
      field: s.field,
      direction: (s.sortDirection ?? '').toLowerCase().startsWith('asc')
        ? 'asc'
        : 'desc',
    };
  });

  /* ── Row-actions standard surface ───────────────────────────────
       Subclasses can flip these off when a particular CRUD action
       isn't applicable. Defaults are all-on; permission filtering
       still happens at render time via ScreenContext, so an action
       that the user can't perform is hidden regardless of these
       flags. */

  readonly showViewAction = signal(true);
  readonly showEditAction = signal(true);
  readonly showDuplicateAction = signal(true);
  readonly showDeleteAction = signal(true);

  /**
   * PK accessor for a row. Default returns `row?.id` — override when
   * the backend names its primary key something else (e.g. sales-orders'
   * `orderId`). Used by the row-actions dispatcher and as the implicit
   * navigateToDetails / edit / delete argument.
   */
  rowId(row: any): any {
    return row?.id;
  }

  /**
   * Dispatch helper wired to ef-data-card's `(rowAction)` output and
   * the auto-rendered row-actions cell. Routes the standard four
   * actions to the inherited methods so subclasses don't have to
   * declare per-screen rowActions arrays.
   */
  onRowAction(
    action: 'view' | 'edit' | 'duplicate' | 'delete',
    row: any,
  ): void {
    const id = this.rowId(row);
    switch (action) {
      case 'view':
        this.navigateToDetails(id);
        break;
      case 'edit':
        this.edit(id);
        break;
      case 'duplicate':
        this.duplicate(id);
        break;
      case 'delete':
        this.delete(id);
        break;
    }
  }

  /* ── Date-range filter (DRY) ────────────────────────────────────
       Wired to ef-datepicker-advanced. The default range is
       `last_30_days` — override `buildDefaultDateRange()` per screen
       if a different starting preset is needed. */

  /**
   * Wired to `<ef-datepicker-advanced (rangeChange)>` — stores the
   * range for trigger display and pushes it into the search criteria
   * so the next `search()` filters by it.
   */
  onDateRangeChange(range: EfDateRange): void {
    this.dateRange.set(range);
    this.setDateRange(range.start, range.end);
  }

  /**
   * Reset the date range to the default. Called automatically by
   * `clear()` so screens don't have to remember to invoke it from
   * their own `clearAll()` orchestration.
   */
  protected resetDateRange(): void {
    this.dateRange.set(this.buildDefaultDateRange());
  }

  /**
   * Build the default `EfDateRange`. Override per screen to ship a
   * different default — e.g., a 90-day window for low-velocity
   * catalogues. Default: last 30 days.
   */
  protected buildDefaultDateRange(): EfDateRange {
    return {
      start: this.daysAgo(29),
      end: this.startOfToday(),
      presetKey: 'last_30_days',
      labelKey: 'date_preset_last_30_days',
      label: '30 derniers jours',
    };
  }

  /** Today at 00:00 local time. */
  protected startOfToday(): Date {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  /** N days before today, at 00:00 local time. */
  protected daysAgo(n: number): Date {
    const t = this.startOfToday();
    t.setDate(t.getDate() - n);
    return t;
  }

  /* ── Filter-bar handlers (DRY) ──────────────────────────────────
       Wired to ef-smart-bar / pill-group / filter-drawer / chip
       removal. None of these need overriding — subclasses use them
       through inherited template bindings. */

  /** Wired to filter-drawer's `(apply)` — pushes the current
   *  searchQuery into the criteria and re-runs the search. */
  runSearch(): void {
    this.setSearchText(this.searchQuery());
  }

  /** Pill-group click handler. Stores the selected status code; the
   *  search itself only re-runs once the consumer pushes the value
   *  into the criteria (or wires it via beforeSearch). */
  setStatus(key: string): void {
    this.statusFilter.set(key);
  }

  toggleDrawer(): void {
    this.drawerOpen.update((o) => !o);
  }

  /** Drop a chip from the active-filters list. */
  removeFilter(key: string): void {
    this.activeFilters.update((filters) =>
      filters.filter((f) => f.key !== key),
    );
  }

  /* ── Selection helpers (DRY) ────────────────────────────────────
       Mutate `selected` (Set<string>); template binds via
       `[checked]="isSelected(rowId(row))"` and
       `(change)="toggleSelection(rowId(row))"`. */

  toggleSelection(id: string): void {
    this.selected.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** Toggle every visible row in or out of the selection in one shot. */
  toggleAllSelection(): void {
    const all = this.items().map((item) => String(this.rowId(item)));
    this.selected.update((set) =>
      set.size === all.length ? new Set() : new Set(all),
    );
  }

  isSelected(id: string): boolean {
    return this.selected().has(id);
  }

  /* ── Column builders (DRY) ──────────────────────────────────────
       Convenience helpers that return a fully-formed EfDataCardColumn
       with sensible per-type defaults. Pass `opts` to override any
       property — `opts` always wins over the builder's defaults. */

  /** Selection checkbox column — paired with `efColumnTemplate="select"`
   *  for the row's checkbox. 40px wide, no other props. */
  protected addSelectColumn(width = '40px'): EfDataCardColumn {
    return { id: 'select', width };
  }

  /** Plain text column. */
  protected addTextColumn(
    field: string,
    headerKey: string,
    opts: Partial<EfDataCardColumn> = {},
  ): EfDataCardColumn {
    return { id: field, ...opts, field, headerKey, type: 'text' };
  }

  /** Monospace column — JetBrains Mono with tabular-nums; for codes,
   *  IDs, refs, anything where character alignment matters. */
  protected addMonoColumn(
    field: string,
    headerKey: string,
    opts: Partial<EfDataCardColumn> = {},
  ): EfDataCardColumn {
    return { id: field, ...opts, field, headerKey, type: 'mono' };
  }

  /** Number column — end-aligned, integer by default. Override
   *  `minFractionDigits` / `maxFractionDigits` via opts for decimals. */
  protected addNumberColumn(
    field: string,
    headerKey: string,
    opts: Partial<EfDataCardColumn> = {},
  ): EfDataCardColumn {
    return {
      id: field,
      minFractionDigits: 0,
      maxFractionDigits: 0,
      ...opts,
      field,
      headerKey,
      type: 'number',
      align: opts.align ?? 'end',
    };
  }

  /** Money column — end-aligned. ISO currency code defaults to `'MAD'`
   *  (Elasticias' primary tenant locale); pass `opts.currencyCode` for
   *  euros / USD / etc. */
  protected addMoneyColumn(
    field: string,
    headerKey: string,
    opts: Partial<EfDataCardColumn> = {},
  ): EfDataCardColumn {
    return {
      id: field,
      currencyCode: 'MAD',
      ...opts,
      field,
      headerKey,
      type: 'money',
      align: opts.align ?? 'end',
    };
  }

  /** Date column — formats as `dd/MM/yyyy` by default. */
  protected addDateColumn(
    field: string,
    headerKey: string,
    opts: Partial<EfDataCardColumn> = {},
  ): EfDataCardColumn {
    return { id: field, ...opts, field, headerKey, type: 'date' };
  }

  /** Datetime column — formats as `dd/MM/yyyy HH:mm` by default. */
  protected addDatetimeColumn(
    field: string,
    headerKey: string,
    opts: Partial<EfDataCardColumn> = {},
  ): EfDataCardColumn {
    return { id: field, ...opts, field, headerKey, type: 'datetime' };
  }

  /** Boolean column — renders the `bool yes / bool no` indicator. */
  protected addBooleanColumn(
    field: string,
    headerKey: string,
    opts: Partial<EfDataCardColumn> = {},
  ): EfDataCardColumn {
    return { id: field, ...opts, field, headerKey, type: 'boolean' };
  }

  /** Static-class chip column — renders `chip <chipPrefix><value>`.
   *  Use `addStatusColumn` for reference_data-driven palettes. */
  protected addChipColumn(
    field: string,
    headerKey: string,
    opts: Partial<EfDataCardColumn> = {},
  ): EfDataCardColumn {
    return {
      id: field,
      chipPrefix: 'chip-',
      ...opts,
      field,
      headerKey,
      type: 'chip',
    };
  }

  /** Status chip column — palette + label resolved from
   *  `reference_data` via `referenceKey`. Sortable by default. */
  protected addStatusColumn(
    field: string,
    headerKey: string,
    referenceKey: string,
    opts: Partial<EfDataCardColumn> = {},
  ): EfDataCardColumn {
    return {
      id: field,
      sortable: true,
      ...opts,
      field,
      headerKey,
      type: 'status',
      referenceKey,
    };
  }

  /** Reference column — looks up `field`'s value in the reference
   *  list keyed by `referenceKey`, renders the matching item's label.
   *  Defaults: `valueField: 'id'`, `labelField: 'label'`. */
  protected addReferenceColumn(
    field: string,
    headerKey: string,
    referenceKey: string,
    opts: EfReferenceColumnOpts = {},
  ): EfDataCardColumn {
    const { valueField, labelField, ...rest } = opts;
    return {
      id: field,
      ...rest,
      field,
      headerKey,
      type: 'reference',
      referenceKey,
      referenceValueField: valueField ?? rest.referenceValueField ?? 'code',
      referenceLabelField: labelField ?? rest.referenceLabelField ?? 'label',
    };
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.serviceInstance = this.injector.get(this.getConfig()!.SERVICE as any);

    const cfg = this.getConfig();
    const hasDynamicRefs = (cfg?.SEARCH_REFERENTIALS_KEYS?.length ?? 0) > 0;
    const hasStaticLists = (cfg?.SEARCH_STATIC_LISTS?.length ?? 0) > 0;

    if (hasDynamicRefs || hasStaticLists) {
      if (hasDynamicRefs)
        this.initializeReferenceKeys(cfg!.SEARCH_REFERENTIALS_KEYS);
      if (hasStaticLists) this.initializeStaticLists(cfg!.SEARCH_STATIC_LISTS);
      this.loadReferenceData(cfg!.REF_DATA_OPTIONS);
      this.refDataLoaded$.pipe(take(1)).subscribe(() => {
        this.bootstrapInitialSearch();
        this.applyDeepLinkStatus();
      });
    } else {
      this.bootstrapInitialSearch();
      this.applyDeepLinkStatus();
    }
  }

  /**
   * Deep-link support: `/<list>?status=<code>` pre-selects the status
   * pill after the initial criteria bootstrap (so the reset doesn't
   * clobber it). Runs through `setStatus()`, so a subclass override
   * that pushes the status into the criteria (the usual pattern) gets
   * the deep-linked value too. No-op without the query param.
   */
  private applyDeepLinkStatus(): void {
    const status = this.queryParam('status');
    if (status) this.setStatus(status);
  }

  /** Restore criteria from cache (returning to a screen) or seed defaults. */
  private bootstrapInitialSearch(): void {
    const cached = this.cacheService.getCache<any>(this.screenStateKey);
    if (cached) {
      this.criteria.set(new SearchEntity(cached));
      this.restoreFilterUiFromCriteria(cached);
    } else {
      const cfg = this.getConfig();
      const fresh = new SearchEntity({});
      if (cfg?.DEFAULT_SORT) {
        fresh.sort = [
          {
            field: cfg.DEFAULT_SORT.field,
            sortDirection: cfg.DEFAULT_SORT.direction,
          },
        ];
      }
      fresh.pagination = {
        pageNumber: PaginationEnum.DEFAULT_PAGE,
        pageSize: PaginationEnum.DEFAULT_PAGE_SIZE,
      };
      this.criteria.set(fresh);
    }
    this.search();
  }

  /**
   * Cache-restore sync: when a revisit restores cached criteria,
   * reflect the restored filters back into the filter-bar UI state so
   * what the drawer / search box displays matches what the search will
   * actually send (otherwise a stale criteria filter keeps applying
   * while every control reads "Tous"). Base handles the free-text
   * input and the declared advanced filters; override (calling super)
   * to sync screen-specific state — status pill, custom switches, ….
   */
  protected restoreFilterUiFromCriteria(cached: Record<string, any>): void {
    this.searchQuery.set(cached['searchText'] ?? '');
    const next: Record<string, unknown> = {};
    for (const f of this.advancedFilters) {
      const value = cached[f.key];
      if (value !== undefined && value !== null) next[f.key] = value;
    }
    const activationKey = this.activationFilterKey;
    if (activationKey && typeof cached[activationKey] === 'boolean') {
      next[activationKey] = cached[activationKey];
    }
    if (Object.keys(next).length) {
      this.advancedValues.update((cur) => ({ ...cur, ...next }));
    }
  }

  /**
   * Run a search with the current `criteria()`. Always populates
   * `items` / `totalCount` / `loading` / `errorMsg` and persists the
   * criteria to cache on success so revisits can restore.
   */
  search(): void {
    this.loading.set(true);
    this.errorMsg.set(null);

    // Stale responses are dropped so the latest issued search always
    // wins, even if an earlier in-flight search resolves later.
    const seq = ++this.searchSeq;

    this.serviceInstance.search(this.criteria()).subscribe({
      next: (result: any) => {
        if (seq !== this.searchSeq) return;
        this.items.set((result?.items ?? []) as TItem[]);
        this.totalCount.set(result?.totalCount ?? 0);
        this.cacheService.setCache(this.screenStateKey, this.criteria());
        this.loading.set(false);
      },
      error: (err: any) => {
        if (seq !== this.searchSeq) return;
        console.error('Search failed', err);
        this.errorMsg.set(err?.message ?? 'Erreur de chargement');
        this.loading.set(false);
      },
    });
  }

  /* ── Convenience criteria mutators ───────────────────────────── */

  setSearchText(text: string): void {
    this.criteria.update((c) =>
      this.cloneCriteria(c, { searchText: text || undefined, page: 1 }),
    );
    this.search();
  }

  setPage(pageNumber: number, pageSize?: number): void {
    this.criteria.update((c) =>
      this.cloneCriteria(c, {
        page: pageNumber,
        pageSize: pageSize ?? c.pagination.pageSize,
      }),
    );
    this.search();
  }

  setSort(field: string, direction: string = SortDirectionEnum.DESC): void {
    // Normalize `'asc' | 'desc'` (ef-data-card emits these) to the
    // backend's legacy `'Ascending' | 'Descending'` strings, so
    // subclasses don't need to override `setSort` just for that.
    const normalized = (direction || '').toLowerCase().startsWith('asc')
      ? 'Ascending'
      : 'Descending';
    this.criteria.update((c) =>
      this.cloneCriteria(c, { sort: [{ field, sortDirection: normalized }] }),
    );
    this.search();
  }

  setDateRange(start: Date | null, end: Date | null): void {
    this.criteria.update((c) => this.cloneCriteria(c, { start, end, page: 1 }));
    this.search();
  }

  /** Patch arbitrary extra fields onto the criteria (for module-specific filters). */
  patchCriteria(patch: Record<string, any>): void {
    this.criteria.update((c) =>
      this.cloneCriteria(c, { extra: patch, page: 1 }),
    );
    this.search();
  }

  /** Reset everything to defaults and re-fetch. Subclasses bind this
   *  to ef-smart-bar's `(clear)` output directly — no per-screen
   *  `clearAll()` orchestration needed. */
  clear(): void {
    const cfg = this.getConfig();
    const fresh = new SearchEntity({});
    if (cfg?.DEFAULT_SORT) {
      fresh.sort = [
        {
          field: cfg.DEFAULT_SORT.field,
          sortDirection: cfg.DEFAULT_SORT.direction,
        },
      ];
    }
    this.criteria.set(fresh);

    // Reset all the shared filter-bar / selection signals so
    // subclasses don't have to track each one individually.
    this.searchQuery.set('');
    this.statusFilter.set('all');
    this.drawerOpen.set(false);
    this.activeFilters.set([]);
    this.advancedValues.set({});
    this.selected.set(new Set());
    this.resetDateRange();

    this.cacheService.setCache(this.screenStateKey, fresh);
    this.search();
  }

  /* ── CSV export ───────────────────────────────────────────────── */

  /**
   * Rows fetched per request while exporting. The server rejects anything
   * above 100 (`PaginationCriteriaValidator`), so this is the ceiling, not
   * a preference.
   */
  private static readonly EXPORT_PAGE_SIZE = 100;

  /**
   * Upper bound on an export. A tenant with 20k orders would otherwise
   * fire 200 sequential requests on one click. When the result set is
   * larger, the file holds the first `EXPORT_MAX_ROWS` and the user is
   * told so rather than handed a silently truncated file.
   */
  private static readonly EXPORT_MAX_ROWS = 5000;

  readonly exporting = signal(false);

  /**
   * Write the current result set to a CSV, honouring the active search,
   * filters and sort, with the columns the viewer can actually see.
   *
   * The card raises this because Export lives beside Density and Columns —
   * all three act on the result set — but only the screen knows the query,
   * so the fetching happens here.
   */
  exportCsv(request: EfDataCardExportRequest): void {
    if (this.exporting()) return;

    const columns = request.columns.filter((c) => c.exportable !== false);
    if (columns.length === 0) return;

    this.exporting.set(true);
    void this.collectExportRows()
      .then(({ rows, truncated }) => {
        if (rows.length === 0) {
          this.toastService.showInfo(this.t('common_export_empty'));
          return;
        }

        const flattened = rows.map((row) => {
          const record: Record<string, unknown> = {};
          for (const col of columns) {
            record[col.id] = request.resolveCell(row, col);
          }
          return record;
        });

        const csv = CsvUtils.toCsv(
          flattened,
          columns.map((col) => ({
            key: col.id,
            header: col.headerKey ? this.t(col.headerKey) : (col.header ?? col.id),
          })),
        );

        CsvUtils.download(this.exportFileName(), csv);

        if (truncated) {
          this.toastService.showInfo(
            this.t('common_export_truncated', {
              count: AbstractSearchScreenV2.EXPORT_MAX_ROWS,
            }),
          );
        }
      })
      .catch(() => this.toastService.showError(this.t('common_export_failed')))
      .finally(() => this.exporting.set(false));
  }

  /** Page through the current criteria until the result set is exhausted. */
  private async collectExportRows(): Promise<{ rows: any[]; truncated: boolean }> {
    const pageSize = AbstractSearchScreenV2.EXPORT_PAGE_SIZE;
    const max = AbstractSearchScreenV2.EXPORT_MAX_ROWS;
    const rows: any[] = [];
    let page = 1;

    for (;;) {
      const criteria = this.cloneCriteria(this.criteria(), { page, pageSize });
      const result: any = await new Promise((resolve, reject) =>
        this.serviceInstance
          .search(criteria)
          .pipe(take(1))
          .subscribe({ next: resolve, error: reject }),
      );

      const batch: any[] = result?.items ?? [];
      rows.push(...batch);

      const total: number = result?.totalCount ?? rows.length;
      if (rows.length >= max) return { rows: rows.slice(0, max), truncated: total > max };
      if (batch.length < pageSize || rows.length >= total) return { rows, truncated: false };
      page += 1;
    }
  }


  /** `<screen>-YYYY-MM-DD-HHmm.csv`, so repeated exports do not collide. */
  private exportFileName(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const stamp =
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
      `-${pad(d.getHours())}${pad(d.getMinutes())}`;
    const screen = (this.getConfig()?.SCREEN ?? 'export').toString().toLowerCase();
    return `${screen}-${stamp}.csv`;
  }

  private cloneCriteria(
    c: SearchEntity,
    patch: {
      searchText?: string | undefined;
      page?: number;
      pageSize?: number;
      sort?: SearchEntity['sort'];
      start?: Date | null;
      end?: Date | null;
      extra?: Record<string, any>;
    },
  ): SearchEntity {
    const next = new SearchEntity({});
    Object.assign(next, c);
    if ('searchText' in patch) (next as any).searchText = patch.searchText;
    if (patch.page !== undefined || patch.pageSize !== undefined) {
      next.pagination = {
        pageNumber: patch.page ?? c.pagination.pageNumber,
        pageSize: patch.pageSize ?? c.pagination.pageSize,
      };
    }
    if (patch.sort !== undefined) next.sort = patch.sort;
    if (patch.start !== undefined) next.start = patch.start;
    if (patch.end !== undefined) next.end = patch.end;
    if (patch.extra) Object.assign(next, patch.extra);
    return next;
  }

  /* ── Navigation helpers ─────────────────────────────────────────
       V2 routing convention (matches v1):
         /<list>/details        → AbstractDetailScreenV2 in create mode
         /<list>/details/:id    → AbstractDetailScreenV2 in edit mode
         /<list>/details/:id?mode=duplicate → duplicate-as-template

       `currentUrl` cached on `AbstractScreenComponent.ngOnInit` is
       not reliable (Router.url isn't committed yet during route
       activation, so it holds the previous URL). Read `router.url`
       at call time via `resolveListUrl()` instead. */

  /** Resolve the list-screen URL at call time. Drops query / fragment
   *  and strips a trailing slash. */
  protected resolveListUrl(): string {
    let url = this.router.url || this.currentUrl || '';
    const q = url.indexOf('?');
    if (q >= 0) url = url.slice(0, q);
    const h = url.indexOf('#');
    if (h >= 0) url = url.slice(0, h);
    return url.replace(/\/$/, '');
  }

  navigateToDetails(id?: any): void {
    const base = `${this.resolveListUrl()}/details`;
    if (id == null && id !== 0) {
      this.router.navigate([base]);
      return;
    }
    this.router.navigate([base, id]);
  }

  /** Open the create form. */
  add(): void {
    this.router.navigate([`${this.resolveListUrl()}/details`]);
  }

  edit(id: any): void {
    if (!id) {
      this.toastService.showError('Item [id] is undefined !');
      return;
    }
    this.router.navigate([`${this.resolveListUrl()}/details`, id]);
  }

  delete(id: any): void {
    if (!id) {
      this.toastService.showError('Item [id] is undefined!');
      return;
    }
    this.confirmDialogService.confirm(
      'Êtes-vous sûr de vouloir supprimer ?',
      () =>
        this.serviceInstance.delete(id).subscribe({
          next: (result: any) => {
            if (result?.errors?.length) {
              this.handleErrors(result.errors);
            } else {
              this.search();
              this.toastService.showSuccess();
            }
          },
          // The HTTP error interceptor surfaces the message (toast). Swallow
          // here so a rejected delete (e.g. a 422 business-rule violation)
          // doesn't bubble up as an unhandled error.
          error: () => undefined,
        }),
      () => undefined,
    );
  }

  duplicate(id: any): void {
    if (!id) {
      this.toastService.showError('Item [id] is undefined !');
      return;
    }
    this.router.navigate([`${this.resolveListUrl()}/details`, id], {
      queryParams: { mode: 'duplicate' },
    });
  }

    // AbstractComponent declares `abstract ngOnDestroy()`, so this must exist.
    // There is genuinely nothing to tear down here; removing it would push the
    // requirement onto every consumer component.
    // eslint-disable-next-line @angular-eslint/no-empty-lifecycle-method
    ngOnDestroy(): void {
    // Subclasses can override to clean up subscriptions; nothing to
    // tear down on the base since search subscriptions auto-complete.
    }
}
