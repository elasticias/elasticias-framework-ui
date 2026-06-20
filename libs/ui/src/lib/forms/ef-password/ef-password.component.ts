import {
  booleanAttribute,
  Component,
  computed,
  HostBinding,
  inject,
  input,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { ControlValueAccessor, NgControl, FormsModule } from '@angular/forms';
import { PasswordModule } from 'primeng/password';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EfLabelComponent } from '../../layout/ef-label/ef-label.component';
import { EfServerErrorsDirective, resolveExternalErrors } from '../ef-server-errors.directive';

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
  /** Default (undefined) = canonical `--hit-base` (40px); `'small'` = dense 32px. */
  @Input() size?: 'small' | 'large';
  @Input({ transform: booleanAttribute }) required = false;
  @Input({ transform: booleanAttribute }) fluid = true;
  @Input({ transform: booleanAttribute }) inline = false;
  @Input({ transform: booleanAttribute }) toggleMask = true;
  @Input({ transform: booleanAttribute }) feedback = false;
  @Input() autocomplete?: string;

  @HostBinding('class.ef-inline') get isInline() { return this.inline; }

  @Output() valueChangeEvent = new EventEmitter<string>();

  value = '';
  disabled = false;

  /** External (server) errors — explicit `[errors]` input or the enclosing
   *  `[efServerErrors]` scope keyed by `name`. See {@link EfServerErrorsDirective}. */
  readonly errors = input<string[] | null | undefined>(undefined);
  private readonly serverErrorsScope = inject(EfServerErrorsDirective, { optional: true });
  readonly resolvedExternalErrors = computed<string[] | null>(() =>
    resolveExternalErrors(this.errors(), this.serverErrorsScope, this.name),
  );

  private onChange: (value: string) => void = () => { /* noop */ };
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
    return this.resolvedExternalErrors() ?? this.ngControl?.control?.errors?.serverError ?? null;
  }

  get isInvalid(): boolean {
    if (this.resolvedExternalErrors()?.length) return true;
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
    this.valueChangeEvent.emit(value);
  }

  handleBlur(): void {
    this.onTouched();
  }
}
