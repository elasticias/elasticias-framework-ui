import {
    ChangeDetectionStrategy,
    Component,
    DoCheck,
    ElementRef,
    EventEmitter,
    Output,
    ViewEncapsulation,
    effect,
    inject,
    input,
    linkedSignal,
    signal,
    untracked,
} from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Editor, EditorInitEvent } from 'primeng/editor';
import { AbstractEfFormControl, EfLabelComponent } from '@elasticias/ui';
import { sanitizeRichHtml } from './sanitize-rich-html';

/** The part of Quill this wrapper uses. Quill is never imported here: PrimeNG loads it. */
interface QuillLike {
    root: HTMLElement;
    container: HTMLElement;
    clipboard: { convert(v: { html: string }): unknown };
    setContents(delta: unknown, source?: string): void;
    getSemanticHTML(): string;
    focus(): void;
}

/** What the toolbar can make, so a paste cannot bring in headings, images or colours. */
const FORMATS = ['bold', 'italic', 'underline', 'list', 'link'];

/** Tab leaves the editor instead of inserting a tab or indenting a list (WCAG 2.1.2). */
const LEAVE_ON_TAB = { key: 'Tab', handler: () => true };
const MODULES = {
    keyboard: {
        bindings: {
            tab: LEAVE_ON_TAB,
            'indent code-block': null,
            'outdent code-block': null,
            'remove tab': null,
            indent: { ...LEAVE_ON_TAB, format: ['blockquote', 'indent', 'list'] },
            outdent: { ...LEAVE_ON_TAB, shiftKey: true, format: ['blockquote', 'indent', 'list'] },
        },
    },
};

let nextId = 0;

/**
 * A rich text field: PrimeNG's Editor (Quill 2) with a small toolbar (bold,
 * italic, underline, bulleted and numbered lists, link, clear formatting) and
 * sanitised HTML out (`sanitizeRichHtml`): the toolbar's tags only, safe links,
 * no script, style, class or event attribute, and `''` for an empty editor.
 *
 * It lives in `@elasticias/ui/rich-text` so that only apps that use it bundle
 * the editor and need `quill` (a peer dependency of this entry). PrimeNG loads
 * Quill with a dynamic import the first time an editor renders, so a screen
 * without one never downloads it. `ef-localized-input`'s `rich` mode renders
 * it through `EF_RICH_TEXT`; provide that with `provideEfRichText()`.
 *
 * - `dir` and `lang` apply to the editing area only; the toolbar is page chrome.
 * - Disabled by `[disabled]`, a form's `disable()` or `[efReadOnly]`; `readonly`
 *   keeps the text selectable. The toolbar is disabled with it.
 * - The editing area is a `role="textbox"` named by the label and described
 *   by the hint, the errors and `describedByExtra`.
 * - An incoming value equal to what it last emitted is ignored, so binding
 *   the output back never resets the caret.
 *
 * i18n keys the app's bundles must define (toolbar names and the link bubble,
 * whose Quill texts are otherwise hardcoded English):
 *
 * | key | fr | ar | en |
 * |---|---|---|---|
 * | `ef_rich_text_bold` | Gras | غامق | Bold |
 * | `ef_rich_text_italic` | Italique | مائل | Italic |
 * | `ef_rich_text_underline` | Souligné | تسطير | Underline |
 * | `ef_rich_text_bullet_list` | Liste à puces | قائمة نقطية | Bulleted list |
 * | `ef_rich_text_ordered_list` | Liste numérotée | قائمة مرقمة | Numbered list |
 * | `ef_rich_text_link` | Lien | رابط | Link |
 * | `ef_rich_text_clean` | Effacer la mise en forme | مسح التنسيق | Clear formatting |
 * | `ef_rich_text_toolbar` | Mise en forme | التنسيق | Formatting |
 * | `ef_rich_text_link_enter` | Adresse du lien : | عنوان الرابط: | Link address: |
 * | `ef_rich_text_link_visit` | Ouvrir : | فتح: | Open: |
 * | `ef_rich_text_link_edit` | Modifier | تعديل | Edit |
 * | `ef_rich_text_link_remove` | Retirer | إزالة | Remove |
 * | `ef_rich_text_link_save` | Enregistrer | حفظ | Save |
 *
 * ```html
 * <ef-rich-text name="description" labelKey="product_description" dir="rtl" lang="ar"
 *     [value]="html()" (valueChangeEvent)="html.set($event)" />
 * ```
 */
@Component({
    selector: 'ef-rich-text',
    standalone: true,
    imports: [TranslateModule, Editor, EfLabelComponent],
    templateUrl: './ef-rich-text.component.html',
    styleUrl: './ef-rich-text.component.scss',
    // Quill builds its toolbar and editing area outside Angular's templates,
    // so the rules are global and every selector starts with ef-rich-text.
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { '[style.--ef-rich-text-rows]': 'rows()' },
})
export class EfRichTextComponent extends AbstractEfFormControl implements ControlValueAccessor, DoCheck {
    readonly value = input<string | null | undefined>('');
    /** Direction of the text (`rtl` for Arabic), on the editing area only. */
    readonly dir = input<'ltr' | 'rtl' | 'auto' | null>(null);
    /** Language of the text, on the editing area only. */
    readonly lang = input<string | null>(null);
    /** Id(s) naming the editing area when the label is rendered elsewhere
     *  (`ef-localized-input` draws one label above its culture tabs). */
    readonly labelledBy = input<string | null>(null);
    /** Visible height of the editing area, in lines. */
    readonly rows = input(4);

    /** Sanitised HTML, `''` when the editor holds no text. */
    @Output() readonly valueChangeEvent = new EventEmitter<string>();

    readonly ngControl = inject(NgControl, { self: true, optional: true });
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    protected readonly formats = FORMATS;
    protected readonly modules = MODULES;
    protected readonly labelId = `ef-rich-text-${nextId++}-label`;

    private readonly current = linkedSignal(() => this.value() ?? '');
    private readonly quill = signal<QuillLike | null>(null);
    private lastEmitted: string | null = null;

    private onChange: (v: string) => void = () => { /* noop */ };
    private onTouched: () => void = () => { /* noop */ };

    constructor() {
        super();
        if (this.ngControl) this.ngControl.valueAccessor = this;
        effect(() => {
            const html = this.current();
            const q = this.quill();
            if (q) untracked(() => this.apply(q, html));
        });
    }

    get isInvalid(): boolean {
        if (this.resolvedExternalErrors()?.length) return true;
        const c = this.ngControl?.control;
        return !!(c?.invalid && (c.touched || c.dirty));
    }

    get serverErrors(): string[] | null {
        return this.resolvedExternalErrors() ?? null;
    }

    get showRequired(): boolean {
        const c = this.ngControl?.control;
        return !!(c?.hasError('required') && c.touched);
    }

    /** Read-only or disabled: Quill and the toolbar stop editing. */
    protected locked(): boolean {
        return this.isDisabled() || this.readonly();
    }

    protected onInit(event: EditorInitEvent): void {
        const q = event.editor as QuillLike;
        this.decorate(q);
        this.quill.set(q);
    }

    protected onTextChange(): void {
        const q = this.quill();
        if (!q) return;
        const html = sanitizeRichHtml(q.getSemanticHTML());
        if (html === this.lastEmitted) return;
        this.lastEmitted = html;
        this.current.set(html);
        this.onChange(html);
        this.valueChangeEvent.emit(html);
    }

    protected handleBlur(): void {
        this.onTouched();
    }

    ngDoCheck(): void {
        const q = this.quill();
        if (q) this.decorate(q);
    }

    writeValue(v: string | null): void {
        this.current.set(v ?? '');
    }

    registerOnChange(fn: (v: string) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(disabled: boolean): void {
        this.updateDisabledState(disabled);
    }

    /** Replaces the content unless it is our own echo or the same HTML. */
    private apply(q: QuillLike, html: string): void {
        if (html === this.lastEmitted) return;
        if (sanitizeRichHtml(html) === sanitizeRichHtml(q.getSemanticHTML())) return;
        q.setContents(q.clipboard.convert({ html }), 'silent');
    }

    /** ARIA, direction and language on the editing area; translated link bubble. */
    private decorate(q: QuillLike): void {
        const root = q.root;
        const set = (name: string, value: string | null) => {
            if (value === null) root.removeAttribute(name);
            else if (root.getAttribute(name) !== value) root.setAttribute(name, value);
        };
        set('role', 'textbox');
        set('aria-multiline', 'true');
        set('id', this.effectiveId);
        set('aria-labelledby', this.labelKey() || this.label() ? this.labelId : this.labelledBy());
        set('aria-label', this.effectiveAriaLabel);
        set('aria-describedby', this.describedBy(this.showRequired || !!this.serverErrors));
        set('aria-required', this.required() ? 'true' : null);
        set('aria-invalid', this.isInvalid ? 'true' : null);
        set('aria-readonly', this.locked() ? 'true' : null);
        set('dir', this.dir());
        set('lang', this.lang());

        const t = (key: string) => this.translateService.instant(key);
        const tooltip = this.host.nativeElement.querySelector<HTMLElement>('.ql-tooltip');
        if (tooltip) {
            tooltip.dataset['efEnter'] = t('ef_rich_text_link_enter');
            tooltip.dataset['efVisit'] = t('ef_rich_text_link_visit');
            const action = tooltip.querySelector<HTMLElement>('a.ql-action');
            if (action) {
                action.dataset['efEdit'] = t('ef_rich_text_link_edit');
                action.dataset['efSave'] = t('ef_rich_text_link_save');
            }
            const remove = tooltip.querySelector<HTMLElement>('a.ql-remove');
            if (remove) remove.dataset['efRemove'] = t('ef_rich_text_link_remove');
            tooltip.querySelector('input')?.setAttribute('data-link', 'https://');
        }
    }
}
