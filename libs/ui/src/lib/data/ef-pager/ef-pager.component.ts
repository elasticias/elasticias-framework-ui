import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { EfSelectComponent } from '../../forms/ef-select/ef-select.component';

interface PageBtn {
    kind: 'page' | 'ellipsis';
    value: number;
}

/**
 * Pagination control matching the Comptoir prototype's `.pager`
 * shape (lines-per-page selector · range · page buttons).
 *
 * ```html
 * <ef-pager
 *   [pageNumber]="criteria().pagination.pageNumber"
 *   [pageSize]="criteria().pagination.pageSize"
 *   [totalCount]="totalCount()"
 *   (pageChange)="setPage($event)"
 *   (pageSizeChange)="setPage(1, $event)"
 * />
 * ```
 *
 * Renders a windowed page list (first / current ±1 / last with
 * ellipsis) for total > 7 pages. Below 7 pages all buttons show.
 */
@Component({
    selector: 'ef-pager',
    standalone: true,
    imports: [CommonModule, TranslateModule, EfSelectComponent],
    templateUrl: './ef-pager.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfPagerComponent {
    readonly pageNumber = input<number>(1);
    readonly pageSize = input<number>(25);
    readonly totalCount = input<number>(0);
    readonly pageSizeOptions = input<ReadonlyArray<number>>([10, 25, 50, 100]);

    /** Translation keys (preferred — consumer-side i18n). */
    readonly linesPerPageLabelKey = input<string>('common_lines_per_page');
    readonly ofLabelKey = input<string>('common_of');
    readonly prevLabelKey = input<string>('common_page_previous');
    readonly nextLabelKey = input<string>('common_page_next');

    /** Hide the lines-per-page selector + range when only paging is wanted. */
    readonly hideSize = input<boolean>(false);

    readonly pageChange = output<number>();
    readonly pageSizeChange = output<number>();

    /** Falls back to the first configured option if the value ever goes empty. */
    private get defaultSize(): number {
        return this.pageSizeOptions()[0] ?? this.pageSize();
    }

    /** `pageSizeOptions` shaped for `ef-select`, which reads a label and a
     *  value off each option rather than taking bare primitives. */
    readonly sizeOptions = computed(() =>
        this.pageSizeOptions().map(n => ({ label: String(n), value: n })),
    );

    readonly totalPages = computed(() => {
        const size = this.pageSize();
        return size > 0 ? Math.max(1, Math.ceil(this.totalCount() / size)) : 1;
    });

    readonly range = computed(() => {
        const total = this.totalCount();
        if (total === 0) return { start: 0, end: 0 };
        const start = (this.pageNumber() - 1) * this.pageSize() + 1;
        const end = Math.min(this.pageNumber() * this.pageSize(), total);
        return { start, end };
    });

    /** First page · current ±1 · last page, with ellipsis fillers. */
    readonly pageButtons = computed<ReadonlyArray<PageBtn>>(() => {
        const total = this.totalPages();
        const current = this.pageNumber();
        const out: PageBtn[] = [];
        if (total <= 7) {
            for (let i = 1; i <= total; i++) out.push({ kind: 'page', value: i });
            return out;
        }
        out.push({ kind: 'page', value: 1 });
        if (current > 3) out.push({ kind: 'ellipsis', value: 0 });
        const start = Math.max(2, current - 1);
        const end = Math.min(total - 1, current + 1);
        for (let i = start; i <= end; i++) out.push({ kind: 'page', value: i });
        if (current < total - 2) out.push({ kind: 'ellipsis', value: 0 });
        out.push({ kind: 'page', value: total });
        return out;
    });

    goToPage(page: number): void {
        const total = this.totalPages();
        if (page < 1 || page > total || page === this.pageNumber()) return;
        this.pageChange.emit(page);
    }

    onSizeChange(value: number | string | null): void {
        const size = typeof value === 'number' ? value : parseInt(value ?? '', 10);

        if (Number.isNaN(size) || size <= 0) {
            // "No page size" has no meaning. The control is not clearable
            // (see the template), so this only guards a value arriving empty
            // from somewhere else: fall back to the first configured option.
            const fallback = this.defaultSize;
            if (fallback !== this.pageSize()) this.pageSizeChange.emit(fallback);
            return;
        }

        if (size !== this.pageSize()) this.pageSizeChange.emit(size);
    }

    trackBtn(index: number, btn: PageBtn): string {
        return btn.kind === 'page' ? `p${btn.value}` : `e${index}`;
    }
}
