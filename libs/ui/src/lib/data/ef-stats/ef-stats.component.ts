import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { EfStatsRow } from './ef-stats.types';

/**
 * Sidebar mini-KPI stack. Lives inside an `<ef-card>` on detail
 * screens; rule-soft separators between rows, optional `.big` row
 * swaps the value to a Bricolage display number.
 *
 * ```html
 * <ef-card titleKey="clients_stats">
 *   <ef-stats
 *     [rows]="[
 *       { labelKey: 'stats_revenue_ytd', value: '128 450', unit: 'MAD', big: true },
 *       { labelKey: 'stats_orders_count', value: 42 },
 *       { labelKey: 'stats_last_order',   value: 'Il y a 3 jours' },
 *     ]"
 *   />
 * </ef-card>
 * ```
 *
 * Stats are sidebar-only — never on list/search screens (KPIs there
 * are forbidden, see CLAUDE.md memory).
 */
@Component({
    selector: 'ef-stats',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    template: `
        @for (row of rows(); track row.labelKey || row.label) {
            <div class="row" [class.big]="row.big">
                <span class="l">
                    {{ row.labelKey ? (row.labelKey | translate) : row.label }}
                </span>
                <span class="v">
                    {{ row.value }}@if (row.unit) {<span class="unit">{{ row.unit }}</span>}
                </span>
            </div>
        }
    `,
    host: { class: 'stats' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfStatsComponent {
    readonly rows = input<ReadonlyArray<EfStatsRow>>([]);
}
