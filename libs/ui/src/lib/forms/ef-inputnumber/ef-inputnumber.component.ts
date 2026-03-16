import {
  booleanAttribute,
  Component,
  HostBinding,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  Self,
  Optional,
} from '@angular/core';
import { ControlValueAccessor, NgControl, FormsModule } from '@angular/forms';
import {
  InputNumber,
  InputNumberInputEvent,
  InputNumberModule,
} from 'primeng/inputnumber';
import { Nullable } from 'primeng/ts-helpers';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EfLabelComponent } from '../../layout/ef-label/ef-label.component';

@Component({
  selector: 'ef-inputnumber',
  standalone: true,
  templateUrl: './ef-inputnumber.component.html',
  styleUrls: ['./ef-inputnumber.component.scss'],
  imports: [InputNumberModule, FormsModule, TranslateModule, EfLabelComponent],
})
export class EfInputNumberComponent implements ControlValueAccessor {
  @ViewChild('inputNumber', { static: false }) inputNumber?: InputNumber;

  // ============================================================================
  // LABEL & VALIDATION
  // ============================================================================

  @Input() label?: string;
  @Input() labelKey?: string;
  @Input({ transform: booleanAttribute }) required: boolean = false;

  // ============================================================================
  // VALUE & MODEL
  // ============================================================================

  @Input() value?: Nullable<number>;
  @Input() invalid: boolean = false;
  @Input() disabled?: boolean;
  @Input() readonly: boolean = false;

  // ============================================================================
  // FORMAT & DISPLAY
  // ============================================================================

  @Input() format: boolean = true;
  @Input() showButtons: boolean = false;
  @Input() buttonLayout: 'stacked' | 'horizontal' | 'vertical' = 'stacked';
  @Input() incrementButtonClass?: string;
  @Input() decrementButtonClass?: string;
  @Input() incrementButtonIcon?: string;
  @Input() decrementButtonIcon?: string;
  @Input() prefix?: string;
  @Input() suffix?: string;
  @Input() currency?: string;
  @Input() currencyDisplay?: string;
  @Input() locale?: string;
  @Input() localeMatcher?: 'lookup' | 'best fit';
  @Input() mode: 'decimal' | 'currency' = 'decimal';
  @Input() useGrouping: boolean = true;
  @Input() minFractionDigits?: number;
  @Input() maxFractionDigits?: number;

  // ============================================================================
  // CONSTRAINTS
  // ============================================================================

  @Input() min?: number;
  @Input() max?: number;
  @Input() step: number = 1;
  @Input() allowEmpty: boolean = true;

  // ============================================================================
  // INPUT ATTRIBUTES
  // ============================================================================

  @Input() inputId?: string;
  @Input() name?: string;
  @Input() placeholder?: string;
  @Input() placeholderKey?: string;
  @Input() inputSize?: number;
  @Input() size?: 'small' | 'large' = 'small';
  @Input() maxlength?: number;
  @Input() minlength?: number;
  @Input() pattern?: string;
  @Input() tabindex?: number;
  @Input() title?: string;
  @Input() ariaLabel?: string;
  @Input() ariaLabelledBy?: string;
  @Input() ariaDescribedBy?: string;
  @Input() ariaRequired?: boolean;
  @Input() inputStyle?: any;
  @Input() inputStyleClass?: string;
  @Input() style?: any;
  @Input() styleClass?: string;
  @Input() showClear: boolean = false;
  @Input() variant?: 'filled' | 'outlined';
  @Input() autofocus?: boolean;
  @Input() autocomplete?: string;
  @Input() fluid?: boolean = true;
  @Input({ transform: booleanAttribute }) inline: boolean = false;

  @HostBinding('class.ef-inline') get isInline() { return this.inline; }

  // ============================================================================
  // STYLING & CUSTOMIZATION
  // ============================================================================

  @Input() pt?: any;
  @Input() ptOptions?: any;
  @Input() dt?: any;
  @Input() unstyled?: boolean;

  // ============================================================================
  // EVENTS
  // ============================================================================

  @Output() onInput = new EventEmitter<InputNumberInputEvent>();
  @Output() onFocus = new EventEmitter<Event>();
  @Output() onBlur = new EventEmitter<Event>();
  @Output() onKeyDown = new EventEmitter<KeyboardEvent>();
  @Output() onClear = new EventEmitter<void>();

  // ============================================================================
  // CONTROL VALUE ACCESSOR
  // ============================================================================

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(@Self() @Optional() public ngControl: NgControl, private translateService: TranslateService) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  get effectivePlaceholder(): string {
    return this.placeholderKey ? this.translateService.instant(this.placeholderKey) : (this.placeholder ?? '');
  }

  get effectiveId(): string {
    return this.inputId ?? this.name ?? '';
  }

  get showRequired(): boolean {
    const ctrl = this.ngControl?.control;
    return ctrl?.hasError('required') && ctrl?.touched;
  }

  get serverErrors(): string[] | null {
    return this.ngControl?.control?.errors?.serverError ?? null;
  }

  get isInvalid(): boolean {
    const ctrl = this.ngControl?.control;
    return this.invalid || (ctrl?.invalid && (ctrl?.touched || ctrl?.dirty));
  }

  writeValue(value: any): void {
    this.value = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  handleInput(event: InputNumberInputEvent): void {
    this.value = event.value;
    this.onChange(event.value);
    this.onInput.emit(event);
  }

  handleFocus(event: Event): void {
    this.onFocus.emit(event);
  }

  handleBlur(event: Event): void {
    this.onTouched();
    this.onBlur.emit(event);
  }

  handleKeyDown(event: KeyboardEvent): void {
    this.onKeyDown.emit(event);
  }

  handleClear(): void {
    this.value = null;
    this.onChange(null);
    this.onClear.emit();
  }

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  focus(): void {
    this.inputNumber?.input?.nativeElement?.focus();
  }

  clear(): void {
    if (this.inputNumber) {
      this.inputNumber.clear();
      this.handleClear();
    }
  }
}
