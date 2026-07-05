import {
    ChangeDetectionStrategy,
    Component,
    booleanAttribute,
    computed,
    inject,
    input,
    Optional,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import {
    SCREEN_REF_DATA_SERVICE,
    ScreenReferenceDataService,
} from '@elasticias/screens';
import {
    EfStatusColor,
    EfStatusReferenceItem,
    resolveEfStatusColor,
} from './ef-status-chip.types';

/**
 * Comptoir status chip — single source of truth for any kind of
 * status / pill across the app.
 *
 * Resolves the chip's tone + label from the `reference_data`
 * collection so each tenant can re-skin its status palette without
 * touching consumer code:
 *
 * 1. Look up `referenceKey` in `SCREEN_REF_DATA_SERVICE`.
 * 2. Find the entry whose `code` matches the `code` input.
 * 3. Use `metadata.color` for the chip class and `label` /
 *    `labelKey` for the text.
 * 4. Fall back to the `code` itself (lowercased) when no reference
 *    data is registered — this lets screens render meaningfully even
 *    before the real `ReferenceDataService` is wired.
 *
 * ```html
 * <ef-status-chip
 *   referenceKey="sales_order_status"
 *   [code]="row.status"
 * />
 * ```
 *
 * Override knobs (escape hatches):
 * - `[color]` forces a specific Comptoir tone, ignoring metadata.
 * - `[label]` / `[labelKey]` force the text, ignoring reference data.
 * - `[hideDot]` removes the leading ● glyph.
 * - `[showCode]` displays the raw code (useful for admin screens).
 */
@Component({
    selector: 'ef-status-chip',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    templateUrl: './ef-status-chip.component.html',
    styleUrl: './ef-status-chip.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfStatusChipComponent {
    private readonly refDataService = inject<ScreenReferenceDataService | null>(
        SCREEN_REF_DATA_SERVICE,
        { optional: true },
    );

    /** Reference key (e.g. `'sales_order_status'`). */
    readonly referenceKey = input<string>('');

    /** Entry code to look up (e.g. `'Pending'`). */
    readonly code = input<string>('');

    /** Force a specific Comptoir tone (overrides metadata.color). */
    readonly color = input<EfStatusColor | ''>('');

    /** Force the displayed label (skips reference lookup). */
    readonly label = input<string>('');
    /** Translation key — preferred when forcing a label. */
    readonly labelKey = input<string>('');

    /** Hide the leading ● dot. */
    readonly hideDot = input(false, { transform: booleanAttribute });

    /** Render the raw `code` after the label (admin-screen helper). */
    readonly showCode = input(false, { transform: booleanAttribute });

    /** The reference entry matching `code`, or `undefined`. */
    private readonly entry = computed<EfStatusReferenceItem | undefined>(() => {
        if (!this.refDataService) return undefined;
        const key = this.referenceKey();
        if (!key) return undefined;
        const list = this.refDataService.getReference(key)();
        return list.find(
            (item: EfStatusReferenceItem) => item?.code === this.code(),
        );
    });

    /** Chip tone — explicit override → metadata (canonical tone or
     *  generic color-name alias, e.g. `green` → `delivered`) → code
     *  fallback → `neutral`. */
    readonly resolvedColor = computed<EfStatusColor>(() => {
        const forced = this.color();
        if (forced) return forced as EfStatusColor;

        return (
            resolveEfStatusColor(this.entry()?.metadata?.color) ??
            resolveEfStatusColor(this.code()) ??
            'neutral'
        );
    });

    /** Resolved label — labelKey input → label input → reference label → code. */
    readonly resolvedLabel = computed<string>(() => {
        const entry = this.entry();
        return this.label() || entry?.label || this.code();
    });

    /** Translation key returned for the template's translate pipe. */
    readonly resolvedLabelKey = computed<string>(() => {
        return this.labelKey() || this.entry()?.labelKey || '';
    });
}
