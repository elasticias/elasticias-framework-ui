import { Component, inject, Injector, OnDestroy, OnInit, signal } from '@angular/core';
import { take } from 'rxjs';
import { AbstractScreenComponent } from './abstract-screen.component';
import { ScreenStateEnum } from '../../config/screen-state.enum';
import {
    PaginationEnum,
    SearchEntity,
    SortDirectionEnum,
} from '../../entities/search.entity';

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
    implements OnInit, OnDestroy
{
    protected readonly screenState = ScreenStateEnum.SEARCH;
    protected readonly injector = inject(Injector);
    private serviceInstance: any;

    /** Current search results — populated after each `search()`. */
    readonly items = signal<TItem[]>([]);
    readonly totalCount = signal(0);
    readonly loading = signal(false);
    readonly errorMsg = signal<string | null>(null);

    /** Live search criteria (paging, sort, text, dates, custom). */
    readonly criteria = signal<SearchEntity>(new SearchEntity({}));

    override ngOnInit(): void {
        super.ngOnInit();
        this.serviceInstance = this.injector.get(this.getConfig()!.SERVICE as any);

        const cfg = this.getConfig();
        const hasDynamicRefs = (cfg?.SEARCH_REFERENTIALS_KEYS?.length ?? 0) > 0;
        const hasStaticLists = (cfg?.SEARCH_STATIC_LISTS?.length ?? 0) > 0;

        if (hasDynamicRefs || hasStaticLists) {
            if (hasDynamicRefs) this.initializeReferenceKeys(cfg!.SEARCH_REFERENTIALS_KEYS);
            if (hasStaticLists) this.initializeStaticLists(cfg!.SEARCH_STATIC_LISTS);
            this.loadReferenceData(cfg!.REF_DATA_OPTIONS);
            this.refDataLoaded$.pipe(take(1)).subscribe(() => this.bootstrapInitialSearch());
        } else {
            this.bootstrapInitialSearch();
        }
    }

    /** Restore criteria from cache (returning to a screen) or seed defaults. */
    private bootstrapInitialSearch(): void {
        const cached = this.cacheService.getCache<any>(this.screenStateKey);
        if (cached) {
            this.criteria.set(new SearchEntity(cached));
        } else {
            const cfg = this.getConfig();
            const fresh = new SearchEntity({});
            if (cfg?.DEFAULT_SORT) {
                fresh.sort = [
                    { field: cfg.DEFAULT_SORT.field, sortDirection: cfg.DEFAULT_SORT.direction },
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
     * Run a search with the current `criteria()`. Always populates
     * `items` / `totalCount` / `loading` / `errorMsg` and persists the
     * criteria to cache on success so revisits can restore.
     */
    search(): void {
        this.loading.set(true);
        this.errorMsg.set(null);

        this.serviceInstance.search(this.criteria()).subscribe({
            next: (result: any) => {
                this.items.set((result?.items ?? []) as TItem[]);
                this.totalCount.set(result?.totalCount ?? 0);
                this.cacheService.setCache(this.screenStateKey, this.criteria());
                this.loading.set(false);
            },
            error: (err: any) => {
                console.error('Search failed', err);
                this.errorMsg.set(err?.message ?? 'Erreur de chargement');
                this.loading.set(false);
            },
        });
    }

    /* ── Convenience criteria mutators ───────────────────────────── */

    setSearchText(text: string): void {
        this.criteria.update(c => this.cloneCriteria(c, { searchText: text || undefined, page: 1 }));
        this.search();
    }

    setPage(pageNumber: number, pageSize?: number): void {
        this.criteria.update(c =>
            this.cloneCriteria(c, {
                page: pageNumber,
                pageSize: pageSize ?? c.pagination.pageSize,
            }),
        );
        this.search();
    }

    setSort(field: string, direction: string = SortDirectionEnum.DESC): void {
        this.criteria.update(c =>
            this.cloneCriteria(c, { sort: [{ field, sortDirection: direction }] }),
        );
        this.search();
    }

    setDateRange(start: Date | null, end: Date | null): void {
        this.criteria.update(c => this.cloneCriteria(c, { start, end, page: 1 }));
        this.search();
    }

    /** Patch arbitrary extra fields onto the criteria (for module-specific filters). */
    patchCriteria(patch: Record<string, any>): void {
        this.criteria.update(c => this.cloneCriteria(c, { extra: patch, page: 1 }));
        this.search();
    }

    /** Reset to defaults and re-fetch. */
    clear(): void {
        const cfg = this.getConfig();
        const fresh = new SearchEntity({});
        if (cfg?.DEFAULT_SORT) {
            fresh.sort = [
                { field: cfg.DEFAULT_SORT.field, sortDirection: cfg.DEFAULT_SORT.direction },
            ];
        }
        this.criteria.set(fresh);
        this.cacheService.setCache(this.screenStateKey, fresh);
        this.search();
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

    /* ── Navigation helpers (mirror legacy class) ───────────────── */

    navigateToDetails(id?: any): void {
        const path = id || id === 0
            ? `${this.currentUrl}/details/${id}`
            : `${this.currentUrl}/details`;
        this.router.navigate([path]);
    }

    add(): void {
        this.router.navigate([this.currentUrl.concat('/details')]);
    }

    edit(id: any): void {
        if (!id) {
            this.toastService.showError('Item [id] is undefined !');
            return;
        }
        this.router.navigate([this.currentUrl.concat('/details/'), id]);
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
                }),
            () => undefined,
        );
    }

    duplicate(id: any): void {
        if (!id) {
            this.toastService.showError('Item [id] is undefined !');
            return;
        }
        this.router.navigate([this.currentUrl.concat('/details/'), id], {
            queryParams: { mode: 'duplicate' },
        });
    }

    ngOnDestroy(): void {
        // Subclasses can override to clean up subscriptions; nothing to
        // tear down on the base since search subscriptions auto-complete.
    }
}
