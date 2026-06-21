import {
    Component,
    Input,
    Output,
    EventEmitter,
    booleanAttribute,
    inject,
} from '@angular/core';
import { ControlValueAccessor, NgControl, FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { EfLabelComponent } from '../../layout/ef-label/ef-label.component';
import { EfClearButtonComponent } from '../ef-clear-button/ef-clear-button.component';
import { AbstractEfFormControl } from '../abstract-ef-form-control.component';

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
 * ```
 */
@Component({
    selector: 'ef-textarea',
    standalone: true,
    templateUrl: './ef-textarea.component.html',
    imports: [FormsModule, TranslateModule, EfLabelComponent, EfClearButtonComponent],
})
export class EfTextareaComponent
    extends AbstractEfFormControl
    implements ControlValueAccessor
{
    @Input() rows = 4;
    @Input() maxlength?: number;
    @Input({ transform: booleanAttribute }) autofocus = false;

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
        this.disabled = isDisabled;
    }

    handleInput(value: string): void {
        this.value = value;
        this.onChange(value);
        this.valueChangeEvent.emit(value);
    }

    handleBlur(): void {
        this.onTouched();
    }
}
