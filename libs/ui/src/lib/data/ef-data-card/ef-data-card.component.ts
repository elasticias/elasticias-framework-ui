import {
    AfterContentInit,
    ChangeDetectionStrategy,
    Component,
    ContentChildren,
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
    ScreenReferenceDataService,
} from '@elasticias/screens';
import { EfPagerComponent } from '../ef-pager/ef-pager.component';
import { EfStatusChipComponent } from '../../feedback/ef-status-chip/ef-status-chip.component';
import {
    EfColumnHeaderTemplateDirective,
    EfColumnTemplateDirective,
} from './ef-column-template.directive';
import {
    EfDataCardColumn,
    EfDataCardSort,
    EfDataCardSortDirection,
} from './ef-data-card.types';

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
    imports: [CommonModule, TranslateModule, EfPagerComponent, EfStatusChipComponent],
    templateUrl: './ef-data-card.component.html',
    styleUrl: './ef-data-card.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfDataCardComponent<TRow = any> implements AfterContentInit {
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

    /* ── Outputs ────────────────────────────────────────────────── */

    readonly pageChange = output<number>();
    readonly pageSizeChange = output<number>();
    readonly sortChange = output<EfDataCardSort>();
    readonly rowDoubleClick = output<TRow>();

    /* ── Content children ──────────────────────────────────────── */

    @ContentChildren(EfColumnTemplateDirective)
    private readonly bodyTemplates!: QueryList<EfColumnTemplateDirective>;

    @ContentChildren(EfColumnHeaderTemplateDirective)
    private readonly headerTemplates!: QueryList<EfColumnHeaderTemplateDirective>;

    private readonly bodyTemplateMap = signal<Map<string, TemplateRef<unknown>>>(new Map());
    private readonly headerTemplateMap = signal<Map<string, TemplateRef<unknown>>>(new Map());

    ngAfterContentInit(): void {
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

    /** Columns enriched with effective alignment / sortField defaults. */
    readonly effectiveColumns = computed<ReadonlyArray<EfDataCardColumn>>(() =>
        this.columns().map(col => ({
            ...col,
            type: col.type ?? 'text',
            align:
                col.align ??
                (col.type === 'number' || col.type === 'money' ? 'end' : 'start'),
            sortField: col.sortField ?? col.field ?? col.id,
        })),
    );

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
