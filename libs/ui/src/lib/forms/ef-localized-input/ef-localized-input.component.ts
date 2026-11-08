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

/** What one input's tab for a culture would show; read by the input that draws a shared row. */
export interface EfLocalizedCultureFlags {
    /** Danger tone: a server error, or the required default culture left empty once touched. */
    readonly error: boolean;
    /** A server error under `<name>.<culture>` (what moves the shared culture). */
    readonly serverError: boolean;
    /** Edited since the value arrived. */
    readonly dirty: boolean;
}

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
 *   on all but one, and list those in the row owner's `[linkedInputs]` so
 *   the row also shows their error tone, required tone and dirty dot. A new
 *   set of server errors moves the shared culture to the first culture in
 *   error in the row's order.
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
 *   is empty, and once the field is touched, changed or submitted the default
 *   culture's field shows `validation.required` and is `aria-invalid`.
 * - **Server errors** (ADR-010) come from the enclosing `[efServerErrors]`
 *   scope. `<name>.<culture>` errors tint that culture's tab, show under its
 *   field while it is active (the field links itself by name) and, from another
 *   tab, show as a hint naming the languages in error; a new set of errors
 *   moves to the first of them. `<name>` errors, or an explicit `[errors]`,
 *   show under the field on every tab, as do errors for a language the field
 *   does not list (`title.xx`), prefixed with that language's name (or its
 *   code) through `ef_localized_input_error_in_culture`. Messages are
 *   translated as keys. Keys: `ef_localized_input_errors_in_other`,
 *   `ef_localized_input_error_in_culture`.
 * - **Counter.** With `advisedLength` it reads as advice through
 *   `ef_localized_input_counter_advised` (`{{count}}`, `{{max}}`), so 5123 of
 *   5000 does not look like a cap; with `maxLength` alone it stays `n / max`.
 * - **Spoken limit.** `counterHintKey` is read with the counter (through
 *   `aria-describedby`) and `counterOverKey` is announced politely when the
 *   text passes the limit; both take `{{max}}`. On a field with several
 *   cultures the announcement is prefixed with the culture's name through
 *   `ef_localized_input_error_in_culture`, so `counterOverKey` should not
 *   name it.
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
 * | `ef_localized_input_counter_advised` | {{count}} / {{max}} conseillés | {{count}} / {{max}} موصى بها | {{count}} / {{max}} advised |
 * | `ef_localized_input_error_in_culture` | {{culture}} : {{message}} | {{culture}}: {{message}} | {{culture}}: {{message}} |
 * | `ef_localized_input_read_only_hint` | Ce texte se modifie ailleurs. | يُعدَّل هذا النص في مكان آخر. | This text is edited elsewhere. |
 *
 * ```html
 * <ef-localized-input name="title" labelKey="product_title" required
 *     [value]="product().title" (valueChangeEvent)="patch({ title: $event })"
 *     [advisedLength]="60" [maxLength]="256" />
 *
 * <ef-localized-input name="subject" labelKey="email_subject" [maxLength]="200" [linkedInputs]="[body]" [(activeCulture)]="culture" ... />
 * <ef-localized-input #body name="htmlBody" labelKey="email_body" mode="html" [showTabs]="false" [(activeCulture)]="culture" ... />
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
     * named to assistive tech through `aria-describedby` and the hint still
     * names the cultures in error. List it in the row owner's
     * `linkedInputs` so the row draws its error tone, required tone and
     * dirty dot too. Without tabs it never rewrites `activeCulture` to fit
     * its own culture list (it shows its own fallback instead), and it moves
     * the shared culture to its first culture in error only when no row
     * owner links it.
     */
    readonly showTabs = input(true, { transform: booleanAttribute });
    /**
     * On the input that draws the shared tab row: the inputs that follow it
     * (`[showTabs]="false"`), whose `cultureFlags` the row merges into its
     * tones and dots. A new set of server errors on any of them moves the
     * shared culture to the first culture in error in this row's order.
     * Badges stay this input's own. A template reference works forward:
     * `<ef-localized-input [linkedInputs]="[body]" ... /> <ef-localized-input #body [showTabs]="false" ... />`.
     */
    readonly linkedInputs = input<ReadonlyArray<EfLocalizedInputComponent>>([]);
    /** `html` mode only: the sanitised preview under the source. Off when
     *  the screen renders its own preview (an email rendered by the server,
     *  with its tokens filled in). */
    readonly preview = input(true, { transform: booleanAttribute });
    /** A badge per culture tab, culture code to i18n key (`{ ar:
     *  'email_templates_customized' }`): a state of that language worth
     *  seeing from the tab row. Drawn by the input that shows the tabs. */
    readonly tabBadges = input<Readonly<Record<string, string>>>({});

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

    /** Server messages for the whole field (`title`), and those of unlisted
     *  cultures, translated here (never through the pipe a second time). */
    protected readonly fieldErrors = computed(() => {
        this.textsVersion();
        const t = (key: string) => this.translateService.instant(key);
        const messages = [
            ...(resolveExternalErrors(this.errors(), this.serverErrorsScope, this.name()) ?? []).map(t),
            ...this.unlistedErrors(),
        ];
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

    /** Messages for a language this field does not list (`title.xx`): shown
     *  with the whole field, never dropped, prefixed with the culture
     *  (`xx : message`) since no tab says which language they concern. */
    private readonly unlistedErrors = computed(() => {
        this.textsVersion();
        const t = this.translateService;
        const listed = new Set(this.list().map(c => c.code));
        return Object.entries(this.allCultureErrors()).flatMap(([code, messages]) => {
            if (listed.has(code)) return [];
            // The culture's name when the bundle has one, else its code.
            const nameKey = `ef_localized_input_culture_${code}`;
            const name = t.instant(nameKey);
            const culture = name && name !== nameKey ? name : code;
            return messages.map(m => t.instant('ef_localized_input_error_in_culture', { culture, message: t.instant(m) }));
        });
    });

    /** Bumps when texts change, so translated messages follow the language. */
    private readonly textsVersion = signal(0);

    /**
     * The active language's messages, translated once here for the field
     * below. Without one, a required default culture left empty says so
     * once the field is touched, changed or submitted (`validation.required`,
     * the family's message), which also sets `aria-invalid` on it.
     */
    protected readonly activeErrors = computed<string[] | null>(() => {
        this.textsVersion();
        const code = this.active()?.code ?? '';
        const messages = this.cultureErrors()[code];
        if (messages?.length) return messages.map(m => this.translateService.instant(m));
        if (this.requiredTone(code)) {
            return [this.translateService.instant('validation.required')];
        }
        return null;
    });

    /** Cultures with a server error, in tab order. */
    private readonly culturesInError = computed(() => this.list().filter(c => this.cultureErrors()[c.code]));

    /** Cultures in error other than the one on show, for the hint under the tabs. */
    protected readonly errorsElsewhere = computed(() => this.culturesInError().filter(c => c.code !== this.active()?.code));

    /** Changes only when the set of errors does, so a tab the user picked stays picked. */
    private readonly errorSignature = computed(() => {
        const own = JSON.stringify(this.cultureErrors());
        if (!this.showTabs()) return own;
        const linked = this.linkedInputs().map(l =>
            Object.entries(l.cultureFlags()).filter(([, f]) => f.serverError).map(([code]) => code),
        );
        return JSON.stringify([own, linked]);
    });

    /** How many row owners list this input in their `linkedInputs`. */
    private readonly linkedBy = signal(0);

    /** Danger tone on the default culture: required, empty, and touched, changed or submitted. */
    private requiredTone(code: string): boolean {
        return this.required() && code === this.defaultCode() && !this.cleaned()[code] && this.showErrors();
    }

    /**
     * What this input's tab would show for each culture it lists, read by
     * the input that draws a shared row (`linkedInputs`). Read-only.
     */
    readonly cultureFlags = computed<Readonly<Record<string, EfLocalizedCultureFlags>>>(() => {
        const text = this.cleaned();
        const base = this.baseline();
        const errors = this.cultureErrors();
        const out: Record<string, EfLocalizedCultureFlags> = {};
        for (const c of this.list()) {
            const serverError = !!errors[c.code];
            out[c.code] = {
                error: serverError || this.requiredTone(c.code),
                serverError,
                dirty: (text[c.code] ?? '') !== (base[c.code] ?? ''),
            };
        }
        return out;
    });

    protected readonly tabItems = computed<EfTabItem[]>(() => {
        const text = this.cleaned();
        const badges = this.tabBadges() ?? {};
        const flags = [this.cultureFlags(), ...this.linkedInputs().map(l => l.cultureFlags())];
        return this.list().map(c => {
            const missing = !text[c.code];
            return {
                value: c.code,
                labelKey: c.labelKey,
                noteKey: missing ? 'ef_localized_input_missing' : undefined,
                badgeKey: badges[c.code] || undefined,
                tone: flags.some(f => f[c.code]?.error) ? 'danger' : undefined,
                dirty: flags.some(f => f[c.code]?.dirty),
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

    /**
     * The polite over-limit announcement: empty under the limit, else the
     * `counterOverKey` text, prefixed with the culture's name when the field
     * has more than one. Its text changes only with the (culture, over)
     * pair, so typing past the limit is announced once, and a switch to
     * another language that is also over is announced and names it.
     */
    protected readonly overMessage = computed(() => {
        this.textsVersion();
        const key = this.counterOverKey();
        const limit = this.counterLimit();
        const culture = this.active();
        if (!key || limit == null || !culture || this.activeLength() <= limit) return '';
        const message = this.translateService.instant(key, { max: limit });
        if (this.list().length < 2) return message;
        return this.translateService.instant('ef_localized_input_error_in_culture', {
            culture: this.translateService.instant(culture.labelKey),
            message,
        });
    });

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
        // The parent always reads the culture on show, never null or one the
        // row does not list. Only the input that draws tabs writes it back:
        // two inputs with different lists would otherwise keep overwriting
        // each other.
        effect(() => {
            const code = this.activeCode();
            if (this.showTabs() && code && this.activeCulture() !== code) this.activeCulture.set(code);
        });
        // A row owner tells the inputs it links, so they leave the error jump to it.
        effect(onCleanup => {
            const linked = this.showTabs() ? this.linkedInputs() : [];
            for (const l of linked) l.linkedBy.update(n => n + 1);
            onCleanup(() => {
                for (const l of linked) l.linkedBy.update(n => n - 1);
            });
        });
        // A new set of server errors brings the first language in error into
        // view, through activeCulture. The row owner picks it in its own tab
        // order across itself and its linked inputs; an input without tabs
        // that no owner links moves it itself.
        effect(() => {
            this.errorSignature();
            untracked(() => {
                if (!this.showTabs() && this.linkedBy() > 0) return;
                const linked = this.showTabs() ? this.linkedInputs() : [];
                const first = this.list().find(
                    c => this.cultureErrors()[c.code] || linked.some(l => l.cultureFlags()[c.code]?.serverError),
                );
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
