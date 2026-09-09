import {
    AfterContentInit,
    ChangeDetectionStrategy,
    Component,
    ContentChildren,
    HostListener,
    QueryList,
    TemplateRef,
    booleanAttribute,
    computed,
    inject,
    input,
    output,
    signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import {
    SCREEN_REF_DATA_SERVICE,
    ScreenContext,
    ScreenReferenceDataService,
} from '@elasticias/screens';
import { Permissions } from '@elasticias/types';
import { StorageUtils } from '@elasticias/utils';
import { EfViewportService, formatShortcut } from '@elasticias/core';
import {
    EF_DATA_CARD_MOBILE_LAYOUT,
    EfDataCardMobileLayout,
} from './ef-data-card.mobile';
import { EfPagerComponent } from '../ef-pager/ef-pager.component';
import { EfStatusChipComponent } from '../../feedback/ef-status-chip/ef-status-chip.component';
import { EfRowActionsComponent } from '../ef-row-actions/ef-row-actions.component';
import { EfRowAction } from '../ef-row-actions/ef-row-actions.types';
import {
    EfColumnHeaderTemplateDirective,
    EfColumnTemplateDirective,
} from './ef-column-template.directive';
import {
    EfDataCardColumn,
    EfDataCardSort,
    EfDataCardSortDirection,
} from './ef-data-card.types';

/** Action identifier emitted by `ef-data-card`'s auto row-actions cell. */
export type EfDataCardRowAction = 'view' | 'edit' | 'duplicate' | 'delete';

/** Row height presets offered by the Density control. */
export type EfTableDensity = 'compact' | 'default' | 'comfortable';

/**
 * Comptoir data card — column-driven `.tbl-wrap` with header (count
 * info + actions) and integrated pager.
 *
 * Two consumer surfaces:
 * 1. **Columns + rows + templates** (preferred): declare columns in
 *    TS as `EfDataCardColumn[]`, project body / header templates via
 *    `*efColumnTemplate` / `*efColumnHeaderTemplate` for cells that
 *    need rich HTML. Built-in cell renderers handle text / number /
 *    money / date / datetime / boolean / mono / chip / reference.
 * 2. **`tbl-head-info` / `tbl-head-actions` slots**: still projected
 *    so the consumer can render the count text + density / columns /
 *    view-toggle buttons next to the table header.
 *
 * ```html
 * <ef-data-card
 *   [columns]="cols"
 *   [rows]="orders()"
 *   [pageNumber]="criteria().pagination.pageNumber"
 *   [pageSize]="criteria().pagination.pageSize"
 *   [totalCount]="totalCount()"
 *   [loading]="loading()"
 *   [sort]="currentSort()"
 *   (pageChange)="setPage($event)"
 *   (sortChange)="setSort($event.field, $event.direction)"
 *   trackByField="id"
 * >
 *   <span tbl-head-info>…count…</span>
 *
 *   <ng-template efColumnTemplate="status" let-row>
 *     <span class="chip" [class]="'chip chip-' + row.status">…</span>
 *   </ng-template>
 * </ef-data-card>
 * ```
 */
@Component({
    selector: 'ef-data-card',
    standalone: true,
    imports: [
        CommonModule,
        TranslateModule,
        EfPagerComponent,
        EfStatusChipComponent,
        EfRowActionsComponent,
    ],
    templateUrl: './ef-data-card.component.html',
    styleUrl: './ef-data-card.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfDataCardComponent<TRow = any> implements AfterContentInit {
    /* ── Mobile presentation ─────────────────────────────────────
         Under 768px a table stops being readable: six columns on a
         390px screen either overflow or squeeze to nothing. The rows
         become a list instead, driven by the same column config —
         each column declares (or is given) a role. */

    private readonly viewport = inject(EfViewportService);
    private readonly configuredMobileLayout = inject(EF_DATA_CARD_MOBILE_LAYOUT, { optional: true });

    readonly isMobile = this.viewport.isMobile;

    /** Per-screen override of the app-wide default. */
    readonly mobileLayout = input<EfDataCardMobileLayout | null>(null);

    protected readonly effectiveMobileLayout = computed<EfDataCardMobileLayout>(
        () => this.mobileLayout() ?? this.configuredMobileLayout ?? 'row',
    );

    /** Rows currently showing their detail, keyed the same way as trackByRow. */
    private readonly expandedRows = signal<ReadonlySet<unknown>>(new Set());

    protected isExpanded(row: unknown, index: number): boolean {
        return this.expandedRows().has(this.rowKey(row, index));
    }

    /**
     * The row head is the expander, but the actions menu lives inside it.
     * Filtering here rather than stopping propagation on a wrapper keeps the
     * wrapper a plain span — a click handler on one would need a keyboard
     * equivalent and a tabindex to be usable, which a decorative box should
     * not have.
     */
    protected onRowHeadActivate(row: unknown, index: number, event: Event): void {
        if (!this.hasDetail()) return;
        const target = event.target as HTMLElement | null;
        if (target?.closest('.mrow__actions')) return;
        this.toggleExpanded(row, index);
    }

    protected toggleExpanded(row: unknown, index: number): void {
        const key = this.rowKey(row, index);
        const next = new Set(this.expandedRows());
        if (!next.delete(key)) next.add(key);
        this.expandedRows.set(next);
    }

    private rowKey(row: unknown, index: number): unknown {
        const id = (row as Record<string, unknown> | null)?.['id'];
        return id ?? index;
    }

    /**
     * Columns that carry data on mobile, in role order. Structural columns
     * (select, actions) are handled by the row chrome, not as fields.
     */
    private readonly mobileColumns = computed(() =>
        this.effectiveColumns().filter(c => c.id !== 'select' && c.id !== 'actions'),
    );

    /**
     * The role a column plays on mobile. An explicit `mobile` wins; otherwise
     * it is derived so every existing screen gets a sensible list without
     * touching its column definitions: the first text-ish column is what you
     * scan for, a status chip is a badge, money and dates sit on the muted
     * line, and the rest waits behind the expander.
     */
    protected roleOf(col: { id: string; mobile?: string; type?: string }): string {
        if (col.mobile) return col.mobile;
        if (col.type === 'status' || col.type === 'chip') return 'status';
        if (col.id === this.derivedPrimaryId()) return 'primary';
        if (col.type === 'money' || col.type === 'date' || col.type === 'datetime') return 'secondary';
        return 'detail';
    }

    private readonly derivedPrimaryId = computed(() => {
        const cols = this.mobileColumns();
        // Screens already mark the row's identity column `cellClass: 'strong'`
        // so it reads as the row's title in the table — that is a better
        // signal than position. Products, for one, leads with an external
        // reference that is usually blank; its title is second.
        const strong = cols.find(c => (c.cellClass ?? '').split(/\s+/).includes('strong'));
        if (strong) return strong.id;
        const textish = cols.find(c => !c.type || c.type === 'text' || c.type === 'mono');
        return (textish ?? cols[0])?.id ?? '';
    });

    protected readonly primaryColumn = computed(() =>
        this.mobileColumns().find(c => this.roleOf(c) === 'primary'),
    );

    protected readonly statusColumn = computed(() =>
        this.mobileColumns().find(c => this.roleOf(c) === 'status'),
    );

    protected readonly secondaryColumns = computed(() =>
        this.mobileColumns().filter(c => this.roleOf(c) === 'secondary'),
    );

    /**
     * Fields shown once a row opens. The primary column is excluded: the
     * header already carries it, and repeating it is the first thing you
     * notice. Status is excluded for the same reason.
     */
    protected readonly detailColumns = computed(() =>
        this.mobileColumns().filter(c => {
            const role = this.roleOf(c);
            return role === 'detail' || role === 'secondary';
        }),
    );

    /** How many fields a card shows before "view more". */
    private static readonly CARD_PREVIEW_FIELDS = 4;

    /** Fields a collapsed card shows. A row shows none until it opens. */
    protected readonly cardPreviewColumns = computed(() =>
        this.detailColumns().slice(0, EfDataCardComponent.CARD_PREVIEW_FIELDS),
    );

    protected readonly hasDetail = computed(() => this.detailColumns().length > 0);

    /** Only worth a toggle when opening actually reveals something. */
    protected readonly hasMoreThanPreview = computed(
        () => this.detailColumns().length > EfDataCardComponent.CARD_PREVIEW_FIELDS,
    );

    /** Fields visible for a row right now, given layout and open state. */
    protected visibleDetail(row: unknown, index: number): ReadonlyArray<{ id: string }> {
        const open = this.isExpanded(row, index);
        if (this.effectiveMobileLayout() === 'card') {
            return open ? this.detailColumns() : this.cardPreviewColumns();
        }
        return open ? this.detailColumns() : [];
    }

    private readonly refDataService = inject<ScreenReferenceDataService | null>(
        SCREEN_REF_DATA_SERVICE,
        { optional: true },
    );

    /* ── Data inputs ────────────────────────────────────────────── */

    readonly columns = input<ReadonlyArray<EfDataCardColumn>>([]);
    readonly rows = input<ReadonlyArray<TRow>>([]);

    /** Field path on each row used as the trackBy key. */
    readonly trackByField = input<string>('id');

    /* ── Pagination ─────────────────────────────────────────────── */

    readonly pageNumber = input<number>(1);
    readonly pageSize = input<number>(25);
    readonly totalCount = input<number>(0);
    readonly pageSizeOptions = input<ReadonlyArray<number>>([10, 25, 50, 100]);
    readonly hidePager = input(false, { transform: booleanAttribute });

    /* ── Sorting ────────────────────────────────────────────────── */

    /** Currently active sort. Header click toggles asc / desc. */
    readonly sort = input<EfDataCardSort | undefined>(undefined);

    /* ── State ──────────────────────────────────────────────────── */

    readonly loading = input(false, { transform: booleanAttribute });
    /** Empty string = no error. Non-empty triggers an error chip in tbl-head. */
    readonly errorMsg = input<string>('');
    readonly loadingKey = input<string>('common_loading_msg');

    /* ── Row interactions ──────────────────────────────────────── */

    /**
     * When `true`, double-clicking anywhere on a `<tr>` emits the row
     * via `rowDoubleClick` and the body rows render with
     * `cursor: pointer`. Consumers typically wire the output to
     * `navigateToDetails(row.id)` from {@link AbstractSearchScreenV2}.
     *
     * Double-clicks that originate inside an interactive child
     * (checkbox, button, link, form control) are ignored — those keep
     * their native behaviour (toggle selection, run an action, …).
     */
    readonly rowDoubleClickable = input(false, { transform: booleanAttribute });

    /* ── Auto row-actions cell ─────────────────────────────────────
       When `[hasActionsColumn]` is set, ef-data-card appends a 48px
       `actions` column at the right edge with a built-in
       `<ef-row-actions>` per row. The standard four CRUD actions are
       wired via the show* flags; emitted commands flip back through
       `(rowAction)`. Permission filtering happens through the bound
       `[rowActionsContext]` (a ScreenContext).

       Consumers that want a custom actions cell can keep declaring
       their own `'actions'` column + projected template — the
       built-in cell only auto-appears when this flag is on AND no
       column with id 'actions' is already declared. */

    readonly hasActionsColumn = input(false, { transform: booleanAttribute });
    readonly rowActionsContext = input<ScreenContext | undefined>(undefined);

    readonly showViewAction = input(true, { transform: booleanAttribute });
    readonly showEditAction = input(true, { transform: booleanAttribute });
    readonly showDuplicateAction = input(true, { transform: booleanAttribute });
    readonly showDeleteAction = input(true, { transform: booleanAttribute });

    /* ── Table tools (density / column picker) ──────────────────── */

    /** Render the Density control in the head row. */
    readonly showDensityControl = input(false, { transform: booleanAttribute });

    /** Render the Columns picker in the head row. */
    readonly showColumnPicker = input(false, { transform: booleanAttribute });

    /**
     * Stable key used to remember density and hidden columns for this
     * table. Preferences are a per-viewer convenience, so they live in
     * localStorage and are read defensively -- a private window or
     * cleared site data simply falls back to the defaults.
     */
    readonly tableKey = input<string>('');

    /* ── Outputs ────────────────────────────────────────────────── */

    readonly pageChange = output<number>();
    readonly pageSizeChange = output<number>();
    readonly sortChange = output<EfDataCardSort>();
    readonly rowDoubleClick = output<TRow>();

    /** Emitted by the auto row-actions cell — `{ action, row }`. */
    readonly rowAction = output<{ action: EfDataCardRowAction; row: TRow }>();

    /* ── Content children ──────────────────────────────────────── */

    @ContentChildren(EfColumnTemplateDirective)
    private readonly bodyTemplates!: QueryList<EfColumnTemplateDirective>;

    @ContentChildren(EfColumnHeaderTemplateDirective)
    private readonly headerTemplates!: QueryList<EfColumnHeaderTemplateDirective>;

    private readonly bodyTemplateMap = signal<Map<string, TemplateRef<unknown>>>(new Map());
    private readonly headerTemplateMap = signal<Map<string, TemplateRef<unknown>>>(new Map());

    ngAfterContentInit(): void {
        this.loadPreferences();
        this.bodyTemplateMap.set(toMap(this.bodyTemplates));
        this.headerTemplateMap.set(toMap(this.headerTemplates));
        this.bodyTemplates.changes.subscribe(() =>
            this.bodyTemplateMap.set(toMap(this.bodyTemplates)),
        );
        this.headerTemplates.changes.subscribe(() =>
            this.headerTemplateMap.set(toMap(this.headerTemplates)),
        );
    }

    /* ── Computed views ─────────────────────────────────────────── */

    /** Columns enriched with effective alignment / sortField defaults
     *  + the auto `'actions'` column when `[hasActionsColumn]` is on
     *  and the consumer hasn't declared one already. */
    readonly effectiveColumns = computed<ReadonlyArray<EfDataCardColumn>>(() => {
        const hidden = this.hiddenColumnIds();
        const declared = this.columns()
            .filter(col => !hidden.includes(col.id))
            .map(col => ({
                ...col,
                type: col.type ?? 'text',
                align:
                    col.align ??
                    (col.type === 'number' || col.type === 'money' ? 'end' : 'start'),
                sortField: col.sortField ?? col.field ?? col.id,
            }));

        if (!this.hasActionsColumn()) return declared;
        if (declared.some(c => c.id === 'actions')) return declared;
        return [...declared, { id: 'actions', width: '48px' } as EfDataCardColumn];
    });

    /** Items array for the auto row-actions cell. Rebuilt per call so
     *  the ef-row-actions component receives a fresh closure per row.
     *  Visibility is filtered later by ef-row-actions against
     *  `rowActionsContext` (ScreenContext.isGranted).
     *
     *  `kbd` is rendered through `formatShortcut()`, not a literal glyph:
     *  `ef-row-actions` binds these same keys for real while the row's
     *  menu is open, and a hardcoded `'⌘D'` would lie to a Windows user. */
    defaultRowActions(row: TRow): ReadonlyArray<EfRowAction> {
        const items: EfRowAction[] = [];

        if (this.showViewAction()) {
            items.push({
                id: 'view',
                labelKey: 'common_view',
                icon: 'pi pi-eye',
                kbd: formatShortcut('enter'),
                permission: Permissions.Read,
                command: () => this.rowAction.emit({ action: 'view', row }),
            });
        }
        if (this.showEditAction()) {
            items.push({
                id: 'edit',
                labelKey: 'common_edit',
                icon: 'pi pi-pencil',
                kbd: formatShortcut('e'),
                permission: Permissions.Edit,
                command: () => this.rowAction.emit({ action: 'edit', row }),
            });
        }
        if (this.showDuplicateAction()) {
            items.push({
                id: 'duplicate',
                labelKey: 'common_duplicate',
                icon: 'pi pi-copy',
                kbd: formatShortcut('mod+d'),
                permission: Permissions.Duplicate,
                command: () => this.rowAction.emit({ action: 'duplicate', row }),
            });
        }
        if (this.showDeleteAction()) {
            if (items.length > 0) items.push({ separator: true });
            items.push({
                id: 'delete',
                labelKey: 'common_delete',
                icon: 'pi pi-trash',
                kbd: '⌫',
                severity: 'danger',
                permission: Permissions.Delete,
                command: () => this.rowAction.emit({ action: 'delete', row }),
            });
        }

        return items;
    }

    /* ── Cell helpers (used in template) ───────────────────────── */

    bodyTemplate(columnId: string): TemplateRef<unknown> | undefined {
        return this.bodyTemplateMap().get(columnId);
    }

    headerTemplate(columnId: string): TemplateRef<unknown> | undefined {
        return this.headerTemplateMap().get(columnId);
    }

    /** Pluck `column.field` (or `column.id`) from a row, dotted-path safe. */
    cellValue(row: TRow, col: EfDataCardColumn): unknown {
        const path = col.field ?? col.id;
        if (!path) return undefined;
        return path.split('.').reduce<any>((obj, key) => (obj == null ? obj : obj[key]), row);
    }

    headerAlignClass(col: EfDataCardColumn): string {
        if (col.align === 'end') return 'num';
        return '';
    }

    cellAlignClass(col: EfDataCardColumn): string {
        const align = col.align ?? (col.type === 'number' || col.type === 'money' ? 'end' : 'start');
        const classes: string[] = [];
        if (align === 'end') classes.push('num');
        if (col.cellClass) classes.push(col.cellClass);
        return classes.join(' ');
    }

    /** Sort indicator: '↑' / '↓' / '' for the given column. */
    sortIndicator(col: EfDataCardColumn): string {
        const s = this.sort();
        if (!s) return '';
        const field = col.sortField ?? col.field ?? col.id;
        if (s.field !== field) return '';
        return s.direction === 'asc' ? '↑' : '↓';
    }

    /**
     * Resolve a reference cell — looks up the row's value in
     * `referenceKey`, finds the entry where
     * `entry[referenceValueField] === value`, returns
     * `entry[referenceLabelField]`. Falls back to the raw value when
     * no match is found.
     */
    resolveReference(value: unknown, col: EfDataCardColumn): string {
        if (value == null) return '';
        if (!this.refDataService || !col.referenceKey) return String(value);

        const list = this.refDataService.getReference(col.referenceKey)();
        const valueField = col.referenceValueField || 'code';
        const labelField = col.referenceLabelField || 'label';
        const match = list.find((item: any) => item?.[valueField] === value);
        if (!match) return String(value);
        return String(match[labelField] ?? value);
    }

    /** Build an Angular DigitInfo string from min/max fraction-digit hints. */
    numberFormat(col: EfDataCardColumn): string {
        const min = col.minFractionDigits ?? 2;
        const max = col.maxFractionDigits ?? 2;
        return `1.${min}-${max}`;
    }

    /* ── Table tools state ──────────────────────────────────────── */

    /** Which tools panel is open, if any. */
    readonly openTool = signal<'density' | 'columns' | null>(null);

    /** Row density. Applied as a class on `.tbl-wrap`. */
    readonly density = signal<EfTableDensity>('default');

    /** Column ids the viewer has hidden. */
    readonly hiddenColumnIds = signal<ReadonlyArray<string>>([]);

    readonly densityOptions: ReadonlyArray<{
        value: EfTableDensity;
        labelKey: string;
        icon: string;
    }> = [
        { value: 'compact', labelKey: 'common_density_compact', icon: 'pi-align-justify' },
        { value: 'default', labelKey: 'common_density_default', icon: 'pi-bars' },
        { value: 'comfortable', labelKey: 'common_density_comfortable', icon: 'pi-list' },
    ];

    /** Columns the viewer may hide -- structural ones stay put, since
     *  hiding the selection checkbox or the row-actions cell would strand
     *  the bulk bar and the per-row menu with no way back. */
    readonly hideableColumns = computed(() =>
        // Derived from the DECLARED columns, not `effectiveColumns` --
        // that one already drops hidden columns, so a hidden column would
        // vanish from its own picker and could never be restored.
        this.columns().filter(
            c => c.id !== 'select' && c.id !== 'actions' && c.hideable !== false,
        ),
    );

    toggleTool(tool: 'density' | 'columns'): void {
        this.openTool.update(cur => (cur === tool ? null : tool));
    }

    setDensity(value: EfTableDensity): void {
        this.density.set(value);
        this.openTool.set(null);
        this.savePreferences();
    }

    isColumnHidden(id: string): boolean {
        return this.hiddenColumnIds().includes(id);
    }

    toggleColumn(id: string): void {
        this.hiddenColumnIds.update(ids =>
            ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id],
        );
        this.savePreferences();
    }

    resetColumns(): void {
        this.hiddenColumnIds.set([]);
        this.savePreferences();
    }

    /** Close an open panel on an outside click or Escape. */
    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        if (!this.openTool()) return;
        const target = event.target as HTMLElement | null;
        if (target?.closest('.tbl-tools')) return;
        this.openTool.set(null);
    }

    @HostListener('document:keydown.escape')
    onEscape(): void {
        this.openTool.set(null);
    }

    private storageKey(): string | null {
        const key = this.tableKey();
        return key ? `TABLE_PREFS_${key}` : null;
    }

    private loadPreferences(): void {
        const key = this.storageKey();
        if (!key) return;
        try {
            const saved = StorageUtils.getLocal<{
                density?: EfTableDensity;
                hiddenColumnIds?: string[];
            }>(key);
            if (!saved) return;
            if (saved.density) this.density.set(saved.density);
            if (Array.isArray(saved.hiddenColumnIds))
                this.hiddenColumnIds.set(saved.hiddenColumnIds);
        } catch {
            // Storage can throw outright (blocked site data, previews) --
            // the defaults are a perfectly good table.
        }
    }

    private savePreferences(): void {
        const key = this.storageKey();
        if (!key) return;
        try {
            StorageUtils.setLocal(key, {
                density: this.density(),
                hiddenColumnIds: this.hiddenColumnIds(),
            });
        } catch {
            // Preferences are a convenience; losing them must never break
            // the table.
        }
    }

    /** Tracks how many `ef-row-actions` are currently open inside this
     *  card. When > 0, `.tbl-wrap` lifts its `overflow: hidden` so the
     *  popup can escape its rounded edges. */
    readonly openMenuCount = signal(0);

    @HostListener('ef-row-actions-toggle', ['$event'])
    onRowActionsToggle(event: Event): void {
        const detail = (event as CustomEvent<{ open: boolean }>).detail;
        this.openMenuCount.update(c => Math.max(0, c + (detail?.open ? 1 : -1)));
    }

    /** Fires `rowDoubleClick` unless the dblclick originated on an
     *  interactive child (checkbox, button, link, form control). */
    onRowDoubleClick(row: TRow, event: MouseEvent): void {
        if (!this.rowDoubleClickable()) return;
        const target = event.target as HTMLElement | null;
        if (target?.closest('button, a, input, select, textarea, label')) return;
        this.rowDoubleClick.emit(row);
    }

    onHeaderClick(col: EfDataCardColumn): void {
        if (!col.sortable) return;
        const field = col.sortField ?? col.field ?? col.id;
        const current = this.sort();
        const direction: EfDataCardSortDirection =
            current?.field === field && current.direction === 'desc' ? 'asc' : 'desc';
        this.sortChange.emit({ field, direction });
    }

    trackByRow = (_: number, row: TRow): unknown => {
        const f = this.trackByField();
        return f ? (row as any)?.[f] : row;
    };

    trackByColumn = (_: number, col: EfDataCardColumn): string => col.id;
}

function toMap<T extends { columnId: string; templateRef: TemplateRef<unknown> }>(
    list: QueryList<T>,
): Map<string, TemplateRef<unknown>> {
    const m = new Map<string, TemplateRef<unknown>>();
    list.forEach(d => m.set(d.columnId, d.templateRef));
    return m;
}
