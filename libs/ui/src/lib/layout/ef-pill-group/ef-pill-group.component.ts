import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

export interface EfPillItem<T = string> {
    value: T;
    /** Direct label (no translation). */
    label?: string;
    /** Translation key — takes priority over label. */
    labelKey?: string;
    /** Optional count rendered after a thin separator. */
    count?: number;
}

/**
 * Segmented pill filter. Used for tab-like selectors over a small
 * set of options — "Toutes · 87 / À approuver · 14 / En retard · 3".
 *
 * ```html
 * <ef-pill-group
 *   [items]="filters"
 *   [(value)]="activeFilter"
 *   (valueChange)="onFilterChange($event)"
 * />
 * ```
 *
 * The active pill picks up a contrast fill (`--ink-active`); inactive
 * pills sit on transparent ground with muted text. Heights map to
 * `--hit` (32px) so it stacks naturally next to compact action buttons.
 */
@Component({
    selector: 'ef-pill-group',
    standalone: true,
    templateUrl: './ef-pill-group.component.html',
    styleUrl: './ef-pill-group.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, TranslateModule],
})
export class EfPillGroupComponent<T = string> {
    @Input({ required: true }) items: ReadonlyArray<EfPillItem<T>> = [];
    @Input() value: T | null = null;
    @Input() ariaLabel = 'filters';
    /** Hide counts even when items provide them. */
    @Input() hideCounts = false;

    @Output() readonly valueChange = new EventEmitter<T>();

    select(item: EfPillItem<T>): void {
        if (this.value !== item.value) {
            this.value = item.value;
            this.valueChange.emit(item.value);
        }
    }

    trackValue(_: number, item: EfPillItem<T>): T {
        return item.value;
    }
}
