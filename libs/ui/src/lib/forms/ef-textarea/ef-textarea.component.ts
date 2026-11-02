import {
    Component,
    Input,
    Output,
    EventEmitter,
    booleanAttribute,
    inject,
    ElementRef,
    HostListener,
} from '@angular/core';
import { ControlValueAccessor, NgControl, FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { EfLabelComponent } from '../../layout/ef-label/ef-label.component';
import { EfClearButtonComponent } from '../ef-clear-button/ef-clear-button.component';
import { AbstractEfFormControl } from '../abstract-ef-form-control.component';
import { insertAtSelection, placeCaret } from '../insert-at-cursor';

/**
 * Native Comptoir textarea — no PrimeNG wrapper. Pairs with the
 * `.ef-textarea` rule in `@elasticias/ui/styles/patterns` (focus
 * ring, paper-alt bg, rule border).
 *
 * Identity / label / placeholder / aria / required / readonly /
 * disabled inherited from `AbstractEfFormControl`. Implements
 * ControlValueAccessor so it slots into reactive forms AND works
 * with `[(value)]` two-way binding via `(valueChangeEvent)`.
 *
 * ```html
 * <ef-textarea
 *   labelKey="products_details_description_label"
 *   placeholderKey="products_details_description_placeholder"
 *   [rows]="4"
 *   [(value)]="description"
 * />
 * <ef-textarea labelKey="store_pages_details_body_fr" mono [rows]="12" [(value)]="bodyFr" />
 * ```
 */
@Component({
    selector: 'ef-textarea',
    standalone: true,
    templateUrl: './ef-textarea.component.html',
    styleUrl: './ef-textarea.component.scss',
    imports: [FormsModule, TranslateModule, EfLabelComponent, EfClearButtonComponent],
})
export class EfTextareaComponent
    extends AbstractEfFormControl
    implements ControlValueAccessor
{
    @Input() rows = 4;
    @Input() maxlength?: number;
    @Input({ transform: booleanAttribute }) autofocus = false;
    /** Monospace face for source text (an HTML body, a JSON snippet), where
     *  tags and indentation must stay readable. */
    @Input({ transform: booleanAttribute }) mono = false;

    @Output() valueChangeEvent = new EventEmitter<string>();

    /** Two-way-bindable as `[value]` (one-way) or
     *  `[(value)]="signal()"` (set + listen via `valueChangeEvent`). */
    @Input() value = '';

    /** Clearable (showClear / canClear) inherited from AbstractEfFormControl. */
    protected override get hasValue(): boolean {
        return !!this.value;
    }

    override clearValue(): void {
        this.handleInput('');
    }

    private onChange: (value: string) => void = () => {
        /* noop */
    };
    private onTouched: () => void = () => {
        /* noop */
    };

    readonly ngControl = inject(NgControl, { self: true, optional: true });
    private readonly hostRef = inject(ElementRef);

    constructor() {
        super();
        if (this.ngControl) {
            this.ngControl.valueAccessor = this;
        }
    }

    get isInvalid(): boolean {
        if (this.resolvedExternalErrors()?.length) return true;
        const ctrl = this.ngControl?.control;
        return !!ctrl?.invalid && (!!ctrl?.touched || !!ctrl?.dirty);
    }

    get serverErrors(): string[] | null {
        return this.resolvedExternalErrors() ?? this.ngControl?.control?.errors?.['serverError'] ?? null;
    }

    get showRequired(): boolean {
        const ctrl = this.ngControl?.control;
        return !!(ctrl?.hasError('required') && ctrl?.touched);
    }

    writeValue(value: string): void {
        this.value = value ?? '';
    }

    registerOnChange(fn: (value: string) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.updateDisabledState(isDisabled);
    }

    handleInput(value: string): void {
        this.value = value;
        this.onChange(value);
        this.valueChangeEvent.emit(value);
    }

    /** Set once the field itself has had focus; see {@link insertAtSelection}. */
    private wasFocused = false;

    @HostListener('focusin', ['$event'])
    protected markFocused(event: FocusEvent): void {
        // Only the native field counts: focus on the clear button says nothing
        // about where the user left the caret.
        if (event.target === this.nativeField()) this.wasFocused = true;
    }

    /**
     * Inserts `text` at the caret (replacing a selection), or at the end when
     * the field was never focused, then puts the caret after it. Emits the
     * change once, exactly as typing would. Does nothing when read-only or
     * disabled, and refuses the whole insert when the result would pass
     * `maxlength` (a cut placeholder token is worse than none).
     *
     * The value is written programmatically, so the browser's undo history for
     * the field is reset and no DOM `input` event fires; the form control
     * (`onChange`) and `valueChangeEvent` are the contract.
     */
    insertAtCursor(text: string): void {
        if (this.readonly() || this.isDisabled()) return;
        const field = this.nativeField();
        if (!field) return;
        const { value, caret } = insertAtSelection(field, text, this.wasFocused);
        if (this.maxlength != null && value.length > this.maxlength) return;
        // Write the DOM first so the later [value] binding finds it unchanged
        // and leaves the caret where we put it.
        field.value = value;
        this.handleInput(value);
        placeCaret(field, caret);
    }

    private nativeField(): HTMLInputElement | HTMLTextAreaElement | null {
        return (this.hostRef.nativeElement as HTMLElement).querySelector('textarea');
    }

    handleBlur(): void {
        this.onTouched();
    }
}
