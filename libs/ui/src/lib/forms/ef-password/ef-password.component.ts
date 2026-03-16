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
import { PasswordModule } from 'primeng/password';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EfLabelComponent } from '../../layout/ef-label/ef-label.component';

@Component({
  selector: 'ef-password',
  standalone: true,
  templateUrl: './ef-password.component.html',
  styleUrls: ['./ef-password.component.scss'],
  imports: [PasswordModule, FormsModule, TranslateModule, EfLabelComponent],
})
export class EfPasswordComponent implements ControlValueAccessor {
  @Input() label?: string;
  @Input() labelKey?: string;
  @Input() inputId?: string;
  @Input() name?: string;
  @Input() placeholder?: string;
  @Input() placeholderKey?: string;
  @Input() size: 'small' | 'large' = 'small';
  @Input({ transform: booleanAttribute }) required: boolean = false;
  @Input({ transform: booleanAttribute }) fluid: boolean = true;
  @Input({ transform: booleanAttribute }) inline: boolean = false;
  @Input({ transform: booleanAttribute }) toggleMask: boolean = true;
  @Input({ transform: booleanAttribute }) feedback: boolean = false;
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

  handleChange(value: string): void {
    this.value = value;
    this.onChange(value);
    this.onValueChange.emit(value);
  }

  handleBlur(): void {
    this.onTouched();
  }
}
