import {
    Component,
    DestroyRef,
    Injector,
    OnDestroy,
    OnInit,
    inject,
    signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Location } from '@angular/common';
import { combineLatest } from 'rxjs';
import { AbstractScreenComponent } from './abstract-screen.component';
import { ScreenStateEnum } from '../../config/screen-state.enum';
import { ViewModelEntity } from '../../entities/view-model.entity';

/**
 * Signal-first counterpart to {@link AbstractDetailScreenComponent}.
 *
 * Same business mechanism as v1 but signal-based and zoneless-friendly:
 * `entity` / `entityId` / `editionState` / `duplicateMode` / `loading`
 * / `errorMsg` are all writable signals.
 *
 * Routing convention (V2):
 * - `/<resource>/details`         → new (create mode, `editionState=false`)
 * - `/<resource>/details/:id`     → edit mode (loads via `service.get(id)`)
 * - `/<resource>/details/:id?mode=duplicate` → loads then strips id on save
 *
 * The same component handles all three paths — the route param +
 * `mode` query string drives the state. After a successful create
 * (or duplicate-save), the screen navigates to
 * `/<resource>/details/<new-id>` so the user lands in edit mode.
 *
 * Subclasses typically override:
 * - `getConfig()`               — returns ScreenConfig with SERVICE
 * - `beforeSave(): boolean`     — return false to cancel save
 *                                 (default: true)
 * - `afterLoad()`               — post-process loaded entity
 * - `afterSave(result)`         — default invalidates refs + navigates
 *                                 to the new edit URL after create
 * - `onSaveError(errors)`       — surface form-level validation errors
 * - `customizeDuplicatedEntity` — clean fields before duplicating
 *
 * ```ts
 * @Component({ ... })
 * export class FooDetailComponent extends AbstractDetailScreenV2<FooDto> {
 *   override getConfig() { return FooConfig; }
 *
 *   protected override beforeSave(): boolean {
 *     // validate this.entity() shape; return false to cancel
 *     return true;
 *   }
 * }
 * ```
 */
@Component({ template: '', standalone: true })
export abstract class AbstractDetailScreenV2<TItem extends object = any>
    extends AbstractScreenComponent
    implements OnInit, OnDestroy
{
    protected readonly screenState = ScreenStateEnum.DETAIL;
    protected readonly injector = inject(Injector);
    protected readonly location = inject(Location);
    private readonly destroyRef = inject(DestroyRef);

    private serviceInstance: any;

    /** Loaded entity. Empty object when on `/details` (create mode). */
    readonly entity = signal<TItem>(<TItem>{});

    /** PK from the route param, or `null` on `/details` (new). */
    readonly entityId = signal<any>(null);

    /** Edit-mode flag — true when an id is present and we're not duplicating. */
    readonly editionState = signal(false);

    /**
     * When true, the loaded entity is treated as a template — saving
     * runs `service.create()` instead of `service.update()`. Set by
     * the `?mode=duplicate` query param.
     */
    readonly duplicateMode = signal(false);

    /** True while service.get / create / update / delete is in flight. */
    readonly loading = signal(false);

    /** Last load / save error message — empty string when none. */
    readonly errorMsg = signal<string | null>(null);

    override ngOnInit(): void {
        super.ngOnInit();
        this.serviceInstance = this.injector.get(this.getConfig()!.SERVICE as any);

        // Reference / static lists for the detail context (different
        // set than the search screen's — `DETAILS_*` not `SEARCH_*`).
        const cfg = this.getConfig();
        if (cfg) {
            const hasDynamicRefs = (cfg.DETAILS_REFERENTIALS_KEYS?.length ?? 0) > 0;
            const hasStaticLists = (cfg.DETAILS_STATIC_LISTS?.length ?? 0) > 0;
            if (hasDynamicRefs) this.initializeReferenceKeys(cfg.DETAILS_REFERENTIALS_KEYS);
            if (hasStaticLists) this.initializeStaticLists(cfg.DETAILS_STATIC_LISTS);
            if (hasDynamicRefs || hasStaticLists) this.loadReferenceData(cfg.REF_DATA_OPTIONS);
        }

        // Wire route params → load (or reset to empty on /details).
        combineLatest([this.route.paramMap, this.route.queryParamMap])
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(([params, queryParams]) => {
                const id = params.get('id');
                const isDuplicate = queryParams.get('mode') === 'duplicate';

                this.entityId.set(id);
                this.duplicateMode.set(isDuplicate);
                this.context.duplicateMode = isDuplicate;
                this.editionState.set(!!id && !isDuplicate);

                if (id) {
                    this.loadData();
                } else {
                    // New mode — reset to a fresh empty entity.
                    this.entity.set(<TItem>{});
                    this.afterLoad();
                }
            });
    }

    /** Fetch the entity from the backend and populate `entity`. */
    loadData(): void {
        const id = this.entityId();
        if (!id) return;

        this.loading.set(true);
        this.errorMsg.set(null);

        this.serviceInstance.get(id).subscribe({
            next: (result: any) => {
                const vm = new ViewModelEntity(result) as unknown as TItem;
                (vm as any).id = id;
                this.entity.set(vm);
                this.loading.set(false);
                this.afterLoad();
            },
            error: (err: any) => {
                console.error('AbstractDetailScreenV2.loadData failed', err);
                this.errorMsg.set(err?.message ?? 'Erreur de chargement');
                this.loading.set(false);
            },
        });
    }

    /**
     * Persist the entity. Routes to `service.create()` when in new
     * or duplicate mode, `service.update(id, entity)` when editing.
     * Subclass `beforeSave()` can return `false` to cancel.
     */
    save(): void {
        const proceed = this.beforeSave();
        if (proceed === false) return;

        this.clearServerErrors();

        const isCreate = !this.editionState() || this.duplicateMode();
        const payload = this.duplicateMode()
            ? this.prepareEntityForDuplication()
            : this.entity();

        this.loading.set(true);
        const op = isCreate
            ? this.serviceInstance.create(payload)
            : this.serviceInstance.update(this.entityId(), payload);

        op.subscribe({
            next: (response: any) => {
                this.loading.set(false);
                if (response?.errors?.length) {
                    this.handleErrors(response.errors);
                    return;
                }
                this.toastService.showSuccess();
                this.afterSave(response);
            },
            error: (response: any) => {
                this.loading.set(false);
                if (response?.errors) {
                    this.setServerErrors(response.errors);
                    this.setFormErrors(response.errors);
                    this.onSaveError(response.errors);
                }
            },
        });
    }

    /**
     * Soft-delete-then-navigate-back. Confirms with the user first.
     */
    delete(): void {
        const id = this.entityId();
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
                            this.toastService.showSuccess();
                            this.navigateBack();
                        }
                    },
                }),
            () => undefined,
        );
    }

    /** Navigate to `/details?mode=duplicate` to clone the current entity. */
    duplicate(): void {
        this.router.navigate([this.detailsBaseUrl()], {
            queryParams: { mode: 'duplicate' },
        });
    }

    /** Navigate back to the list (strip `/details` and any id). */
    navigateBack(): void {
        const url = (this.router.url || '').split('?')[0];
        const idx = url.indexOf('/details');
        if (idx !== -1) {
            this.router.navigate([url.substring(0, idx)]);
        } else {
            this.location.back();
        }
    }

    /** Subclass print hook — no-op default. */
    print(): void {}

    /* ── Override hooks ─────────────────────────────────────────── */

    /**
     * Called right before `save()` dispatches to the backend. Return
     * `false` to cancel (e.g., form validation failed). Default: no-op.
     */
    protected beforeSave(): boolean | void {
        return true;
    }

    /** Override to post-process the loaded `entity` (or to refresh
     *  derived signals). Default: no-op. */
    protected afterLoad(): void {}

    /**
     * Default post-save behaviour:
     * - invalidate / refresh reference data per ScreenConfig
     * - after a CREATE (or duplicate-save), navigate to
     *   `/details/<new-id>` so the user lands in edit mode
     */
    protected afterSave(result: any): void {
        const cfg = this.getConfig();
        if (cfg?.INVALIDATE_KEYS_ON_SAVE) {
            this.invalidateReferences(cfg.INVALIDATE_KEYS_ON_SAVE);
            if (cfg.REFRESH_ON_SAVE) {
                this.refreshReferenceData(cfg.INVALIDATE_KEYS_ON_SAVE);
            }
        }

        const isCreate = !this.editionState() || this.duplicateMode();
        if (isCreate) {
            const newId = typeof result === 'object' ? (result?.id ?? result) : result;
            this.router.navigate([this.detailsBaseUrl(), newId]);
        }
    }

    /** Override to surface form-level validation errors after a 4xx
     *  response. Default: no-op (errors are already on `serverErrors`). */
    protected onSaveError(_errors: { [key: string]: string[] }): void {}

    /** Strip id (if present) from the entity before a duplicate save. */
    protected prepareEntityForDuplication(): any {
        const dup = { ...(this.entity() as any) };
        delete dup.id;
        delete dup.Id;
        return this.customizeDuplicatedEntity(dup);
    }

    /** Override to clear additional fields (codes, slugs, refs)
     *  before saving a duplicated entity. */
    protected customizeDuplicatedEntity(entity: any): any {
        return entity;
    }

    /* ── Internals ──────────────────────────────────────────────── */

    /** Resolve the bare `/<resource>/details` base URL — strips a
     *  trailing `:id`, query string, fragment, trailing slash. */
    private detailsBaseUrl(): string {
        let url = this.router.url || '';
        const q = url.indexOf('?');
        if (q >= 0) url = url.slice(0, q);
        const h = url.indexOf('#');
        if (h >= 0) url = url.slice(0, h);
        // If we're on /…/details/<id>, drop <id>; if on /…/details, leave it.
        const m = url.match(/^(.*?\/details)(?:\/[^/]+)?\/?$/);
        return m ? m[1] : url;
    }

    ngOnDestroy(): void {
        // The route subscription is auto-unsubscribed via takeUntilDestroyed.
        // Subclasses can override to release their own resources.
    }
}
