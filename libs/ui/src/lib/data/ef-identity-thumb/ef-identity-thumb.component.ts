import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';

export type EfIdentityThumbSize = 'sm' | 'md';

/**
 * The square that stands for a record: a collection in its detail toolbar, a
 * product in a picker row. Shows the record's image when it has one and two
 * initials of its name when it does not (or when the image fails to load).
 *
 * Built on the `.thumb` pattern from `_patterns.scss`; the size is a host
 * class (`sm` 32px, `md` 40px), never an inline style. The image is
 * decorative (`alt=""`): the name always sits next to it.
 *
 * ```html
 * <ef-identity-thumb [imageUrl]="imageUrl()" [name]="title()" size="sm" />
 * ```
 */
@Component({
    selector: 'ef-identity-thumb',
    standalone: true,
    styleUrl: './ef-identity-thumb.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'thumb ef-identity-thumb',
        '[class.ef-identity-thumb--sm]': "size() === 'sm'",
        '[class.ef-identity-thumb--md]': "size() !== 'sm'",
        '[class.has-image]': 'showImage()',
        'aria-hidden': 'true',
    },
    template: `
        @if (showImage()) {
            <img [src]="imageUrl()" alt="" loading="lazy" decoding="async" (error)="failed.set(true)" />
        } @else {
            {{ initials() }}
        }
    `,
})
export class EfIdentityThumbComponent {
    readonly imageUrl = input<string | null | undefined>(null);
    readonly name = input<string | null | undefined>('');
    readonly size = input<EfIdentityThumbSize>('md');

    /** Set when the image fails; reset whenever the url changes. */
    protected readonly failed = signal(false);

    protected readonly showImage = computed(() => !!this.imageUrl()?.trim() && !this.failed());

    /**
     * First letter of the first two words, or the first two letters of a
     * single word. `Array.from` splits by code point, so a letter outside the
     * BMP is never cut in half.
     */
    protected readonly initials = computed(() => {
        const words = (this.name() ?? '').trim().split(/\s+/).filter(Boolean);
        if (!words.length) return '';
        const letters =
            words.length > 1
                ? [Array.from(words[0])[0], Array.from(words[1])[0]]
                : Array.from(words[0]).slice(0, 2);
        return letters.join('').toUpperCase();
    });

    constructor() {
        effect(() => {
            this.imageUrl();
            this.failed.set(false);
        });
    }
}
