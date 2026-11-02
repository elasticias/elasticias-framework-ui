import {
  booleanAttribute,
  Component,
  HostBinding,
  inject,
  Input,
  LOCALE_ID,
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
import { EfClearButtonComponent } from '../ef-clear-button/ef-clear-button.component';
import { AbstractEfFormControl } from '../abstract-ef-form-control.component';

/**
 * Comptoir number input.
 *
 * Two render variants share the same API:
 * - `'comptoir'` (default) — native `<input type="text" inputmode="decimal">`
 *   styled against `.ef-input` / `.ef-input-group`. Lean, no locale
 *   formatting on display, but data entry accepts both `,` and `.` as
 *   the decimal separator (fr-MA users type commas) and ignores
 *   space group separators; pair with `suffix="MAD"` for unit display
 *   in dense grids (variants table, inventory adjustments, etc.).
 *   See ADR-009.
 * - `'primeng'`            — wraps `p-inputnumber`. Full locale-aware
 *   currency / decimal formatting, stepper buttons, prefix / suffix.
 *
 * Currency on the comptoir variant: `mode="currency" currency="MAD"` shows
 * the amount formatted for `locale` (default: the app's `LOCALE_ID`) at the
 * currency's decimals (2 for MAD; `minFractionDigits` / `maxFractionDigits`
 * override), in Latin digits, with the currency symbol as an addon on the
 * side the locale puts it ("1.234,50" + "MAD" in fr-MA, "د.م." in ar-MA,
 * "MAD" first in en-US). On focus the text switches to the plain number
 * ("1234,50"), nothing is reformatted while typing, and on blur the model
 * is rounded to the decimals and the text formatted again. An explicit
 * `prefix` / `suffix` replaces the symbol.
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
/** Left-to-right / right-to-left / Arabic letter marks: layout hints, not content. */
const BIDI_MARKS = /[\u200e\u200f\u061c]/g;

/** Half away from zero at `digits` decimals, like the backend rounds money
 *  (and `OrderEntityHelper.roundMoney`); toPrecision absorbs float noise. */
function roundHalfAwayFromZero(value: number, digits: number): number {
  const factor = 10 ** digits;
  const scaled = Number((Math.abs(value) * factor).toPrecision(15));
  return (Math.sign(value) * Math.round(scaled)) / factor + 0;
}

@Component({
  selector: 'ef-inputnumber',
  standalone: true,
  templateUrl: './ef-inputnumber.component.html',
  styleUrls: ['./ef-inputnumber.component.scss'],
  imports: [InputNumberModule, FormsModule, TranslateModule, EfLabelComponent, EfClearButtonComponent],
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
  /** Default (undefined) = canonical `--hit-field` (40px, 48px on touch); `'small'` = dense 32px. */
  @Input() size?: 'small' | 'large';
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
  /* showClear inherited from AbstractEfFormControl (default true). */
  /** PrimeNG visual variant (`'filled'` | `'outlined'`) — only
   *  honored when {@link variant} === 'primeng'. */
  @Input() primeNgVariant?: 'filled' | 'outlined';
  @Input({ transform: booleanAttribute }) autofocus = false;
  @Input() autocomplete?: string;
  @Input() fluid = true;
  @Input({ transform: booleanAttribute }) inline = false;

  /**
   * Render variant.
   * - `'comptoir'` (default) — native `<input type="text" inputmode="decimal">`
   *                           styled against `.ef-input` / `.ef-input-group`,
   *                           at the canonical `--hit-field` height (40px, 48px on touch).
   *                           Accepts `,` and `.` as decimal separator.
   * - `'primeng'`            — wraps `p-inputnumber`. Opt in for PrimeNG's
   *                           formatted stepper behaviour.
   * See ADR-009 for why comptoir is the height-consistent default.
   */
  @Input() variant: 'primeng' | 'comptoir' = 'comptoir';

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

  /* ── Clearable (showClear / canClear inherited from the base) ── */

  /** A number field is clearable when it holds any value (including 0). */
  protected override get hasValue(): boolean {
    return this.value != null;
  }

  override clearValue(): void {
    this.handleClear();
  }

  /* ── Currency (comptoir variant) ────────────────────────────── */

  /** True while the comptoir input has focus in currency mode. */
  private focused = false;

  /** What the user typed since focus, shown as is (never reformatted). */
  private editText: string | null = null;

  /** Comptoir currency formatting applies: `mode="currency"` and a currency code. */
  get isCurrency(): boolean {
    return this.variant === 'comptoir' && this.mode === 'currency' && !!this.currency;
  }

  private get effectiveLocale(): string {
    return this.locale || this.localeId;
  }

  /** Decimals: explicit inputs, else the currency's own (2 for MAD). */
  private get fractionDigits(): { min: number; max: number } {
    const own = new Intl.NumberFormat(this.effectiveLocale, { style: 'currency', currency: this.currency })
      .resolvedOptions().maximumFractionDigits ?? 2;
    const min = this.minFractionDigits ?? Math.min(own, this.maxFractionDigits ?? own);
    const max = Math.max(min, this.maxFractionDigits ?? own);
    return { min, max };
  }

  /**
   * The amount as text, in Latin digits and without bidi marks: grouped
   * for display, ungrouped for editing (so the text always parses back
   * through {@link parseComptoirValue}).
   */
  private formatAmount(value: number | null, display: boolean): string {
    if (value == null) return '';
    const { min, max } = this.fractionDigits;
    return new Intl.NumberFormat(this.effectiveLocale, {
      minimumFractionDigits: min,
      maximumFractionDigits: max,
      useGrouping: display && this.useGrouping,
      numberingSystem: 'latn',
    } as Intl.NumberFormatOptions)
      .format(value)
      .replace(BIDI_MARKS, '');
  }

  /**
   * The currency addon: the locale's symbol and the side it goes on, or
   * `null` outside currency mode or when an explicit prefix / suffix
   * already shows the unit.
   */
  get currencyAddon(): { symbol: string; side: 'prefix' | 'suffix' } | null {
    if (!this.isCurrency || this.prefix || this.suffix) return null;
    const parts = new Intl.NumberFormat(this.effectiveLocale, {
      style: 'currency',
      currency: this.currency,
      currencyDisplay: (this.currencyDisplay as Intl.NumberFormatOptions['currencyDisplay']) ?? 'symbol',
      numberingSystem: 'latn',
    } as Intl.NumberFormatOptions).formatToParts(1);
    const at = parts.findIndex((p) => p.type === 'currency');
    if (at < 0) return null;
    const integerAt = parts.findIndex((p) => p.type === 'integer');
    return {
      symbol: parts[at].value.replace(BIDI_MARKS, ''),
      side: at < integerAt ? 'prefix' : 'suffix',
    };
  }

  /** Id of the currency addon, referenced by the input's aria-describedby. */
  get currencyId(): string {
    return `${this.effectiveId}-currency`;
  }

  /** Text bound to the comptoir input. */
  get displayText(): string | number {
    if (!this.isCurrency) return this.value ?? '';
    if (this.focused) return this.editText ?? '';
    return this.formatAmount(this.value ?? null, true);
  }

  /* ── CVA ─────────────────────────────────────────────────────── */

  private onChange: (value: any) => void = () => { /* noop */ };
  private onTouched: () => void = () => { /* noop */ };

  readonly ngControl = inject(NgControl, { self: true, optional: true });

  private readonly localeId = inject(LOCALE_ID);

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
    return this.resolvedExternalErrors() ?? this.ngControl?.control?.errors?.['serverError'] ?? null;
  }

  get isInvalid(): boolean {
    if (this.resolvedExternalErrors()?.length) return true;
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
    this.updateDisabledState(isDisabled);
  }

  /* ── Event handlers ─────────────────────────────────────────── */

  handleInput(event: InputNumberInputEvent): void {
    const next = (event.value ?? null) as number | null;
    this.value = next;
    this.onChange(next);
    this.inputEvent.emit(event);
    this.valueChangeEvent.emit(next);
  }

  /** Comptoir native input handler — the text input emits a raw
   *  string; normalize + coerce to number or null (empty / invalid). */
  handleNativeInput(raw: string): void {
    if (this.focused) this.editText = raw;
    const next = this.parseComptoirValue(raw);
    this.value = next;
    this.onChange(next);
    this.valueChangeEvent.emit(next);
  }

  /**
   * Parses comptoir free-text numeric entry.
   *
   * fr-MA users type commas as the decimal separator (`23,50`), while
   * `Number()` only understands `.` — so a comma is normalized to a
   * dot before parsing, and spaces (JS `\s` covers NBSP / narrow-NBSP
   * group separators) are stripped. Both `23,50` and `23.50` parse to
   * 23.5; unparseable text yields `null` (existing empty semantics).
   * Bidi marks (an Arabic formatted amount carries U+200F) are dropped.
   */
  private parseComptoirValue(raw: string): number | null {
    if (raw == null) return null;
    const normalized = raw.replace(BIDI_MARKS, '').replace(/\s/g, '').replace(/,/g, '.');
    if (normalized === '') return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  /**
   * Blur-time clamp for the comptoir variant. The native input no
   * longer carries `min` / `max` attributes (it's `type="text"`), so
   * range enforcement — previously only advisory on `type="number"`
   * anyway — happens here, and the field text is re-synced to the
   * canonical parsed value (e.g. a dangling `23,` becomes `23`).
   */
  private clampAndReflect(el: HTMLInputElement | null): void {
    const current = this.value ?? null;
    let next = current;
    if (next != null) {
      if (this.isCurrency) next = roundHalfAwayFromZero(next, this.fractionDigits.max);
      if (this.min != null && next < this.min) next = this.min;
      if (this.max != null && next > this.max) next = this.max;
    }
    if (next !== current) {
      this.value = next;
      this.onChange(next);
      this.valueChangeEvent.emit(next);
    }
    this.focused = false;
    this.editText = null;
    if (el) el.value = this.isCurrency ? this.formatAmount(next, true) : next == null ? '' : String(next);
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
    if (this.isCurrency) {
      this.focused = true;
      this.editText = this.formatAmount(this.value ?? null, false);
      const el = event.target as HTMLInputElement | null;
      if (el) el.value = this.editText;
    }
    this.focusEvent.emit(event);
  }

  handleBlur(event: Event): void {
    if (this.variant === 'comptoir') {
      this.clampAndReflect((event.target as HTMLInputElement | null) ?? null);
    }
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
