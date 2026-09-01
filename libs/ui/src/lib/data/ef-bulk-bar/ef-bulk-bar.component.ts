import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Comptoir bulk-action bar — ink-active pill that shows a selection
 * count + projected action buttons. Auto-hides when count is 0.
 *
 * ```html
 * <ef-bulk-bar [count]="selectionCount()">
 *   <button class="btn">{{ 'common_export' | translate }}</button>
 *   <button class="btn">{{ 'sales_orders_bulk_approve' | translate }}</button>
 * </ef-bulk-bar>
 * ```
 */
@Component({
    selector: 'ef-bulk-bar',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    template: `
        @if (count() > 0) {
            <div class="bulk">
                <span>
                    <strong>{{ count() }}</strong>
                    <span class="count">
                        {{ (suffixKey() ? (suffixKey() | translate) : suffix()) }}
                    </span>
                </span>
                <ng-content></ng-content>
            </div>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfBulkBarComponent {
    readonly count = input<number>(0);
    /** Translation key for the suffix word ("selected"). */
    readonly suffixKey = input<string>('common_selected');
    /** Direct suffix text (used only when `suffixKey` is empty). */
    readonly suffix = input<string>('');
}
