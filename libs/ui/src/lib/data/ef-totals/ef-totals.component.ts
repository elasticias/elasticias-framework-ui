import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { EfTotalsGrand, EfTotalsRow } from './ef-totals.types';

/**
 * Sidebar totals stack — key-value rows with optional display-size
 * grand-row (Bricolage Grotesque, ~28px). Lives inside an `<ef-card>`
 * on order / invoice / quote detail screens.
 *
 * ```html
 * <ef-card titleKey="orders_totals">
 *   <ef-totals
 *     [rows]="[
 *       { labelKey: 'totals_subtotal', value: '12 350,00', unit: 'MAD' },
 *       { labelKey: 'totals_discount', value: '-450,00', unit: 'MAD', tone: 'discount' },
 *       { labelKey: 'totals_tax',      value: '2 372,40', unit: 'MAD' },
 *     ]"
 *     [grand]="{ labelKey: 'totals_grand', value: '14 272,40', currency: 'MAD' }"
 *   />
 * </ef-card>
 * ```
 */
@Component({
    selector: 'ef-totals',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    template: `
        @for (row of rows(); track row.labelKey || row.label) {
            <div class="row" [class.discount]="row.tone === 'discount'">
                <span class="lbl">
                    {{ row.labelKey ? (row.labelKey | translate) : row.label }}
                </span>
                <span class="v">
                    {{ row.value }}@if (row.unit) {<span class="currency"> {{ row.unit }}</span>}
                </span>
            </div>
        }

        @if (grand(); as g) {
            <hr />
            <div class="row grand-row">
                <span class="lbl">
                    {{ g.labelKey ? (g.labelKey | translate) : g.label }}
                </span>
                <span class="v">
                    {{ g.value }}@if (g.currency) {<span class="currency">{{ g.currency }}</span>}
                </span>
            </div>
        }
    `,
    host: { class: 'totals' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfTotalsComponent {
    readonly rows = input<ReadonlyArray<EfTotalsRow>>([]);
    readonly grand = input<EfTotalsGrand | undefined>(undefined);
}
