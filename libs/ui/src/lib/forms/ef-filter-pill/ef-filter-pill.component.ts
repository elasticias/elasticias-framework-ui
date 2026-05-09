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
 * Comptoir filter pill — value-bearing button used in the smart-bar's
 * filter row. Three tones (`neutral` / `active` / `tenant`), optional
 * caret (when the pill toggles a popover), optional ✕ clear button.
 *
 * The popover content is consumer-projected via the `[popover]` slot
 * — the pill positions it absolutely below itself per the prototype's
 * `.popover` class. Visibility is driven by the `popoverOpen` input.
 *
 * ```html
 * <!-- value-bearing, removable -->
 * <ef-filter-pill
 *   icon="pi pi-user"
 *   labelKey="filter_client"
 *   value="Leila Bennani"
 *   tone="active"
 *   hasClear
 *   (clearClick)="removeFilter('client')"
 * />
 *
 * <!-- with popover (consumer renders preset list inside) -->
 * <ef-filter-pill
 *   icon="pi pi-calendar"
 *   labelKey="filter_date"
 *   [value]="activeDatePreset().labelKey | translate"
 *   hasPopover
 *   [popoverOpen]="datePopoverOpen()"
 *   (pillClick)="toggleDatePopover()"
 * >
 *   <ng-container popover>
 *     @for (p of presets; track p.key) {
 *       <div class="preset" [class.active]="p === active">…</div>
 *     }
 *   </ng-container>
 * </ef-filter-pill>
 * ```
 */
@Component({
    selector: 'ef-filter-pill',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    templateUrl: './ef-filter-pill.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfFilterPillComponent {
    /** PrimeNG icon class (e.g. `pi pi-calendar`). */
    readonly icon = input<string>('');

    /** Translation key — preferred. */
    readonly labelKey = input<string>('');
    /** Direct label text (used only when `labelKey` is empty). */
    readonly label = input<string>('');

    /** Current value displayed after the label. */
    readonly value = input<string>('');

    /** `'active'` paints ink-active; `'tenant'` paints the tenant-50 surface. */
    readonly tone = input<'neutral' | 'active' | 'tenant'>('neutral');

    /** Show the ✕ clear button at the end of the pill. */
    readonly hasClear = input(false, { transform: booleanAttribute });

    /** Show a chevron + position the projected `[popover]` slot. */
    readonly hasPopover = input(false, { transform: booleanAttribute });

    /** Whether the popover is currently open (consumer-controlled). */
    readonly popoverOpen = input(false, { transform: booleanAttribute });

    /** Translation key for the ✕ clear button's aria-label. */
    readonly clearAriaKey = input<string>('filter_remove_aria');

    /** Emitted when the pill body is clicked (open popover, etc.). */
    readonly pillClick = output<void>();

    /** Emitted when the ✕ clear button is clicked (stops propagation). */
    readonly clearClick = output<void>();

    onPillClick(): void {
        this.pillClick.emit();
    }

    onClearClick(event: Event): void {
        event.stopPropagation();
        this.clearClick.emit();
    }
}
