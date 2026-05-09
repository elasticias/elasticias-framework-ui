import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { EfPagerComponent } from '../ef-pager/ef-pager.component';

/**
 * Comptoir data card — `.tbl-wrap` shell with header (count info +
 * actions) and integrated pager. Consumer projects their own
 * `<table class="tbl">` as default content.
 *
 * ```html
 * <ef-data-card
 *   [pageNumber]="criteria().pagination.pageNumber"
 *   [pageSize]="criteria().pagination.pageSize"
 *   [totalCount]="totalCount()"
 *   [loading]="loading()"
 *   [errorMsg]="errorMsg()"
 *   (pageChange)="setPage($event)"
 *   (pageSizeChange)="setPage(1, $event)"
 * >
 *   <span tbl-head-info>
 *     <strong>{{ totalCount() }}</strong> {{ 'sales_orders_count_match' | translate }}
 *   </span>
 *   <ng-container tbl-head-actions>
 *     <button class="btn btn-ghost btn-sm">{{ 'common_density' | translate }}</button>
 *   </ng-container>
 *
 *   <table class="tbl">…</table>
 * </ef-data-card>
 * ```
 *
 * `[hidePager]` hides the bottom row when the consumer doesn't want
 * pagination (e.g., tiny lookup tables). `[loading]` swaps the head
 * info to a loading message; `[errorMsg]` shows an error chip.
 */
@Component({
    selector: 'ef-data-card',
    standalone: true,
    imports: [CommonModule, TranslateModule, EfPagerComponent],
    template: `
        <div class="tbl-wrap">
            <div class="tbl-head">
                <div class="count small">
                    @if (loading()) {
                        <span>{{ loadingKey() | translate }}</span>
                    } @else if (errorMsg()) {
                        <span style="color: var(--st-cancelled-fg); font-weight: 600;">⚠ {{ errorMsg() }}</span>
                    } @else {
                        <ng-content select="[tbl-head-info]"></ng-content>
                    }
                </div>
                <div style="display: flex; gap: 6px; align-items: center;">
                    <ng-content select="[tbl-head-actions]"></ng-content>
                </div>
            </div>

            <ng-content></ng-content>

            @if (!hidePager()) {
                <ef-pager
                    [pageNumber]="pageNumber()"
                    [pageSize]="pageSize()"
                    [totalCount]="totalCount()"
                    [pageSizeOptions]="pageSizeOptions()"
                    (pageChange)="pageChange.emit($event)"
                    (pageSizeChange)="pageSizeChange.emit($event)"
                />
            }
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfDataCardComponent {
    readonly pageNumber = input<number>(1);
    readonly pageSize = input<number>(25);
    readonly totalCount = input<number>(0);
    readonly pageSizeOptions = input<ReadonlyArray<number>>([10, 25, 50, 100]);

    readonly loading = input<boolean>(false);
    /** Empty string = no error. */
    readonly errorMsg = input<string>('');
    readonly hidePager = input<boolean>(false);

    readonly loadingKey = input<string>('common_loading_msg');

    readonly pageChange = output<number>();
    readonly pageSizeChange = output<number>();
}
