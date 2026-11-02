import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    computed,
    effect,
    inject,
    input,
    output,
    signal,
    untracked,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { EMPTY, Observable, Subject, catchError, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EfViewportService } from '@elasticias/core';
import type { EfDataCardColumn } from '@elasticias/screens';
import { EfDialogAction, EfDialogComponent } from '../../layout/ef-dialog/ef-dialog.component';
import { EfSmartBarComponent } from '../../data/ef-smart-bar/ef-smart-bar.component';
import { EfDataCardComponent } from '../../data/ef-data-card/ef-data-card.component';
import { EfColumnTemplateDirective } from '../../data/ef-data-card/ef-column-template.directive';
import { EfEmptyStateComponent } from '../../feedback/ef-empty-state/ef-empty-state.component';
import { EfIdentityThumbComponent } from '../../data/ef-identity-thumb/ef-identity-thumb.component';
import { EfPage, EfProductPickerItem, EfProductPickerQuery } from './ef-product-picker.component.types';

/**
 * Multi-select product picker: a dialog that searches the caller's catalogue
 * page by page and hands back the ids the operator ticked. Data-agnostic: it
 * knows nothing of collections or promotions, only a search function.
 *
 * Built from `ef-dialog` + `ef-smart-bar` + `ef-data-card` (select column,
 * image column). The selection survives paging and new searches. The whole
 * row is the toggle, 48px tall. On a phone (`EfViewportService`, <= 767px)
 * the dialog is full screen and the table becomes a list whose row head is
 * the toggle.
 *
 * `[open]` is one-way. The picker closes itself on X, Escape, Cancel and
 * after a confirm, and emits `(closed)` each time: the parent must set
 * `open` back to false on `(closed)`, or the next open is a no-op. Each open
 * starts over: empty selection, empty search, page one.
 *
 * ```html
 * <ef-product-picker
 *   [open]="pickerOpen()"
 *   [search]="searchCandidates"
 *   titleKey="collections_products_picker_title"
 *   (confirm)="addProducts($event)"
 *   (closed)="pickerOpen.set(false)"
 * />
 * ```
 */
@Component({
    selector: 'ef-product-picker',
    standalone: true,
    imports: [
        TranslateModule,
        EfDialogComponent,
        EfSmartBarComponent,
        EfDataCardComponent,
        EfColumnTemplateDirective,
        EfEmptyStateComponent,
        EfIdentityThumbComponent,
    ],
    templateUrl: './ef-product-picker.component.html',
    styleUrl: './ef-product-picker.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfProductPickerComponent {
    private readonly viewport = inject(EfViewportService);
    private readonly destroyRef = inject(DestroyRef);

    /* ── Inputs ─────────────────────────────────────────────── */

    readonly open = input(false);
    /** Called for every page and search. Map the caller's DTO to items. */
    readonly search =
        input.required<(q: EfProductPickerQuery) => Observable<EfPage<EfProductPickerItem>>>();
    readonly titleKey = input<string>('');
    readonly confirmLabelKey = input<string>('common_add');
    readonly searchPlaceholderKey = input<string>('ef_product_picker_search_placeholder');
    readonly pageSize = input<number>(20);

    /* ── Outputs ────────────────────────────────────────────── */

    /** The ticked ids, in the order they were ticked. */
    readonly confirm = output<string[]>();
    readonly closed = output<void>();

    /** The list screen behind the dialog already owns the search shortcut. */
    readonly searchShortcut = null;

    /* ── State ──────────────────────────────────────────────── */

    protected readonly isMobile = this.viewport.isMobile;

    private readonly selected = signal<ReadonlySet<string>>(new Set());
    readonly selectedIds = computed(() => Array.from(this.selected()));
    protected readonly selectedCount = computed(() => this.selected().size);

    protected readonly searchText = signal('');
    protected readonly appliedText = signal('');
    protected readonly pageNumber = signal(1);
    protected readonly rows = signal<ReadonlyArray<EfProductPickerItem>>([]);
    protected readonly totalCount = signal(0);
    protected readonly loading = signal(false);
    protected readonly errorMsg = signal('');

    private readonly queries = new Subject<EfProductPickerQuery>();
    private lastQuery: EfProductPickerQuery | null = null;

    protected readonly pageSizeOptions = computed(() => [this.pageSize()]);

    protected readonly dialogSize = computed(() => (this.isMobile() ? 'full' : 'lg'));
    protected readonly dialogClass = computed(() =>
        this.isMobile()
            ? 'ef-product-picker-dialog ef-product-picker-dialog--fullscreen'
            : 'ef-product-picker-dialog',
    );

    /** Desktop: a table. Phone: one composed cell, so the list row carries
     *  the tick, the thumb, the reference and the title without an expander. */
    protected readonly columns = computed<EfDataCardColumn[]>(() =>
        this.isMobile()
            ? [{ id: 'item', type: 'custom', mobile: 'primary', hideable: false }]
            : [
                  { id: 'select', width: '48px', hideable: false },
                  { id: 'image', type: 'custom', width: '56px', hideable: false, exportable: false },
                  {
                      id: 'reference',
                      field: 'reference',
                      type: 'mono',
                      width: '104px',
                      headerKey: 'ef_product_picker_col_reference',
                  },
                  { id: 'title', field: 'title', cellClass: 'strong', headerKey: 'ef_product_picker_col_title' },
                  { id: 'meta', field: 'meta', headerKey: 'ef_product_picker_col_meta' },
              ],
    );

    protected readonly actions = computed<EfDialogAction[]>(() => [
        { labelKey: 'common_cancel', severity: 'ghost' },
        {
            labelKey: this.confirmLabelKey(),
            severity: 'primary',
            disabled: this.selectedCount() === 0,
            command: () => this.confirm.emit(this.selectedIds()),
        },
    ]);

    constructor() {
        this.queries
            .pipe(
                tap(() => {
                    this.loading.set(true);
                    this.errorMsg.set('');
                }),
                // A slow page one must not land over the page two asked after it.
                switchMap(q =>
                    this.search()(q).pipe(
                        catchError((err: unknown) => {
                            this.loading.set(false);
                            this.errorMsg.set((err as { message?: string })?.message || 'error');
                            return EMPTY;
                        }),
                    ),
                ),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(page => {
                this.rows.set(page?.items ?? []);
                this.totalCount.set(page?.totalCount ?? 0);
                this.loading.set(false);
            });

        effect(() => {
            if (this.open()) untracked(() => this.startOver());
        });
    }

    /* ── Handlers ───────────────────────────────────────────── */

    onSearch(text: string): void {
        const value = typeof text === 'string' ? text.trim() : '';
        this.searchText.set(value);
        this.appliedText.set(value);
        this.pageNumber.set(1);
        this.run();
    }

    onClear(): void {
        this.onSearch('');
    }

    onPageChange(page: number): void {
        this.pageNumber.set(page);
        this.run();
    }

    retry(): void {
        if (this.lastQuery) this.queries.next(this.lastQuery);
    }

    isSelected(id: string): boolean {
        return this.selected().has(id);
    }

    toggle(item: EfProductPickerItem | null | undefined): void {
        if (!item || item.disabled) return;
        const next = new Set(this.selected());
        if (!next.delete(item.id)) next.add(item.id);
        this.selected.set(next);
    }

    onVisibleChange(visible: boolean): void {
        if (!visible) this.closed.emit();
    }

    private startOver(): void {
        this.selected.set(new Set());
        this.searchText.set('');
        this.appliedText.set('');
        this.pageNumber.set(1);
        this.rows.set([]);
        this.totalCount.set(0);
        this.run();
    }

    private run(): void {
        this.lastQuery = {
            text: this.appliedText(),
            pageNumber: this.pageNumber(),
            pageSize: this.pageSize(),
        };
        this.queries.next(this.lastQuery);
    }
}
