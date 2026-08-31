import {
    ChangeDetectionStrategy,
    Component,
    booleanAttribute,
    computed,
    inject,
    input,
    model,
    output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EfFilterPillComponent } from '../ef-filter-pill/ef-filter-pill.component';

export interface EfPresetItem<T = string> {
    /** Stable identifier (used as the `value`). */
    key: T;
    /** Translation key for the row label (preferred). */
    labelKey?: string;
    /** Direct label (used only when `labelKey` is empty). */
    label?: string;
    /** Mono hint to the right (date range, count, …). */
    hint?: string;
}

/**
 * Filter pill that opens a list of presets on click. Consumer-side
 * use cases: date ranges (`Aujourd'hui · 30 derniers jours · …`),
 * non-date enums (`Jamais connecté`), any short canned list.
 *
 * State model: `open` is a `model()` so callers can let the pill
 * manage its own visibility (default) or hoist it into a parent
 * signal for fully controlled use (`[(open)]`).
 *
 * ```html
 * <ef-preset-pill
 *   icon="pi pi-calendar"
 *   labelKey="filter_date"
 *   [presets]="datePresets"
 *   [(activeKey)]="activeDateKey"
 *   (presetChange)="onDateRangeChange($event)"
 * />
 * ```
 */
@Component({
    selector: 'ef-preset-pill',
    standalone: true,
    imports: [CommonModule, TranslateModule, EfFilterPillComponent],
    template: `
        <ef-filter-pill
            [icon]="icon()"
            [labelKey]="labelKey()"
            [label]="label()"
            [value]="activeLabel()"
            [tone]="tone()"
            [hasPopover]="true"
            [popoverOpen]="open()"
            (pillClick)="toggle()"
        >
            <ng-container popover>
                @for (preset of presets(); track preset.key) {
                    <div
                        class="preset"
                        [class.active]="preset.key === activeKey()"
                        (click)="select(preset); $event.stopPropagation()"
                    >
                        <span>
                            {{ preset.labelKey ? (preset.labelKey | translate) : (preset.label ?? '') }}
                        </span>
                        @if (preset.hint) {
                            <span class="hint">{{ preset.hint }}</span>
                        }
                    </div>
                }
            </ng-container>
        </ef-filter-pill>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfPresetPillComponent<T = string> {
    private readonly translate = inject(TranslateService);

    readonly icon = input<string>('pi pi-list');
    readonly labelKey = input<string>('');
    readonly label = input<string>('');
    readonly tone = input<'neutral' | 'active' | 'tenant'>('neutral');

    readonly presets = input.required<ReadonlyArray<EfPresetItem<T>>>();
    readonly activeKey = model<T | null>(null);

    /** Two-way; consumer can hoist for controlled mode. */
    readonly open = model<boolean>(false);

    /** Auto-close the popover after selection (default on). */
    readonly closeOnSelect = input(true, { transform: booleanAttribute });

    readonly presetChange = output<EfPresetItem<T>>();

    /** Displayed value — translates `labelKey` of the active preset if present. */
    readonly activeLabel = computed(() => {
        const key = this.activeKey();
        const match = this.presets().find(p => p.key === key);
        if (!match) return '';
        if (match.labelKey) return this.translate.instant(match.labelKey);
        return match.label ?? '';
    });

    toggle(): void {
        this.open.update(o => !o);
    }

    select(preset: EfPresetItem<T>): void {
        this.activeKey.set(preset.key);
        this.presetChange.emit(preset);
        if (this.closeOnSelect()) this.open.set(false);
    }
}
