import {
    ChangeDetectionStrategy,
    Component,
    booleanAttribute,
    input,
    output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Comptoir advanced-filter drawer — collapsible card that lives at
 * the bottom of the smart-bar. Consumer projects their grid of
 * `<div class="field">` controls; the component handles the open
 * animation, the footer Reset / Apply buttons, and the optional hint
 * line on the left of the footer.
 *
 * ```html
 * <ef-filter-drawer
 *   [open]="drawerOpen()"
 *   hintKey="sales_orders_adv_hint"
 *   (apply)="runSearch()"
 *   (reset)="clearAll()"
 * >
 *   <div class="field">
 *     <label for="adv-employee">{{ 'sales_orders_adv_employee' | translate }}</label>
 *     <select id="adv-employee">…</select>
 *   </div>
 *   …
 * </ef-filter-drawer>
 * ```
 */
@Component({
    selector: 'ef-filter-drawer',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    template: `
        <div class="f-drawer" [class.open]="open()" [attr.aria-hidden]="!open()">
            <div class="grid">
                <ng-content></ng-content>
            </div>
            <div class="foot">
                <span class="left">
                    @if (hintKey()) {
                        {{ hintKey() | translate }}
                    } @else {
                        {{ hint() }}
                    }
                </span>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-ghost btn-sm" type="button" (click)="reset.emit()">
                        {{ resetLabelKey() | translate }}
                    </button>
                    @if (!hideApply()) {
                        <button class="btn btn-primary btn-sm" type="button" (click)="apply.emit()">
                            {{ applyLabelKey() | translate }}
                        </button>
                    }
                </div>
            </div>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfFilterDrawerComponent {
    readonly open = input(false, { transform: booleanAttribute });
    readonly hintKey = input<string>('');
    readonly hint = input<string>('');
    readonly resetLabelKey = input<string>('common_reset');
    readonly applyLabelKey = input<string>('common_apply');
    readonly hideApply = input(false, { transform: booleanAttribute });

    readonly apply = output<void>();
    readonly reset = output<void>();
}
