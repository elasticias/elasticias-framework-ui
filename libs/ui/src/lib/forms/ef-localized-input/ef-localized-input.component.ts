import {
    booleanAttribute,
    ChangeDetectionStrategy,
    Component,
    computed,
    DoCheck,
    effect,
    ElementRef,
    inject,
    Injector,
    input,
    linkedSignal,
    output,
    signal,
    untracked,
} from '@angular/core';
import { AbstractControl, ControlValueAccessor, FormGroupDirective, NG_VALIDATORS, NgControl, NgForm, ValidationErrors } from '@angular/forms';
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
 *   empty once the field is touched, changed or its form submitted, and the
 *   dirty dot on cultures edited since the value arrived. Dirty detection
 *   relies on the parent storing the emitted object by reference (the V2
 *   signal pattern): a parent that clones the value resets the dots on every
 *   edit, though it never loses text.
 * - **Direction.** Each field gets its culture's `dir` and `lang`. In `html`
 *   mode the source stays `ltr` for every culture (raw HTML in an `rtl`
 *   textarea reads reversed) and the sanitised preview takes the culture's
 *   direction.
 * - **Read-only cultures** are shown read-only (still focusable, so the hint
 *   is read and the text can be copied) with
 *   `ef_localized_input_read_only_hint` and the projected `[read-only-link]`;
 *   their text still travels in the emitted object. `[efReadOnly]`, `[disabled]`
 *   and a form's `disable()` disable every culture; the tabs stay usable so the
 *   other languages can still be read.
 * - **Forms.** A ControlValueAccessor (`[formControl]`, `formControlName`,
 *   `[(ngModel)]`) as well as `[value]` + `(valueChangeEvent)`. With
 *   `required`, the form control reports `required` while the default culture
 *   is empty.
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
 * | `ef_localized_input_cultures` | Langues du texte | لغات النص | Text languages |
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
    host: { '(focusout)': 'onFocusOut($event)' },
    providers: [
        {
            // A form's required validator reads an empty object as filled (it
            // checks length), so the field validates its default culture
            // itself. The component is looked up when the form validates, not
            // here: it injects NgControl, which injects these validators.
            provide: NG_VALIDATORS,
            multi: true,
            useFactory: () => {
                const injector = inject(Injector);
                return (control: AbstractControl) => injector.get(EfLocalizedInputComponent).validateRequired(control);
            },
        },
    ],
})
export class EfLocalizedInputComponent implements ControlValueAccessor, DoCheck {
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
    /** Labels the field and names its tablist; without it the tablist is
     *  named `ef_localized_input_cultures`. */
    readonly labelKey = input('');
    readonly placeholderKey = input('');
    readonly hintKey = input('');
    /** Field style in `text` mode only (`default` is ef-input-text's PrimeNG
     *  variant); the textarea and html modes have one style. */
    readonly variant = input<'comptoir' | 'default'>('comptoir');
    readonly disabled = input(false, { transform: booleanAttribute });
    /** Overrides the `EF_CONTENT_CULTURES` list for this field. */
    readonly cultures = input<ReadonlyArray<EfCulture> | undefined>(undefined);

    /** The whole new object, trimmed, with blank cultures removed. */
    readonly valueChangeEvent = output<LocalizedText>();

    private readonly contentCultures = inject(EF_CONTENT_CULTURES);
    private readonly readOnlyScope = inject(EfReadOnlyDirective, { optional: true });
    readonly ngControl = inject(NgControl, { self: true, optional: true });
    private readonly parentForm = inject(FormGroupDirective, { optional: true }) ?? inject(NgForm, { optional: true });
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    /** The user typed in, or left, the field. */
    private readonly interacted = signal(false);
    /** The form control is touched or dirty, or its form was submitted; read on every check. */
    private readonly formTouched = signal(false);

    /** Errors wait for touch, a change or a submit, like every ef-* control. */
    private readonly showErrors = computed(() => this.interacted() || this.formTouched());

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
                tone: missing && this.required() && c.code === this.defaultCode() && this.showErrors() ? 'danger' : undefined,
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
        // The validator reads required and the default culture, which can
        // change without the value changing (tenant cultures arrive late).
        effect(() => {
            this.required();
            this.defaultCode();
            untracked(() => this.ngControl?.control?.updateValueAndValidity({ emitEvent: false }));
        });
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
        this.interacted.set(true);
        this.onChange(out);
        this.valueChangeEvent.emit(out);
    }

    /** Touched when focus leaves the whole field, not when it moves from a tab to the text. */
    protected onFocusOut(event: FocusEvent): void {
        const next = event.relatedTarget;
        if (next instanceof Node && this.host.nativeElement.contains(next)) return;
        this.interacted.set(true);
        this.touched();
    }

    ngDoCheck(): void {
        // A form's markAllAsTouched() or submit does not reach the accessor,
        // so the control's state is read each time the parent is checked.
        const c = this.ngControl;
        this.formTouched.set(!!(c?.touched || c?.dirty || this.parentForm?.submitted));
    }

    /** `{ required: true }` while a required field's default culture has no text. */
    validateRequired(control: AbstractControl): ValidationErrors | null {
        if (!this.required()) return null;
        return cleanLocalizedText(control.value as LocalizedText | null)[this.defaultCode()] ? null : { required: true };
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
