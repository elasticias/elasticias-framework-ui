import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    output,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Comptoir activation tri-state filter — a `.field`-anatomy pill group
 * (all / active / inactive) for boolean activation criteria
 * (`IsActive: bool?` pattern).
 *
 * `value` is the criteria value itself: `true`, `false`, or
 * `undefined`/`null` for "all". `valueChange` emits the same shape, so
 * the component binds straight onto a search screen's advanced-filter
 * state; pair with `AbstractSearchScreenV2.activationFilterKey` for
 * apply / baseline-clear / cache-restore.
 *
 * ```html
 * <ef-activation-filter
 *   [value]="advancedValues()['isActive']"
 *   (valueChange)="setAdvancedValue('isActive', $event)"
 * />
 * ```
 */
@Component({
    selector: 'ef-activation-filter',
    standalone: true,
    imports: [TranslateModule],
    template: `
        <div class="field">
            <span class="field-label" [id]="labelId">{{ labelKey() | translate }}</span>
            <div class="pill-group" role="tablist" [attr.aria-labelledby]="labelId">
                @for (bucket of buckets(); track bucket.key) {
                    <button
                        type="button"
                        role="tab"
                        [class.active]="selected() === bucket.key"
                        [attr.aria-selected]="selected() === bucket.key"
                        (click)="valueChange.emit(bucket.value)"
                    >
                        {{ bucket.labelKey | translate }}
                    </button>
                }
            </div>
        </div>
    `,
    styles: `
        :host {
            display: block;
        }
        /* Center the pills on the 40px control line so the field aligns
           with sibling comptoir selects/inputs in a drawer row. */
        .pill-group {
            min-height: var(--hit-base, 40px);
            align-items: center;
            align-self: start;
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfActivationFilterComponent {
    private static nextId = 0;
    readonly labelId = `ef-activation-filter-label-${++EfActivationFilterComponent.nextId}`;

    /** Current criteria value: `true` / `false` / `undefined` (= all). */
    readonly value = input<unknown>();

    readonly labelKey = input('common_activation');
    readonly allLabelKey = input('common_all');
    readonly activeLabelKey = input('common_active');
    readonly inactiveLabelKey = input('common_inactive');

    readonly valueChange = output<boolean | undefined>();

    readonly selected = computed(() => {
        const v = this.value();
        return v === true ? 'active' : v === false ? 'inactive' : 'all';
    });

    readonly buckets = computed(() => [
        { key: 'all', labelKey: this.allLabelKey(), value: undefined },
        { key: 'active', labelKey: this.activeLabelKey(), value: true },
        { key: 'inactive', labelKey: this.inactiveLabelKey(), value: false },
    ]);
}
