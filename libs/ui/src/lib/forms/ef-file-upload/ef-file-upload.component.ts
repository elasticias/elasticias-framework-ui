import { ChangeDetectionStrategy, Component, ElementRef, computed, input, output, signal, viewChild } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { EfButtonComponent } from '../../layout/ef-button/ef-button.component';

export type EfFileRejectReason = 'size' | 'type';

export interface EfFileRejection {
    file: File;
    reason: EfFileRejectReason;
}

/**
 * A button that opens the native file picker and emits the chosen `File`.
 * It never talks to the network: the app uploads the emitted file through its
 * NSwag client (`client.uploadLogo({ data: file, fileName: file.name })`).
 *
 * - The button is a real `<button>`, so Enter/Space work and a screen reader
 *   announces it by its label (`labelKey`) or `ariaLabelKey` when icon-only.
 *   The native input is hidden from the tab order and the accessibility tree.
 * - `accept` is the usual `<input accept>` list (MIME types, `image/*`,
 *   `.ext`); it is checked again on the chosen file, because the picker's
 *   filter can be bypassed.
 * - `maxSizeBytes` rejects larger files. A rejected file is not emitted;
 *   `(fileRejected)` fires and a live region shows `sizeErrorKey` or
 *   `typeErrorKey` (translated).
 * - On a coarse pointer (touch phone, tablet, touch laptop) the painted button
 *   is `--hit-touch` (48px), as `ef-pill-group` does.
 *
 * ```html
 * <ef-file-upload labelKey="tenant_logo_upload" accept="image/png,image/jpeg"
 *     [maxSizeBytes]="2097152" sizeErrorKey="file_too_large"
 *     (fileSelected)="upload($event)" />
 * ```
 */
@Component({
    selector: 'ef-file-upload',
    standalone: true,
    imports: [EfButtonComponent, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'ef-file-upload',
    },
    template: `
        <input
            #picker
            type="file"
            class="ef-file-upload__input"
            tabindex="-1"
            aria-hidden="true"
            [accept]="accept() ?? ''"
            (change)="onChange($event)"
        />
        <ef-button
            variant="comptoir"
            [severity]="severity()"
            [icon]="icon()"
            [labelKey]="labelKey()"
            [ariaLabelKey]="ariaLabelKey()"
            [disabled]="disabled()"
            (clickEvent)="open()"
        />
        <span class="ef-file-upload__error" role="alert">
            @if (errorKey(); as key) {
                {{ key | translate }}
            }
        </span>
    `,
    styles: [
        `
            :host {
                position: relative;
                display: inline-flex;
                flex-direction: column;
                align-items: flex-start;
                gap: var(--s-1);
                min-width: 0;
                max-width: 100%;
            }
            .ef-file-upload__input {
                position: absolute;
                width: 1px;
                height: 1px;
                opacity: 0;
                overflow: hidden;
                pointer-events: none;
            }
            .ef-file-upload__error:empty {
                display: none;
            }
            .ef-file-upload__error {
                color: var(--st-cancelled-fg);
                font-size: 12.5px;
                overflow-wrap: anywhere;
            }
        `,
    ],
})
export class EfFileUploadComponent {
    /** Visible label (translation key). Omit for an icon-only button and set `ariaLabelKey`. */
    readonly labelKey = input<string | undefined>(undefined);
    readonly ariaLabelKey = input<string | undefined>(undefined);
    readonly icon = input<string | undefined>(undefined);
    readonly severity = input<'primary' | 'tenant' | 'ghost' | 'danger'>('ghost');
    /** The `<input accept>` list: MIME types, `type/*` and `.ext`, comma separated. */
    readonly accept = input<string | undefined>(undefined);
    readonly maxSizeBytes = input<number | undefined>(undefined);
    /** Translation key shown when the file is over `maxSizeBytes`. */
    readonly sizeErrorKey = input('ef_file_upload_too_large');
    /** Translation key shown when the file does not match `accept`. */
    readonly typeErrorKey = input('ef_file_upload_wrong_type');
    readonly disabled = input(false);

    readonly fileSelected = output<File>();
    readonly fileRejected = output<EfFileRejection>();

    private readonly picker = viewChild.required<ElementRef<HTMLInputElement>>('picker');
    private readonly reason = signal<EfFileRejectReason | null>(null);
    protected readonly errorKey = computed(() => {
        const r = this.reason();
        return r === 'size' ? this.sizeErrorKey() : r === 'type' ? this.typeErrorKey() : null;
    });

    protected open(): void {
        if (this.disabled()) return;
        this.picker().nativeElement.click();
    }

    protected onChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        // Reset so choosing the same file again still fires `change`.
        input.value = '';
        if (!file) return;

        const reason = this.check(file);
        this.reason.set(reason);
        if (reason) {
            this.fileRejected.emit({ file, reason });
            return;
        }
        this.fileSelected.emit(file);
    }

    private check(file: File): EfFileRejectReason | null {
        if (!this.matchesAccept(file)) return 'type';
        const max = this.maxSizeBytes();
        if (max !== undefined && file.size > max) return 'size';
        return null;
    }

    private matchesAccept(file: File): boolean {
        const tokens = (this.accept() ?? '')
            .split(',')
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean);
        if (tokens.length === 0) return true;
        const name = file.name.toLowerCase();
        const type = (file.type || '').toLowerCase();
        return tokens.some((t) =>
            t.startsWith('.') ? name.endsWith(t) : t.endsWith('/*') ? type.startsWith(t.slice(0, -1)) : type === t,
        );
    }
}
