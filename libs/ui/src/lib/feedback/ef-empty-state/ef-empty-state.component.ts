import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Comptoir empty-state — circular dashed icon + title + optional
 * message + projected actions slot. Drop into a data-card body when
 * results are zero.
 *
 * ```html
 * <ef-empty-state
 *   icon="pi pi-inbox"
 *   titleKey="sales_orders_empty_title"
 *   messageKey="sales_orders_empty_msg">
 *   <button class="btn btn-tenant btn-sm">{{ 'sales_orders_new' | translate }}</button>
 * </ef-empty-state>
 * ```
 */
@Component({
    selector: 'ef-empty-state',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    template: `
        <div class="empty">
            <span class="ic" aria-hidden="true">
                <i [class]="icon()"></i>
            </span>

            @if (titleKey() || title()) {
                <span class="title">
                    {{ (titleKey() ? (titleKey() | translate) : title()) }}
                </span>
            }

            @if (messageKey() || message()) {
                <span class="small">
                    {{ (messageKey() ? (messageKey() | translate) : message()) }}
                </span>
            }

            <div class="actions" style="display: inline-flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-top: 4px;">
                <ng-content></ng-content>
            </div>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfEmptyStateComponent {
    readonly icon = input<string>('pi pi-inbox');
    readonly titleKey = input<string>('');
    readonly title = input<string>('');
    readonly messageKey = input<string>('');
    readonly message = input<string>('');
}
