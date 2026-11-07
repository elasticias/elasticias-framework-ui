import {
    booleanAttribute,
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
    linkedSignal,
    output,
    signal,
} from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { cleanLocalizedText, EF_CONTENT_CULTURES, type EfCulture } from '@elasticias/core';
import type { LocalizedText } from '@elasticias/types';
import { EfLabelComponent } from '../../layout/ef-label/ef-label.component';
import { EfTabItem, EfTabsComponent } from '../../layout/ef-tabs/ef-tabs.component';
import { EfInputTextComponent } from '../ef-input-text/ef-input-text.component';
import { EfReadOnlyDirective } from '../ef-read-only.directive';
import { EfTextareaComponent } from '../ef-textarea/ef-textarea.component';

let nextId = 0;

/** Same texts once blanks are dropped. */
function sameText(a: LocalizedText, b: LocalizedText): boolean {
    const ka = Object.keys(a);
    return ka.length === Object.keys(b).length && ka.every(k => a[k] === b[k]);
}

/**
 * One owner-written text (a title, a description, an HTML body) in every
 * content language: a pill tab per culture, the active culture's field below
 * it, and the whole object out on every edit with blank cultures removed
 * (ADR-050 section 7).
 *
 * - **Cultures** come from `EF_CONTENT_CULTURES` (the ERP provides them from
 *   the tenant profile) unless `cultures` is set. The active tab is local and
 *   starts on the default culture.
 * - **Tabs** carry the `ef_localized_input_missing` note on every culture with
 *   no text, the error tone on the default culture of a `required` field left
 *   empty, and the dirty dot on cultures edited since the value arrived.
 * - **Direction.** Each field gets its culture's `dir` and `lang`. In `html`
 *   mode the source stays `ltr` for every culture (raw HTML in an `rtl`
 *   textarea reads reversed) and the sanitised preview takes the culture's
 *   direction.
 * - **Read-only cultures** are shown disabled with
 *   `ef_localized_input_read_only_hint` and the projected `[read-only-link]`;
 *   their text still travels in the emitted object. `[efReadOnly]`, `[disabled]`
 *   and a form's `disable()` disable every culture; the tabs stay usable so the
 *   other languages can still be read.
 * - **Forms.** A ControlValueAccessor (`[formControl]`, `formControlName`,
 *   `[(ngModel)]`) as well as `[value]` + `(valueChangeEvent)`.
 * - **Names.** Each culture's field is named `<name>.<culture>` (`title.ar`),
 *   the key the backend reports a per-culture error under.
 *
 * i18n keys the app's bundles must define (the libs ship no JSON):
 *
 * | key | fr | ar | en |
 * |---|---|---|---|
 * | `ef_localized_input_culture_fr` | Français | الفرنسية | French |
 * | `ef_localized_input_culture_ar` | Arabe | العربية | Arabic |
 * | `ef_localized_input_culture_en` | Anglais | الإنجليزية | English |
 * | `ef_localized_input_missing` | manquant | غير مكتوب | missing |
 * | `ef_localized_input_read_only_hint` | Ce texte se modifie ailleurs. | يُعدَّل هذا النص في مكان آخر. | This text is edited elsewhere. |
 *
 * ```html
 * <ef-localized-input name="title" labelKey="product_title" required
 *     [value]="product().title" (valueChangeEvent)="patch({ title: $event })"
 *     [advisedLength]="60" [maxLength]="256" />
 *
 * <ef-localized-input name="title" [readOnlyCultures]="['fr']" ...>
 *     <a read-only-link [routerLink]="catalogLink()">{{ 'store_open_catalog' | translate }}</a>
 * </ef-localized-input>
 * ```
 */
@Component({
    selector: 'ef-localized-input',
    standalone: true,
    imports: [TranslateModule, EfLabelComponent, EfTabsComponent, EfInputTextComponent, EfTextareaComponent],
    templateUrl: './ef-localized-input.component.html',
    styleUrl: './ef-localized-input.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { '(focusout)': 'onTouched()' },
})
export class EfLocalizedInputComponent implements ControlValueAccessor {
    /** The camelCase backend property (`title`); each field is `<name>.<culture>`. */
    readonly name = input.required<string>();
    readonly value = input<LocalizedText | null | undefined>(null);
    readonly mode = input<'text' | 'textarea' | 'html'>('text');
    readonly rows = input(4);
    /** Hard cap, the server's limit. */
    readonly maxLength = input<number | undefined>(undefined);
    /** What the counter measures against (what a search engine shows, say). */
    readonly advisedLength = input<number | undefined>(undefined);
    /** The default culture must be filled. */
    readonly required = input(false, { transform: booleanAttribute });
    /** Cultures shown but not editable here, with the `[read-only-link]` slot. */
    readonly readOnlyCultures = input<ReadonlyArray<string>>([]);
    readonly labelKey = input('');
    readonly placeholderKey = input('');
    readonly hintKey = input('');
    readonly variant = input<'comptoir' | 'default'>('comptoir');
    readonly disabled = input(false, { transform: booleanAttribute });
    /** Overrides the `EF_CONTENT_CULTURES` list for this field. */
    readonly cultures = input<ReadonlyArray<EfCulture> | undefined>(undefined);

    /** The whole new object, trimmed, with blank cultures removed. */
    readonly valueChangeEvent = output<LocalizedText>();

    private readonly contentCultures = inject(EF_CONTENT_CULTURES);
    private readonly readOnlyScope = inject(EfReadOnlyDirective, { optional: true });
    readonly ngControl = inject(NgControl, { self: true, optional: true });

    protected readonly uid = `ef-localized-input-${nextId++}`;

    /** The object this component last emitted; an echo of it is not new data. */
    private lastEmitted: LocalizedText | null = null;

    /** The text as typed, blanks and spaces kept, so an echo never rewrites a field mid-word. */
    private readonly raw = linkedSignal<LocalizedText | null | undefined, LocalizedText>({
        source: this.value,
        computation: (v, prev) => {
            if (prev && (v === this.lastEmitted || sameText(cleanLocalizedText(v), cleanLocalizedText(prev.value)))) {
                return prev.value;
            }
            return { ...(v ?? {}) };
        },
    });

    /** What the dirty dots compare against: the last value that came from outside. */
    private readonly baseline = linkedSignal<LocalizedText | null | undefined, LocalizedText>({
        source: this.value,
        computation: (v, prev) => (prev && v === this.lastEmitted ? prev.value : cleanLocalizedText(v)),
    });

    private readonly cleaned = computed(() => cleanLocalizedText(this.raw()));

    protected readonly list = computed<ReadonlyArray<EfCulture>>(() => this.cultures() ?? this.contentCultures().cultures);

    protected readonly defaultCode = computed(() => {
        const preferred = this.contentCultures().defaultCulture;
        const list = this.list();
        return list.some(c => c.code === preferred) ? preferred : (list[0]?.code ?? preferred);
    });

    private readonly selected = signal<string | null>(null);

    protected readonly active = computed<EfCulture | undefined>(() => {
        const list = this.list();
        const code = this.selected();
        return list.find(c => c.code === code) ?? list.find(c => c.code === this.defaultCode()) ?? list[0];
    });

    protected readonly tabItems = computed<EfTabItem[]>(() => {
        const text = this.cleaned();
        const base = this.baseline();
        return this.list().map(c => {
            const missing = !text[c.code];
            return {
                value: c.code,
                labelKey: c.labelKey,
                noteKey: missing ? 'ef_localized_input_missing' : undefined,
                tone: missing && this.required() && c.code === this.defaultCode() ? 'danger' : undefined,
                dirty: (text[c.code] ?? '') !== (base[c.code] ?? ''),
                id: this.tabId(c.code),
                panelId: this.panelId,
            };
        });
    });

    private readonly cvaDisabled = signal(false);

    /** Every culture is disabled: `[disabled]`, a form's `disable()`, or `[efReadOnly]`. */
    readonly isDisabled = computed(() => this.disabled() || this.cvaDisabled() || (this.readOnlyScope?.readOnly() ?? false));

    protected readonly activeReadOnly = computed(() => {
        const code = this.active()?.code;
        return !!code && this.readOnlyCultures().includes(code);
    });

    protected readonly activeText = computed(() => this.raw()[this.active()?.code ?? ''] ?? '');

    protected readonly counterLimit = computed(() => this.advisedLength() ?? this.maxLength());

    protected readonly panelId = `${this.uid}-panel`;
    protected readonly counterId = `${this.uid}-counter`;

    private onChange: (v: LocalizedText) => void = () => { /* noop */ };
    private touched: () => void = () => { /* noop */ };

    constructor() {
        if (this.ngControl) this.ngControl.valueAccessor = this;
    }

    protected tabId(code: string): string {
        return `${this.uid}-tab-${code}`;
    }

    protected controlId(code: string): string {
        return `${this.uid}-${code}`;
    }

    protected select(code: string): void {
        this.selected.set(code);
    }

    protected setText(code: string, text: string): void {
        this.raw.update(r => ({ ...r, [code]: text }));
        const out = this.cleaned();
        this.lastEmitted = out;
        this.onChange(out);
        this.valueChangeEvent.emit(out);
    }

    protected onTouched(): void {
        this.touched();
    }

    writeValue(v: LocalizedText | null): void {
        this.raw.set({ ...(v ?? {}) });
        this.baseline.set(cleanLocalizedText(v));
    }

    registerOnChange(fn: (v: LocalizedText) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.touched = fn;
    }

    setDisabledState(disabled: boolean): void {
        this.cvaDisabled.set(disabled);
    }
}
