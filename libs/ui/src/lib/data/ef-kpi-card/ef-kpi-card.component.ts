import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { EfKpiDeltaTone, EfKpiSparkline } from './ef-kpi-card.types';

/**
 * Dashboard headline KPI tile — the one place KPIs are allowed in
 * the design system. List/search screens stay focused on results;
 * KPIs live on per-module dashboards (and detail-screen sidebars
 * via `ef-stats`).
 *
 * ```html
 * <ef-kpi-card
 *   labelKey="kpi_revenue_7d"
 *   value="52 480"
 *   unit="MAD"
 *   delta="▲ 12%"
 *   deltaTone="up"
 *   [spark]="[22, 20, 17, 18, 12, 14, 9, 11, 7, 10, 5, 8, 4, 3, 2]"
 * />
 * ```
 *
 * Sparkline values are normalized to a fixed 200×28 viewBox; the
 * stroke colour follows `--tenant-500` by default — override via
 * `[sparkColor]="'var(--st-pending-fg)'"` for variants. Pass an
 * empty array to hide the sparkline.
 */
@Component({
    selector: 'ef-kpi-card',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    template: `
        <div class="kpi-head">
            <span class="label">
                {{ labelKey() ? (labelKey() | translate) : label() }}
            </span>
            @if (delta()) {
                <span class="delta" [class]="'delta ' + deltaTone()">{{ delta() }}</span>
            }
        </div>

        <div class="kpi-value">
            {{ value() }}@if (unit()) {<span class="unit">{{ unit() }}</span>}
        </div>

        @if (sparkPoints()) {
            <svg class="spark" viewBox="0 0 200 28" preserveAspectRatio="none" aria-hidden="true">
                <polyline
                    fill="none"
                    [attr.stroke]="sparkColor()"
                    stroke-width="2"
                    [attr.points]="sparkPoints()"
                />
            </svg>
        }
    `,
    host: { class: 'kpi' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfKpiCardComponent {
    /** Translation key for the small label above the headline number. */
    readonly labelKey = input<string>('');
    /** Direct label fallback. */
    readonly label = input<string>('');

    /** Pre-formatted headline value (e.g. `'52 480'`, `'603'`). */
    readonly value = input<string | number>('');

    /** Optional small unit suffix (e.g. `'MAD'`, `'%'`). */
    readonly unit = input<string>('');

    /** Pre-formatted delta text including the arrow glyph (`'▲ 12%'`). */
    readonly delta = input<string>('');

    /** Delta tone — drives the arrow color. */
    readonly deltaTone = input<EfKpiDeltaTone>('up');

    /** Raw series for the sparkline. */
    readonly spark = input<EfKpiSparkline>([]);

    /** Stroke color for the sparkline polyline. */
    readonly sparkColor = input<string>('var(--tenant-500)');

    /** Computed `points="x,y x,y …"` attribute, normalized into the
     *  200×28 viewBox so the polyline always fits. Returns null
     *  when the series is empty. */
    readonly sparkPoints = computed<string | null>(() => {
        const series = this.spark();
        if (!series || series.length < 2) return null;

        const min = Math.min(...series);
        const max = Math.max(...series);
        const range = max - min || 1;
        const xStep = 200 / (series.length - 1);

        return series
            .map((v, i) => {
                const x = +(i * xStep).toFixed(2);
                // Higher values → smaller y (origin top-left). Inset
                // by 2px so the stroke doesn't clip at the edges.
                const y = +(26 - ((v - min) / range) * 24).toFixed(2);
                return `${x},${y}`;
            })
            .join(' ');
    });
}
