import {
  booleanAttribute,
  Component,
  HostBinding,
  Input,
  Output,
  EventEmitter,
  Self,
  Optional,
} from '@angular/core';
import { ControlValueAccessor, NgControl, FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EfLabelComponent } from '../../layout/ef-label/ef-label.component';

@Component({
  selector: 'ef-input-text',
  standalone: true,
  templateUrl: './ef-input-text.component.html',
  styleUrls: ['./ef-input-text.component.scss'],
  imports: [InputTextModule, FormsModule, TranslateModule, EfLabelComponent],
})
export class EfInputTextComponent implements ControlValueAccessor {
  @Input() label?: string;
  @Input() labelKey?: string;
  @Input() inputId?: string;
  @Input() name?: string;
  @Input() placeholder?: string;
  @Input() placeholderKey?: string;
  @Input() size: 'small' | 'large' = 'small';
  @Input() type: string = 'text';
  @Input() maxlength?: number;
  @Input({ transform: booleanAttribute }) readonly: boolean = false;
  @Input({ transform: booleanAttribute }) required: boolean = false;
  @Input({ transform: booleanAttribute }) fluid: boolean = true;
  @Input({ transform: booleanAttribute }) inline: boolean = false;
  @Input() autocomplete?: string;

  @HostBinding('class.ef-inline') get isInline() { return this.inline; }

  @Output() onValueChange = new EventEmitter<string>();

  value: string = '';
  disabled: boolean = false;

  private onChange: (value: string) => void = () => {};
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
    return ctrl?.invalid && (ctrl?.touched || ctrl?.dirty);
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
    this.onValueChange.emit(value);
  }

  handleBlur(): void {
    this.onTouched();
  }
}
