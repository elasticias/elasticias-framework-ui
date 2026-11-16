import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    inject,
    input,
    output,
    signal,
    viewChild,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { copyToClipboard } from './copy-to-clipboard';

let nextId = 0;

/** How long the "copied" announcement and the check icon stay before resetting. */
const COPIED_FEEDBACK_MS = 2000;

/**
 * A read-only value with a Copy button, for text a person must paste into
 * another system (a redirect URI for a provider console, a webhook URL).
 *
 * The value sits in a read-only, left-to-right monospace box that scrolls
 * inside itself, so a long URL never widens the page. A successful copy is
 * announced through a polite live region; where the clipboard refuses, the
 * text is selected for a manual copy and nothing is announced.
 *
 * ```html
 * <ef-copy-field labelKey="own_app_redirect_uri" [value]="uri()" />
 * ```
 *
 * Translation keys (add to the app's i18n files): `ef_copy_action` (the
 * button's accessible name) and `ef_copy_copied` (the announcement).
 */
@Component({
    selector: 'ef-copy-field',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TranslateModule],
    templateUrl: './ef-copy-field.component.html',
    styleUrl: './ef-copy-field.component.scss',
})
export class EfCopyFieldComponent {
    /** The text shown and copied, verbatim. */
    readonly value = input.required<string>();

    /** Visible label above the value; omit for none. */
    readonly labelKey = input<string | null>(null);

    /** Announced through the live region after a successful copy. */
    readonly copiedKey = input<string>('ef_copy_copied');

    /** Accessible name of the button. */
    readonly copyLabelKey = input<string>('ef_copy_action');

    /** Emits after the value reached the clipboard. */
    readonly copied = output<void>();

    protected readonly inputId = `ef-copy-field-${nextId++}`;
    protected readonly announced = signal(false);

    private readonly box = viewChild<ElementRef<HTMLInputElement>>('box');
    private timer: ReturnType<typeof setTimeout> | undefined;

    constructor() {
        inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
    }

    protected async copy(): Promise<void> {
        const ok = await copyToClipboard(this.value());
        clearTimeout(this.timer);
        if (!ok) {
            this.announced.set(false);
            this.box()?.nativeElement.select();
            return;
        }
        this.announced.set(true);
        this.copied.emit();
        this.timer = setTimeout(() => this.announced.set(false), COPIED_FEEDBACK_MS);
    }

    protected selectAll(event: Event): void {
        (event.target as HTMLInputElement).select();
    }
}
