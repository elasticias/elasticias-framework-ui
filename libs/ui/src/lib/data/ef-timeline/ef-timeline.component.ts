import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { EfTimelineItem } from './ef-timeline.types';

/**
 * Vertical timeline — used on order / user / client detail screens
 * to surface the entity's history. Three dot states (`done` / `now`
 * / `upcoming`) line up with the prototype.
 *
 * ```html
 * <ef-card titleKey="orders_history">
 *   <ef-timeline
 *     [items]="[
 *       { state: 'done', label: 'Commande créée', meta: 'Karim · 12 mai 14:30' },
 *       { state: 'done', label: 'Paiement reçu',  meta: 'Stripe · 12 mai 14:32' },
 *       { state: 'now',  label: 'Préparation',    meta: 'En cours' },
 *       { state: 'upcoming', label: 'Expédition' },
 *     ]"
 *   />
 * </ef-card>
 * ```
 *
 * The `'now'` dot picks up `var(--module)` so each module's accent
 * tints its own active step.
 */
@Component({
    selector: 'ef-timeline',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    template: `
        @for (item of items(); track item.id ?? item.labelKey ?? item.label) {
            <div
                class="item"
                [class.done]="item.state === 'done'"
                [class.now]="item.state === 'now'"
            >
                <span class="dot" aria-hidden="true"></span>
                <div class="body">
                    <div class="label">
                        {{ item.labelKey ? (item.labelKey | translate) : item.label }}
                    </div>
                    @if (item.metaKey || item.meta) {
                        <div class="meta">
                            {{ item.metaKey ? (item.metaKey | translate) : item.meta }}
                        </div>
                    }
                </div>
            </div>
        }
    `,
    host: { class: 'timeline' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfTimelineComponent {
    readonly items = input<ReadonlyArray<EfTimelineItem>>([]);
}
