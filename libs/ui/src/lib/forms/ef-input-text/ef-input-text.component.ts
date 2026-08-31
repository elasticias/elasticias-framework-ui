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
import { InputTextModule } from 'primeng/inputtext';
import { TranslateModule } from '@ngx-translate/core';
import { EfLabelComponent } from '../../layout/ef-label/ef-label.component';
import { EfClearButtonComponent } from '../ef-clear-button/ef-clear-button.component';
import { AbstractEfFormControl } from '../abstract-ef-form-control.component';

@Component({
  selector: 'ef-input-text',
  standalone: true,
  templateUrl: './ef-input-text.component.html',
  styleUrls: ['./ef-input-text.component.scss'],
  imports: [InputTextModule, FormsModule, TranslateModule, EfLabelComponent, EfClearButtonComponent],
})
export class EfInputTextComponent
  extends AbstractEfFormControl
  implements ControlValueAccessor
{
  /* Identity / label / placeholder / aria / required / readonly /
     disabled all inherited from AbstractEfFormControl. */

  @Input() size: 'small' | 'large' = 'small';
  @Input() type = 'text';
  @Input() maxlength?: number;
  @Input({ transform: booleanAttribute }) fluid = true;
  @Input({ transform: booleanAttribute }) inline = false;
  @Input() autocomplete?: string;

  /** Clearable (showClear / canClear) is inherited from AbstractEfFormControl;
   *  we only supply the value predicate + the reset. */
  protected override get hasValue(): boolean {
    return !!this.value;
  }

  override clearValue(): void {
    this.handleInput('');
  }

  /**
   * Rendering variant — same dual-mode pattern as `ef-button`.
   * - `'comptoir'` (default) — native `<input class="ef-input">` against
   *                           the Comptoir pattern styles. Renders at the
   *                           canonical `--hit-base` (40px) control height.
   *                           Required for `prefix` / `suffix`.
   * - `'primeng'`            — wraps `<input pInputText>` (v1). Opt in when
   *                           you specifically need PrimeNG input behaviour.
   * See ADR-009 for why comptoir is the height-consistent default.
   */
  @Input() variant: 'primeng' | 'comptoir' = 'comptoir';

  /** Inline prefix addon — e.g. `'/p/'` for slugs, `'$'` for prices.
   *  Renders only in the Comptoir variant; ignored otherwise. */
  @Input() prefix?: string;

  /** Inline suffix addon — e.g. `'MAD'`, `'cm'`. Renders only in the
   *  Comptoir variant; ignored otherwise. */
  @Input() suffix?: string;

  @HostBinding('class.ef-inline') get isInline() { return this.inline; }

  @Output() valueChangeEvent = new EventEmitter<string>();

  /** Two-way-bindable as `[value]` (one-way) or
   *  `[(value)]="signal()"` (set + listen via `valueChangeEvent`). */
  @Input() value = '';

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
    return this.resolvedExternalErrors() ?? this.ngControl?.control?.errors?.['serverError'] ?? null;
  }

  get isInvalid(): boolean {
    if (this.resolvedExternalErrors()?.length) return true;
    const ctrl = this.ngControl?.control;
    return !!(ctrl?.invalid && (ctrl?.touched || ctrl?.dirty));
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

  handleBlur(): void {
    this.onTouched();
  }
}
