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
import { PasswordModule } from 'primeng/password';
import { TranslateModule } from '@ngx-translate/core';
import { EfLabelComponent } from '../../layout/ef-label/ef-label.component';
import { AbstractEfFormControl } from '../abstract-ef-form-control.component';

@Component({
  selector: 'ef-password',
  standalone: true,
  templateUrl: './ef-password.component.html',
  styleUrls: ['./ef-password.component.scss'],
  imports: [PasswordModule, FormsModule, TranslateModule, EfLabelComponent],
})
export class EfPasswordComponent
  extends AbstractEfFormControl
  implements ControlValueAccessor
{
  /* identity / label / placeholder / aria / required / readonly / disabled /
     errors (resolvedExternalErrors) / showClear all inherited from
     AbstractEfFormControl. */

  @Input() size?: 'small' | 'large';
  @Input({ transform: booleanAttribute }) fluid = true;
  @Input({ transform: booleanAttribute }) inline = false;
  @Input({ transform: booleanAttribute }) toggleMask = true;
  @Input({ transform: booleanAttribute }) feedback = false;
  @Input() autocomplete?: string;

  @HostBinding('class.ef-inline') get isInline() { return this.inline; }

  @Output() valueChangeEvent = new EventEmitter<string>();

  value = '';

  private onChange: (value: string) => void = () => { /* noop */ };
  private onTouched: () => void = () => { /* noop */ };

  readonly ngControl = inject(NgControl, { self: true, optional: true });

  constructor() {
    super();
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  get showRequired(): boolean {
    const ctrl = this.ngControl?.control;
    return !!(ctrl?.hasError('required') && ctrl?.touched);
  }

  get serverErrors(): string[] | null {
    return this.resolvedExternalErrors() ?? this.ngControl?.control?.errors?.serverError ?? null;
  }

  get isInvalid(): boolean {
    if (this.resolvedExternalErrors()?.length) return true;
    const ctrl = this.ngControl?.control;
    return !!(ctrl?.invalid && (ctrl?.touched || ctrl?.dirty));
  }

  /** Clearable hooks (showClear / canClear inherited from the base). */
  protected override get hasValue(): boolean {
    return !!this.value;
  }

  override clearValue(): void {
    this.handleChange('');
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
    this.valueChangeEvent.emit(value);
  }

  handleBlur(): void {
    this.onTouched();
  }
}
