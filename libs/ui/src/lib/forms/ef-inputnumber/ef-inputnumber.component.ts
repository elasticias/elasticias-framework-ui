import {
  booleanAttribute,
  Component,
  HostBinding,
  inject,
  Input,
  Output,
  EventEmitter,
  ViewChild,
} from '@angular/core';
import { ControlValueAccessor, NgControl, FormsModule } from '@angular/forms';
import {
  InputNumber,
  InputNumberInputEvent,
  InputNumberModule,
} from 'primeng/inputnumber';
import { Nullable } from 'primeng/ts-helpers';
import { TranslateModule } from '@ngx-translate/core';
import { EfLabelComponent } from '../../layout/ef-label/ef-label.component';
import { AbstractEfFormControl } from '../abstract-ef-form-control.component';

/**
 * Comptoir number input.
 *
 * Two render variants share the same API:
 * - `'primeng'` (default) — wraps `p-inputnumber`. Full locale-aware
 *   currency / decimal formatting, stepper buttons, prefix / suffix.
 * - `'comptoir'`          — native `<input type="number">` styled
 *   against `.ef-input` / `.ef-input-group`. Lean, no locale
 *   formatting; pair with `suffix="MAD"` for unit display in dense
 *   grids (variants table, inventory adjustments, etc.).
 *
 * Identity / label / placeholder / aria / required / readonly /
 * disabled are inherited from `AbstractEfFormControl`.
 *
 * ```html
 * <ef-inputnumber
 *   labelKey="catalog.price"
 *   variant="primeng"
 *   mode="currency" currency="MAD" locale="fr-MA"
 *   [(value)]="variant.price" />
 *
 * <ef-inputnumber
 *   labelKey="catalog.inventory"
 *   variant="comptoir"
 *   [showButtons]="true" buttonLayout="horizontal"
 *   [min]="0" [step]="1"
 *   [(value)]="variant.inventoryQuantity" />
 * ```
 */
@Component({
  selector: 'ef-inputnumber',
  standalone: true,
  templateUrl: './ef-inputnumber.component.html',
  styleUrls: ['./ef-inputnumber.component.scss'],
  imports: [InputNumberModule, FormsModule, TranslateModule, EfLabelComponent],
})
export class EfInputNumberComponent
  extends AbstractEfFormControl
  implements ControlValueAccessor
{
  @ViewChild('inputNumber', { static: false }) inputNumber?: InputNumber;

  /* Identity / label / placeholder / aria / required / readonly /
     disabled all inherited from AbstractEfFormControl. */

  /* ── Value & state ──────────────────────────────────────────── */

  @Input() value?: Nullable<number>;
  @Input() invalid = false;

  /* ── Format & display (primeng variant) ──────────────────────── */

  @Input() format = true;
  @Input({ transform: booleanAttribute }) showButtons = false;
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
  @Input() useGrouping = true;
  @Input() minFractionDigits?: number;
  @Input() maxFractionDigits?: number;

  /* ── Constraints ─────────────────────────────────────────────── */

  @Input() min?: number;
  @Input() max?: number;
  @Input() step = 1;
  @Input() allowEmpty = true;

  /* ── Input attributes ────────────────────────────────────────── */

  @Input() inputSize?: number;
  @Input() size?: 'small' | 'large' = 'small';
  @Input() maxlength?: number;
  @Input() minlength?: number;
  @Input() pattern?: string;
  @Input() tabindex?: number;
  @Input() title?: string;
  @Input() ariaLabelledBy?: string;
  @Input() inputStyle?: any;
  @Input() inputStyleClass?: string;
  @Input() style?: any;
  @Input() styleClass?: string;
  @Input({ transform: booleanAttribute }) showClear = false;
  /** PrimeNG visual variant (`'filled'` | `'outlined'`) — only
   *  honored when {@link variant} === 'primeng'. */
  @Input() primeNgVariant?: 'filled' | 'outlined';
  @Input({ transform: booleanAttribute }) autofocus = false;
  @Input() autocomplete?: string;
  @Input() fluid: boolean = true;
  @Input({ transform: booleanAttribute }) inline = false;

  /**
   * Render variant.
   * - `'primeng'` (default) — wraps `p-inputnumber`.
   * - `'comptoir'`          — native `<input type="number">` styled
   *                           against `.ef-input` / `.ef-input-group`.
   */
  @Input() variant: 'primeng' | 'comptoir' = 'primeng';

  @HostBinding('class.ef-inline') get isInline() { return this.inline; }

  /* ── Styling pass-through (primeng variant) ─────────────────── */

  @Input() pt?: any;
  @Input() ptOptions?: any;
  @Input() dt?: any;
  @Input() unstyled?: boolean;

  /* ── Events ──────────────────────────────────────────────────── */

  @Output() inputEvent = new EventEmitter<InputNumberInputEvent>();
  @Output() valueChangeEvent: EventEmitter<number | null> = new EventEmitter<number | null>();
  @Output() focusEvent = new EventEmitter<Event>();
  @Output() blurEvent = new EventEmitter<Event>();
  @Output() keyDownEvent = new EventEmitter<KeyboardEvent>();
  @Output() clearEvent = new EventEmitter<void>();

  /* ── CVA ─────────────────────────────────────────────────────── */

  private onChange: (value: any) => void = () => { /* noop */ };
  private onTouched: () => void = () => { /* noop */ };

  readonly ngControl = inject(NgControl, { self: true, optional: true });

  constructor() {
    super();
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  /* effectiveId / effectivePlaceholder / effectiveAriaLabel /
     errorsId all inherited from AbstractEfFormControl. */

  get showRequired(): boolean {
    const ctrl = this.ngControl?.control;
    return !!(ctrl?.hasError('required') && ctrl?.touched);
  }

  get serverErrors(): string[] | null {
    return this.ngControl?.control?.errors?.['serverError'] ?? null;
  }

  get isInvalid(): boolean {
    const ctrl = this.ngControl?.control;
    return this.invalid || !!(ctrl?.invalid && (ctrl?.touched || ctrl?.dirty));
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

  /* ── Event handlers ─────────────────────────────────────────── */

  handleInput(event: InputNumberInputEvent): void {
    const next = (event.value ?? null) as number | null;
    this.value = next;
    this.onChange(next);
    this.inputEvent.emit(event);
    this.valueChangeEvent.emit(next);
  }

  /** Comptoir native input handler — `<input type="number">` emits
   *  a string; coerce to number or null (empty string). */
  handleNativeInput(raw: string): void {
    let next: number | null;
    if (raw === '' || raw == null) {
      next = null;
    } else {
      const parsed = Number(raw);
      next = Number.isFinite(parsed) ? parsed : null;
    }
    this.value = next;
    this.onChange(next);
    this.valueChangeEvent.emit(next);
  }

  /** Comptoir stepper buttons handler — bumps `value` by `step`,
   *  clamped to `min` / `max`. */
  step$(direction: 1 | -1): void {
    const current = this.value ?? 0;
    let next = current + direction * (this.step ?? 1);
    if (this.min != null) next = Math.max(this.min, next);
    if (this.max != null) next = Math.min(this.max, next);
    this.value = next;
    this.onChange(next);
    this.valueChangeEvent.emit(next);
  }

  handleFocus(event: Event): void {
    this.focusEvent.emit(event);
  }

  handleBlur(event: Event): void {
    this.onTouched();
    this.blurEvent.emit(event);
  }

  handleKeyDown(event: KeyboardEvent): void {
    this.keyDownEvent.emit(event);
  }

  handleClear(): void {
    this.value = null;
    this.onChange(null);
    this.valueChangeEvent.emit(null);
    this.clearEvent.emit();
  }

  focus(): void {
    this.inputNumber?.input?.nativeElement?.focus();
  }

  clear(): void {
    if (this.inputNumber) {
      this.inputNumber.clear();
    }
    this.handleClear();
  }
}
