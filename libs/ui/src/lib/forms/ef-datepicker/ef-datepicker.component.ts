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
import { DatePickerModule } from 'primeng/datepicker';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EfLabelComponent } from '../../layout/ef-label/ef-label.component';

@Component({
  selector: 'ef-datepicker',
  standalone: true,
  templateUrl: './ef-datepicker.component.html',
  styleUrls: ['./ef-datepicker.component.scss'],
  imports: [DatePickerModule, FormsModule, TranslateModule, EfLabelComponent],
})
export class EfDatepickerComponent implements ControlValueAccessor {
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
  @Input({ transform: booleanAttribute }) disabled: boolean = false;
  @Input({ transform: booleanAttribute }) showIcon: boolean = true;
  @Input() iconDisplay: 'input' | 'button' = 'input';
  @Input() selectionMode: 'single' | 'multiple' | 'range' = 'single';
  @Input() dateFormat?: string;
  @Input() appendTo?: string;
  @Input({ transform: booleanAttribute }) showTime: boolean = false;
  @Input({ transform: booleanAttribute }) showButtonBar: boolean = false;
  @Input() minDate?: Date;
  @Input() maxDate?: Date;

  @HostBinding('class.ef-inline') get isInline() { return this.inline; }

  @Output() onDateSelect = new EventEmitter<any>();

  value: any = null;

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
    return ctrl?.invalid && (ctrl?.touched || ctrl?.dirty);
  }

  writeValue(value: any): void {
    this.value = value;
  }

  registerOnChange(fn: (value: any) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  handleChange(value: any): void {
    this.value = value;
    this.onChange(value);
    this.onDateSelect.emit(value);
  }

  handleBlur(): void {
    this.onTouched();
  }
}
