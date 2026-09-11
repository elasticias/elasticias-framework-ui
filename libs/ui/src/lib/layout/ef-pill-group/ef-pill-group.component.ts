import {
    afterNextRender,
    booleanAttribute,
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    ElementRef,
    input,
    model,
    signal,
    viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

export interface EfPillItem<T = string> {
    /** Value emitted when the pill is picked. */
    value: T;

    /**
     * Translation key for the pill's label. Required, like every other
     * `ef-*` control: the component translates, the caller never does.
     *
     * A value that is not a known key falls through to itself, which is
     * what lets a label already resolved from reference data (a seeded
     * status name, say) render correctly until that data carries keys of
     * its own.
     */
    labelKey: string;

    /** Optional count rendered after a thin separator. */
    count?: number;
}

/**
 * Segmented pill filter — "Toutes · 87 / À approuver · 14 / En retard · 3".
 *
 * ```html
 * <ef-pill-group
 *   [items]="statusBuckets()"
 *   [(value)]="statusFilter"
 *   ariaLabelKey="sales_orders_status_aria"
 * />
 * ```
 *
 * The active pill takes a contrast fill (`--ink-active`); inactive pills
 * sit on transparent ground with muted text.
 *
 * **It scrolls rather than clipping.** Nine status filters with French
 * labels are roughly 676px wide, and the hand-rolled `.pill-group` this
 * replaces was `inline-flex` with no wrap and no scroller — so on a
 * 390px phone the last five filters could not be reached at all. The row
 * now scrolls inside itself, fades at whichever edge has more content,
 * and keeps the selected pill in view. Pills never squeeze: a pill
 * radius on a box that has wrapped to two lines is not a pill.
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
    readonly items = input.required<ReadonlyArray<EfPillItem<T>>>();

    /** Two-way bound selection. */
    readonly value = model<T | null>(null);

    /** Translation key for the group's accessible name. */
    readonly ariaLabelKey = input<string>('common_filters');

    /** Hide counts even when items provide them. */
    readonly hideCounts = input(false, { transform: booleanAttribute });

    private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');

    /** Whether content is hidden past each edge, which drives the fades. */
    private readonly overflowStart = signal(false);
    private readonly overflowEnd = signal(false);

    protected readonly fadeClass = computed(() => ({
        'has-fade-start': this.overflowStart(),
        'has-fade-end': this.overflowEnd(),
    }));

    constructor() {
        // Landing on a screen whose active filter sits off-screen should not
        // look like nothing is selected.
        afterNextRender(() => {
            this.measure();
            this.scrollActiveIntoView('auto');
        });

        effect(() => {
            this.value();
            this.items();
            queueMicrotask(() => {
                this.measure();
                this.scrollActiveIntoView('smooth');
            });
        });
    }

    protected select(item: EfPillItem<T>): void {
        if (this.value() !== item.value) this.value.set(item.value);
    }

    protected onScroll(): void {
        this.measure();
    }

    protected trackValue = (_: number, item: EfPillItem<T>): T => item.value;

    private measure(): void {
        const el = this.scroller()?.nativeElement;
        if (!el) return;
        // `scrollLeft` runs negative in RTL, so compare on magnitude.
        const left = Math.abs(el.scrollLeft);
        const max = el.scrollWidth - el.clientWidth;
        this.overflowStart.set(left > 1);
        this.overflowEnd.set(max > 1 && left < max - 1);
    }

    private scrollActiveIntoView(behavior: ScrollBehavior): void {
        const el = this.scroller()?.nativeElement;
        const active = el?.querySelector<HTMLElement>('.ef-pill.is-active');
        if (!el || !active) return;
        // Only correct when it is actually out of view — an unprompted scroll
        // on every render is noise.
        const pill = active.getBoundingClientRect();
        const box = el.getBoundingClientRect();
        if (pill.left >= box.left && pill.right <= box.right) return;
        active.scrollIntoView({ behavior, inline: 'center', block: 'nearest' });
    }
}
