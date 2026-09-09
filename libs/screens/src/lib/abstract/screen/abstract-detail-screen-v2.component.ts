import {
    Component,
    DestroyRef,
    Injector,
    OnDestroy, OnInit,
    computed,
    inject,
    signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Location } from '@angular/common';
import { combineLatest } from 'rxjs';
import { EfShortcutService } from '@elasticias/core';
import { AbstractScreenComponent } from './abstract-screen.component';
import { ScreenStateEnum } from '../../config/screen-state.enum';
import { EfDetailToolbarAction } from '../../entities/detail-toolbar-action.entity';
import { ViewModelEntity } from '../../entities/view-model.entity';
import { AUDIT_HISTORY_SERVICE } from '../../services/audit-history.service';

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
    implements OnInit
{
    protected readonly screenState = ScreenStateEnum.DETAIL;
    protected readonly injector = inject(Injector);
    protected readonly location = inject(Location);
    private readonly destroyRef = inject(DestroyRef);
    private readonly auditHistoryService = inject(AUDIT_HISTORY_SERVICE, { optional: true });
    private readonly shortcuts = inject(EfShortcutService);

    /** Distinguishes this instance's registration from any other detail
     *  screen alive at once (the outgoing and incoming routed component
     *  can briefly coexist), the same convention ef-row-actions uses:
     *  a shared static id would let one instance's disposer unregister
     *  a still-live sibling's entry. */
    private static nextInstanceId = 0;
    private readonly instanceId = AbstractDetailScreenV2.nextInstanceId++;

    protected serviceInstance: any;

    constructor() {
        super();
        // Every detail screen inherits mod+s with no per-screen wiring, and
        // it doubles as the fix for the browser's own Save Page dialog
        // otherwise popping up on top of it.
        this.shortcuts.register({
            id: `abstract-detail-screen-v2.${this.instanceId}.save`,
            keys: 'mod+s',
            labelKey: 'common_save',
            group: 'shortcut_group_screen',
            handler: () => this.save(),
        });
    }

    /**
     * Change-history entries for the loaded record, newest first. Populated
     * automatically when the config sets `AUDIT_ENTITY_TYPE` and an
     * `AUDIT_HISTORY_SERVICE` is provided. Bind it directly:
     * `<ef-change-history [entries]="auditEntries()" />`.
     */
    readonly auditEntries = signal<any[]>([]);

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

    /**
     * Reactive list of custom actions for `<ef-detail-toolbar>`'s
     * `[customActions]` input — recomputes whenever editionState /
     * duplicateMode flip. Default contents:
     * - Edit mode      → empty (the standard `print | duplicate |
     *                    delete | save` row covers it)
     * - Create mode    → `[Cancel]` — navigates back to the list
     * - Duplicate mode → `[Cancel]` — drops `?mode=duplicate` and
     *                    returns to edit view of the source entity
     *
     * Subclasses override `getCustomActions()` to add screen-specific
     * actions (Approve / Print PDF / Mark as paid / etc.). Call
     * `super.getCustomActions()` to keep the Cancel default.
     */
    readonly customActions = computed<ReadonlyArray<EfDetailToolbarAction>>(
        () => this.getCustomActions(),
    );

    /**
     * Builder for `customActions`. Override per screen to add or
     * replace the defaults. Pure function — reads other signals
     * freely, returns a fresh array each call.
     */
    protected getCustomActions(): EfDetailToolbarAction[] {
        // Edit mode: standard right-side group is enough; let subclass
        // append Preview / Print PDF / etc. by overriding this method.
        if (this.editionState()) return [];

        // Create / duplicate mode: a Cancel button. See cancel().
        return [
            {
                id: 'cancel',
                labelKey: 'common_cancel',
                icon: 'pi pi-times',
                severity: 'ghost',
                command: () => this.cancel(),
            },
        ];
    }

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
                    // New mode — reset to a fresh empty entity, no history yet.
                    this.entity.set(<TItem>{});
                    this.auditEntries.set([]);
                    this.afterLoad();
                }
            });
    }

    /**
     * Merge a partial patch into the `entity` signal — the canonical
     * way for form inputs to write back. Spread-immutably so OnPush
     * change detection picks it up.
     *
     * ```html
     * <ef-input-text
     *   variant="comptoir"
     *   [value]="title()"
     *   (valueChangeEvent)="patchEntity({ title: $event })"
     * />
     * ```
     */
    patchEntity(patch: Partial<TItem>): void {
        this.entity.update(current => ({ ...(current as object), ...patch }) as TItem);
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
                this.loadAuditHistory();
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
                    // The HTTP error interceptor surfaces the message (toast).
                    // Swallow here so a rejected delete (e.g. a 422 business-rule
                    // violation) doesn't bubble up as an unhandled error.
                    error: () => undefined,
                }),
            () => undefined,
        );
    }

    /** Navigate to `/details/:id?mode=duplicate` so the abstract can
     *  reload the source entity, treat it as a template, and persist
     *  via `service.create()` after the user hits Save.
     *  Without the id, the duplicate route would have nothing to
     *  fetch — `entity` would be empty and the clone-as-template
     *  flow would fall back to creating a blank record. */
    duplicate(): void {
        const id = this.entityId();
        const base = this.detailsBaseUrl();
        if (id == null) {
            // No source record (already on /details with no id) —
            // just open the create form.
            this.router.navigate([base]);
            return;
        }
        this.router.navigate([base, id], {
            queryParams: { mode: 'duplicate' },
        });
    }

    /**
     * Cancel handler for the default toolbar action:
     * - Duplicate mode → drop `?mode=duplicate` and return to
     *   `/details/:id`. The route subscription re-fires and reloads
     *   the source entity, discarding any in-memory edits.
     * - Create mode (no id) → navigate back to the list.
     *
     * Subclasses may override to add a confirm dialog when the form
     * is dirty.
     */
    cancel(): void {
        if (this.duplicateMode() && this.entityId() != null) {
            this.router.navigate([this.detailsBaseUrl(), this.entityId()]);
            return;
        }
        this.navigateBack();
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
    print(): void { /* no-op */ }

    /**
     * Load the standardized change-history into `auditEntries` when the config
     * opts in via `AUDIT_ENTITY_TYPE` and an `AUDIT_HISTORY_SERVICE` is provided.
     * Called automatically after a successful `loadData()`. Failures degrade to
     * an empty history rather than blocking the screen.
     */
    protected loadAuditHistory(): void {
        this.auditEntries.set([]);

        const entityType = this.getConfig()?.AUDIT_ENTITY_TYPE;
        const id = this.entityId();

        // No service provided, screen not opted in, or no id yet → empty box.
        if (!this.auditHistoryService || !entityType || !id) {
            return;
        }

        // Fully defensive: a missing/misconfigured audit client (no provider,
        // wrong shape, get() throwing, or an HTTP failure) must never break the
        // detail screen — it just leaves the history empty.
        try {
            const result$ = this.auditHistoryService.get(entityType, id);
            if (!result$ || typeof result$.subscribe !== 'function') {
                return;
            }
            result$.subscribe({
                next: (entries) => this.auditEntries.set(entries ?? []),
                error: () => this.auditEntries.set([]),
            });
        } catch {
            this.auditEntries.set([]);
        }
    }

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
    protected afterLoad(): void { /* no-op */ }

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
        } else {
            // Update succeeded in place — refresh the change-history so the new
            // entry shows without a manual reload.
            this.loadAuditHistory();
        }
    }

    /** Override to surface form-level validation errors after a 4xx
     *  response. Default: no-op (errors are already on `serverErrors`). */
    protected onSaveError(_errors: { [key: string]: string[] }): void { /* no-op */ }

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
    protected detailsBaseUrl(): string {
        let url = this.router.url || '';
        const q = url.indexOf('?');
        if (q >= 0) url = url.slice(0, q);
        const h = url.indexOf('#');
        if (h >= 0) url = url.slice(0, h);
        // If we're on /…/details/<id>, drop <id>; if on /…/details, leave it.
        const m = url.match(/^(.*?\/details)(?:\/[^/]+)?\/?$/);
        return m ? m[1] : url;
    }

    // AbstractComponent declares `abstract ngOnDestroy()`, so this must exist.
    // There is genuinely nothing to tear down here; removing it would push the
    // requirement onto every consumer component.
    // eslint-disable-next-line @angular-eslint/no-empty-lifecycle-method
    ngOnDestroy(): void {
        // The route subscription is auto-unsubscribed via takeUntilDestroyed.
        // Subclasses can override to release their own resources.
    }
}
