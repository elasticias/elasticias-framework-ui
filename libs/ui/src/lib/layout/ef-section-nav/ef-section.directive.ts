import { Directive, ElementRef, computed, inject, input } from '@angular/core';
import { EfCardComponent } from '../ef-card/ef-card.component';

/**
 * Marks one section of a long screen for `<ef-section-nav>`. Put it on the
 * section's outer element (an `ef-card`, a component host that renders one,
 * or a plain wrapper around several cards) inside the nav's content:
 *
 * ```html
 * <ef-card efSection="sender" titleKey="email_settings_card_sender"
 *          [sectionStatusKey]="'email_settings_source_' + source()">…</ef-card>
 * <shopper-accounts-card efSection="accounts" sectionLabelKey="store_accounts_title" />
 * ```
 *
 * The nav item's label is `sectionLabelKey`, or the host card's `titleKey`
 * when the directive sits on an `ef-card`. The status shown under it is
 * either a translation key (`sectionStatusKey` + optional params, neutral
 * unless `sectionStatusColor` says otherwise) or a reference-data entry
 * (`sectionStatusReference` + `sectionStatusCode`), read exactly as
 * `ef-status-chip` reads it: its label, and its `metadata.color`.
 *
 * The host gets the DOM id `ef-section-<id>` (prefixed so it never collides
 * with a control's name or id) and `tabindex="-1"`, so focus can follow a
 * click in the nav.
 */
@Directive({
    selector: '[efSection]',
    standalone: true,
    host: {
        '[attr.id]': 'domId()',
        '[attr.data-ef-section]': 'id()',
        tabindex: '-1',
        class: 'ef-section',
    },
})
export class EfSectionDirective {
    /** Stable section id, unique on the screen; also the URL fragment. */
    readonly id = input.required<string>({ alias: 'efSection' });
    /** Translation key of the nav item. Defaults to the host ef-card's `titleKey`. */
    readonly sectionLabelKey = input<string>('');
    /** PrimeIcons class string shown before the label, e.g. `'pi pi-send'`. */
    readonly sectionIcon = input<string>('');
    /** Translation key of a one-line summary of the section's state. */
    readonly sectionStatusKey = input<string | null | undefined>('');
    /** Interpolation params for `sectionStatusKey`. */
    readonly sectionStatusParams = input<Record<string, unknown> | null>(null);
    /** Reference-data list the status comes from (label + `metadata.color`). */
    readonly sectionStatusReference = input<string>('');
    /** Code looked up in `sectionStatusReference`. */
    readonly sectionStatusCode = input<string | null | undefined>('');
    /** Forces the status tone (an `EfStatusColor` or a PrimeNG severity alias). */
    readonly sectionStatusColor = input<string | null | undefined>('');

    /** The section element the nav scrolls to and observes. */
    readonly element: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

    private readonly card = inject(EfCardComponent, { optional: true, self: true });

    readonly domId = computed(() => `ef-section-${this.id()}`);
    readonly resolvedLabelKey = computed(() => this.sectionLabelKey() || this.card?.titleKey() || this.id());
}
