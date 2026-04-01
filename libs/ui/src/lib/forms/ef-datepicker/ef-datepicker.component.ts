import {
  booleanAttribute,
  Component,
  HostBinding,
  inject,
  Input,
  Output,
  EventEmitter,
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
  @Input({ transform: booleanAttribute }) required = false;
  @Input({ transform: booleanAttribute }) fluid = true;
  @Input({ transform: booleanAttribute }) inline = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) showIcon = true;
  @Input() iconDisplay: 'input' | 'button' = 'input';
  @Input() selectionMode: 'single' | 'multiple' | 'range' = 'single';
  @Input() dateFormat?: string;
  @Input() appendTo?: string;
  @Input({ transform: booleanAttribute }) showTime = false;
  @Input({ transform: booleanAttribute }) showButtonBar = false;
  @Input() minDate?: Date;
  @Input() maxDate?: Date;

  @HostBinding('class.ef-inline') get isInline() { return this.inline; }

  @Output() dateSelectEvent = new EventEmitter<any>();

  value: any = null;

  private onChange: (value: any) => void = () => { /* noop */ };
  private onTouched: () => void = () => { /* noop */ };

  readonly ngControl = inject(NgControl, { self: true, optional: true });
  private readonly translateService = inject(TranslateService);

  constructor() {
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
    this.dateSelectEvent.emit(value);
  }

  handleBlur(): void {
    this.onTouched();
  }
}
