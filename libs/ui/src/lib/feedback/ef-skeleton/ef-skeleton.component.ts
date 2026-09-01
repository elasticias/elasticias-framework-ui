import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Shape of the placeholder rendered while a widget's data is in flight. */
export type EfSkeletonVariant = 'text' | 'kpi' | 'chart' | 'table';

/**
 * Comptoir loading skeleton — the one reusable "waiting for results"
 * placeholder for async card/widget bodies (dashboards, reports,
 * detail sidebars). Pure CSS shimmer on the design-system tokens;
 * decorative only (`aria-hidden`), so hosts flag busyness themselves
 * (`ef-card` sets `aria-busy` on its body when `[loading]` is true).
 *
 * Prefer injecting it through `ef-card`'s `[loading]` + `skeleton`
 * inputs — the card swaps its body for the skeleton with a single
 * binding. Use the component directly only for non-card shells
 * (e.g. a KPI tile row):
 *
 * ```html
 * <ef-card titleKey="…" [loading]="state() === 'loading'" skeleton="chart">…</ef-card>
 * <ef-skeleton class="kpi" variant="kpi" />
 * ```
 *
 * Variants: `text` (default, `rows` lines), `kpi` (label / value /
 * delta bars), `chart` (one block, `height` px), `table` (header bar
 * + `rows` row bars).
 */
@Component({
    selector: 'ef-skeleton',
    standalone: true,
    template: `
        @switch (variant()) {
            @case ('kpi') {
                <span class="sk sk-label"></span>
                <span class="sk sk-value"></span>
                <span class="sk sk-delta"></span>
            }
            @case ('chart') {
                <span class="sk sk-chart" [style.height.px]="height()"></span>
            }
            @case ('table') {
                <span class="sk sk-th"></span>
                @for (i of lines(); track i) {
                    <span class="sk sk-row"></span>
                }
            }
            @default {
                @for (i of lines(); track i) {
                    <span class="sk sk-text"></span>
                }
            }
        }
    `,
    styleUrl: './ef-skeleton.component.scss',
    host: { 'aria-hidden': 'true' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfSkeletonComponent {
    /** Placeholder shape. */
    readonly variant = input<EfSkeletonVariant>('text');

    /** Line/row count for the `text` and `table` variants. */
    readonly rows = input(4);

    /** Block height (px) for the `chart` variant. */
    readonly height = input(280);

    readonly lines = computed(() =>
        Array.from({ length: Math.max(1, this.rows()) }, (_, i) => i),
    );
}
