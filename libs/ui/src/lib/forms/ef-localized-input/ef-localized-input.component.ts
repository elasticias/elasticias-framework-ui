import {
    booleanAttribute,
    ChangeDetectionStrategy,
    Component,
    ComponentRef,
    computed,
    DoCheck,
    effect,
    ElementRef,
    inject,
    Injector,
    input,
    inputBinding,
    isDevMode,
    linkedSignal,
    model,
    output,
    outputBinding,
    signal,
    Type,
    untracked,
    viewChild,
    ViewContainerRef,
} from '@angular/core';
import { AbstractControl, ControlValueAccessor, FormGroupDirective, NG_VALIDATORS, NgControl, NgForm, ValidationErrors } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { merge } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { cleanLocalizedText, EF_CONTENT_CULTURES, type EfCulture } from '@elasticias/core';
import type { LocalizedText } from '@elasticias/types';
import { EfLabelComponent } from '../../layout/ef-label/ef-label.component';
import { EfTabItem, EfTabsComponent } from '../../layout/ef-tabs/ef-tabs.component';
import { EfInputTextComponent } from '../ef-input-text/ef-input-text.component';
import { EfReadOnlyDirective } from '../ef-read-only.directive';
import { EfServerErrorsDirective, resolveExternalErrors } from '../ef-server-errors.directive';
import { EfTextareaComponent } from '../ef-textarea/ef-textarea.component';
import { EF_RICH_TEXT, plainTextLength } from '../ef-rich-text.token';

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
 *   the tenant profile) unless `cultures` is set. The active culture starts
 *   on the default and is two-way through `[(activeCulture)]`.
 * - **One tab row for several texts** (an email's subject and body): bind the
 *   same signal to `[(activeCulture)]` on each and set `[showTabs]="false"`
 *   on all but one. A server error on any of them moves the shared culture.
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
 * - **Rich mode** (`mode="rich"`) edits each culture with `ef-rich-text`, the
 *   shared editor in `@elasticias/ui/rich-text`. The app turns it on once with
 *   `provideEfRichText()` (and installs `quill`); without it the field falls
 *   back to the `html` source and logs why in development, as it does when
 *   the editor's chunk fails to load. With `advisedLength` the counter
 *   counts the text a reader sees; with only `maxLength` it counts the
 *   stored HTML, which is what the server measures. Neither caps typing in
 *   this mode.
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
 * - **Server errors** (ADR-010) come from the enclosing `[efServerErrors]`
 *   scope. `<name>.<culture>` errors tint that culture's tab, show under its
 *   field while it is active (the field links itself by name) and, from another
 *   tab, show as a hint naming the languages in error; a new set of errors
 *   moves to the first of them. `<name>` errors, or an explicit `[errors]`,
 *   show under the field on every tab, as do errors for a language the field
 *   does not list (`title.xx`). Messages are translated as keys. Keys: `ef_localized_input_errors_in_other`.
 * - **Spoken limit.** `counterHintKey` is read with the counter (through
 *   `aria-describedby`) and `counterOverKey` is announced politely when the
 *   text passes the limit; both take `{{max}}`.
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
 * | `ef_localized_input_errors_in_other` | Erreur dans : | خطأ في: | Error in: |
 * | `ef_localized_input_read_only_hint` | Ce texte se modifie ailleurs. | يُعدَّل هذا النص في مكان آخر. | This text is edited elsewhere. |
 *
 * ```html
 * <ef-localized-input name="title" labelKey="product_title" required
 *     [value]="product().title" (valueChangeEvent)="patch({ title: $event })"
 *     [advisedLength]="60" [maxLength]="256" />
 *
 * <ef-localized-input name="subject" labelKey="email_subject" [maxLength]="200" [(activeCulture)]="culture" ... />
 * <ef-localized-input name="htmlBody" labelKey="email_body" mode="html" [showTabs]="false" [(activeCulture)]="culture" ... />
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
    readonly mode = input<'text' | 'textarea' | 'html' | 'rich'>('text');
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
    /** i18n key (with `{{max}}`) read out with the counter, for a limit that is advice rather than a cap. */
    readonly counterHintKey = input('');
    /** i18n key (with `{{max}}`) announced politely when the text goes past the limit. */
    readonly counterOverKey = input('');
    /** Field style in `text` mode only, named like ef-input-text's (`primeng`
     *  or `comptoir`); the textarea, html and rich modes have one style.
     *  `default` is the former name of `primeng`, kept for one release. */
    readonly variant = input<'comptoir' | 'primeng' | 'default'>('comptoir');
    readonly disabled = input(false, { transform: booleanAttribute });
    /**
     * Messages for the whole field. Without it they come from the enclosing
     * `[efServerErrors]` scope under `name`; an explicit list wins. The
     * per-language messages (`<name>.<culture>`) always come from the scope.
     */
    readonly errors = input<string[] | null | undefined>(undefined);
    /** Overrides the `EF_CONTENT_CULTURES` list for this field. */
    readonly cultures = input<ReadonlyArray<EfCulture> | undefined>(undefined);
    /**
     * The culture on show, two-way (`[(activeCulture)]`). `null` or a culture
     * the field does not list means the default; the field then writes back
     * the culture it settled on, so the parent always reads a listed code.
     * Bind one signal to several inputs to give them one tab row.
     */
    readonly activeCulture = model<string | null>(null);
    /**
     * Draws the culture tab row. Off for a field that follows another
     * field's row through a shared `activeCulture`: its culture is then
     * named to assistive tech through `aria-describedby`, its server errors
     * still move the shared culture, and the hint still names the cultures
     * in error. Its tones, dots and badges are not drawn anywhere.
     */
    readonly showTabs = input(true, { transform: booleanAttribute });
    /** `html` mode only: the sanitised preview under the source. Off when
     *  the screen renders its own preview (an email rendered by the server,
     *  with its tokens filled in). */
    readonly preview = input(true, { transform: booleanAttribute });

    /** The whole new object, trimmed, with blank cultures removed. */
    readonly valueChangeEvent = output<LocalizedText>();

    private readonly contentCultures = inject(EF_CONTENT_CULTURES);
    private readonly readOnlyScope = inject(EfReadOnlyDirective, { optional: true });
    readonly ngControl = inject(NgControl, { self: true, optional: true });
    private readonly serverErrorsScope = inject(EfServerErrorsDirective, { optional: true });
    private readonly richLoader = inject(EF_RICH_TEXT, { optional: true });
    private readonly richType = signal<Type<unknown> | null>(null);
    /** The editor's chunk failed to load (offline, a stale deploy). */
    private readonly richFailed = signal(false);
    private readonly richHost = viewChild('richHost', { read: ViewContainerRef });
    private richRef: ComponentRef<unknown> | null = null;
    private readonly textField = viewChild(EfInputTextComponent);
    private readonly areaField = viewChild(EfTextareaComponent);

    /** `rich` without a provided editor renders the html source instead. */
    protected readonly effectiveMode = computed(() =>
        this.mode() === 'rich' && (!this.richLoader || this.richFailed()) ? 'html' : this.mode(),
    );
    private readonly parentForm = inject(FormGroupDirective, { optional: true }) ?? inject(NgForm, { optional: true });
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly translateService = inject(TranslateService);

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

    protected readonly active = computed<EfCulture | undefined>(() => {
        const list = this.list();
        const code = this.activeCulture();
        return list.find(c => c.code === code) ?? list.find(c => c.code === this.defaultCode()) ?? list[0];
    });

    /** The active culture's code: unlike active(), equal when an equal culture list arrives. */
    private readonly activeCode = computed(() => this.active()?.code);

    /** Server messages for the whole field (`title`). */
    protected readonly fieldErrors = computed(() => {
        const messages = [...(resolveExternalErrors(this.errors(), this.serverErrorsScope, this.name()) ?? []), ...this.unlistedErrors()];
        return messages.length ? messages : null;
    });

    /** Every `<name>.<culture>` message the scope holds. */
    private readonly allCultureErrors = computed(() => this.serverErrorsScope?.errorsWithPrefix(`${this.name()}.`) ?? {});

    /** Server messages per language (`title.ar` gives `ar`), only for listed cultures. */
    private readonly cultureErrors = computed(() => {
        const all = this.allCultureErrors();
        const out: Record<string, string[]> = {};
        for (const c of this.list()) if (all[c.code]) out[c.code] = all[c.code];
        return out;
    });

    /** Messages for a language this field does not list (`title.xx`): shown with the whole field, never dropped. */
    private readonly unlistedErrors = computed(() => {
        const listed = new Set(this.list().map(c => c.code));
        return Object.entries(this.allCultureErrors()).flatMap(([code, messages]) => (listed.has(code) ? [] : messages));
    });

    /** Bumps when texts change, so translated messages follow the language. */
    private readonly textsVersion = signal(0);

    /** The active language's messages, translated once here for the field below. */
    protected readonly activeErrors = computed<string[] | null>(() => {
        this.textsVersion();
        const messages = this.cultureErrors()[this.active()?.code ?? ''];
        return messages?.length ? messages.map(m => this.translateService.instant(m)) : null;
    });

    /** Cultures with a server error, in tab order. */
    private readonly culturesInError = computed(() => this.list().filter(c => this.cultureErrors()[c.code]));

    /** Cultures in error other than the one on show, for the hint under the tabs. */
    protected readonly errorsElsewhere = computed(() => this.culturesInError().filter(c => c.code !== this.active()?.code));

    /** Changes only when the set of errors does, so a tab the user picked stays picked. */
    private readonly errorSignature = computed(() => JSON.stringify(this.cultureErrors()));

    protected readonly tabItems = computed<EfTabItem[]>(() => {
        const text = this.cleaned();
        const base = this.baseline();
        return this.list().map(c => {
            const missing = !text[c.code];
            return {
                value: c.code,
                labelKey: c.labelKey,
                noteKey: missing ? 'ef_localized_input_missing' : undefined,
                tone:
                    this.cultureErrors()[c.code] ||
                    (missing && this.required() && c.code === this.defaultCode() && this.showErrors())
                        ? 'danger'
                        : undefined,
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

    /**
     * What the counter counts. Rich text against `advisedLength` counts the
     * characters a reader sees; against `maxLength` alone it counts the stored
     * HTML, because that is what the server's limit measures.
     */
    protected readonly activeLength = computed(() =>
        this.effectiveMode() === 'rich' && this.advisedLength() != null
            ? plainTextLength(this.activeText())
            : this.activeText().length,
    );

    protected readonly labelId = `${this.uid}-label`;

    protected readonly counterLimit = computed(() => this.advisedLength() ?? this.maxLength());

    protected readonly panelId = `${this.uid}-panel`;
    protected readonly counterId = `${this.uid}-counter`;
    /** The culture's name, read with a field that has no tab row. */
    protected readonly cultureNameId = `${this.uid}-culture`;

    /** Extra `aria-describedby` ids for the active field: the counter, and
     *  the culture's name when no tab says it. */
    protected readonly describedByExtra = computed(() =>
        [this.counterLimit() ? this.counterId : null, this.showTabs() ? null : this.cultureNameId].filter(Boolean).join(' '),
    );

    private onChange: (v: LocalizedText) => void = () => { /* noop */ };
    private touched: () => void = () => { /* noop */ };

    constructor() {
        if (this.ngControl) this.ngControl.valueAccessor = this;
        merge(this.translateService.onLangChange, this.translateService.onTranslationChange)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.textsVersion.update(v => v + 1));
        // The validator reads required and the default culture, which can
        // change without the value changing (tenant cultures arrive late).
        effect(() => {
            this.required();
            this.defaultCode();
            untracked(() => this.ngControl?.control?.updateValueAndValidity({ emitEvent: false }));
        });
        // The parent always reads the culture on show, never null or one
        // the field does not list.
        effect(() => {
            const code = this.activeCode();
            if (code && this.activeCulture() !== code) this.activeCulture.set(code);
        });
        // A new set of server errors brings the first language in error into
        // view, through activeCulture, so a shared tab row follows a field
        // that draws none.
        effect(() => {
            this.errorSignature();
            untracked(() => {
                const first = this.culturesInError()[0];
                if (first) this.activeCulture.set(first.code);
            });
        });
        effect(() => {
            if (this.mode() !== 'rich') return;
            if (!this.richLoader) {
                if (isDevMode()) {
                    console.error(`ef-localized-input "${untracked(this.name)}": mode="rich" needs provideEfRichText() from @elasticias/ui/rich-text; showing the html source instead.`);
                }
                return;
            }
            if (untracked(this.richType) || untracked(this.richFailed)) return;
            this.richLoader()
                .then(t => this.richType.set(t))
                .catch((err: unknown) => {
                    if (isDevMode()) {
                        console.error(`ef-localized-input "${untracked(this.name)}": could not load the rich text editor; showing the html source instead.`, err);
                    }
                    this.richFailed.set(true);
                });
        });
        // One editor per active culture: the @for recreates the host on a
        // culture switch, and the editor is created in it with live bindings.
        effect(() => {
            const vcr = this.richHost();
            const type = this.richType();
            const code = this.activeCode();
            if (!vcr || !type || !code || this.effectiveMode() !== 'rich') return;
            untracked(() => this.createRich(vcr, type, code));
        });
    }

    private createRich(vcr: ViewContainerRef, type: Type<unknown>, code: string): void {
        vcr.clear();
        this.richRef = null;
        const culture = () => this.list().find(c => c.code === code);
        const readOnly = () => this.readOnlyCultures().includes(code);
        this.richRef = vcr.createComponent(type, {
            bindings: [
                inputBinding('value', () => this.raw()[code] ?? ''),
                inputBinding('name', () => `${this.name()}.${code}`),
                inputBinding('inputId', () => this.controlId(code)),
                inputBinding('dir', () => culture()?.dir ?? null),
                inputBinding('lang', () => code),
                inputBinding('rows', () => this.rows()),
                inputBinding('labelledBy', () => (this.labelKey() ? this.labelId : null)),
                inputBinding('required', () => this.required() && code === this.defaultCode()),
                inputBinding('errors', () => this.activeErrors()),
                inputBinding('disabled', () => this.isDisabled()),
                inputBinding('readonly', readOnly),
                inputBinding('placeholderKey', () => this.placeholderKey()),
                inputBinding('hintKey', () => (readOnly() ? 'ef_localized_input_read_only_hint' : this.hintKey())),
                inputBinding('describedByExtra', () => this.describedByExtra()),
                outputBinding<string>('valueChangeEvent', v => this.setText(code, v)),
            ],
        });
    }

    /**
     * Inserts `text` (a `{{token}}`) into the culture on show, at the caret,
     * replacing a selection, or at the end when its field was never entered
     * or was just recreated by a culture switch; then emits the whole object
     * once, as typing would. Returns false, and changes nothing, when the
     * field is disabled, the culture is read-only, the result would pass
     * `maxLength`, or the field is the rich editor (which has no insert yet).
     *
     * A caller tracking "the field last focused" should ignore focus on the
     * culture tabs (`[role="tab"]`): picking a language is not choosing where
     * the token goes.
     */
    insertAtCaret(text: string): boolean {
        const code = this.activeCode();
        if (!code || this.isDisabled() || this.activeReadOnly()) return false;
        const target = (this.effectiveMode() === 'rich' ? this.richRef?.instance : (this.textField() ?? this.areaField())) as
            | { insertAtCursor?: (t: string) => void }
            | undefined;
        if (typeof target?.insertAtCursor !== 'function') return false;
        const before = this.raw()[code] ?? '';
        target.insertAtCursor(text);
        return (this.raw()[code] ?? '') !== before;
    }

    protected tabId(code: string): string {
        return `${this.uid}-tab-${code}`;
    }

    protected controlId(code: string): string {
        return `${this.uid}-${code}`;
    }

    protected select(code: string): void {
        this.activeCulture.set(code);
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
