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
import { CheckboxModule } from 'primeng/checkbox';
import { TranslateModule } from '@ngx-translate/core';
import { EfLabelComponent } from '../../layout/ef-label/ef-label.component';
import { AbstractEfFormControl } from '../abstract-ef-form-control.component';

/**
 * Comptoir checkbox.
 *
 * Two render variants share the same API:
 * - `'primeng'` (default) — wraps `p-checkbox`. Stock PrimeNG visuals.
 * - `'comptoir'`          — native `<input type="checkbox">` styled
 *   against `.ef-checkbox-native`. Lean, no animation, fits dense
 *   grids (variants table, role / permission lists, etc.).
 *
 * Identity / label / aria / required / readonly / disabled inherited
 * from `AbstractEfFormControl`. `binary` flips between boolean mode
 * (`checked: true/false`) and value-mode (`checked` is the bound
 * value when ticked, `null` when unticked) — the latter pairs with
 * a parent NgModel array for multi-select scenarios.
 *
 * Two layouts, set by `inline`:
 * - `inline` (default) — box with its label to the right, for
 *   standalone toggles and dense lists.
 * - `[inline]="false"` — field layout: the label sits above, like
 *   `ef-select` / `ef-input-text`, and the box is centred in a
 *   `--hit-base` row so it lines up with the inputs beside it in a
 *   form grid.
 *
 * ```html
 * <ef-checkbox
 *   labelKey="catalog.is_active"
 *   variant="comptoir"
 *   [(checked)]="variant.isActive"
 *   binary />
 * ```
 */
@Component({
  selector: 'ef-checkbox',
  standalone: true,
  templateUrl: './ef-checkbox.component.html',
  styleUrls: ['./ef-checkbox.component.scss'],
  imports: [CheckboxModule, FormsModule, TranslateModule, EfLabelComponent],
})
export class EfCheckboxComponent
  extends AbstractEfFormControl
  implements ControlValueAccessor
{
  /* Identity / label / aria / required / readonly / disabled all
     inherited from AbstractEfFormControl. */

  /** Underlying checkbox value when ticked (non-binary mode). */
  @Input() value?: any;

  /** Binary mode — checked becomes a boolean rather than the
   *  `value` input. Default for new code. */
  @Input({ transform: booleanAttribute }) binary = false;

  /**
   * Render variant.
   * - `'primeng'` (default) — wraps `p-checkbox`.
   * - `'comptoir'`          — native `<input type="checkbox">`
   *                           styled against `.ef-checkbox-native`.
   */
  @Input() variant: 'primeng' | 'comptoir' = 'primeng';

  /** Label beside the box (default). `false` stacks the label above,
   *  matching the other form fields in a grid row. */
  @Input({ transform: booleanAttribute }) inline = true;
  @HostBinding('class.ef-stacked') get isStacked() { return !this.inline; }

  /** Whether the label renders beside the box (inline layout only). */
  get hasLabel(): boolean {
    return !!(this.labelKey() || this.label());
  }

  /** Two-way bindable `[(checked)]`. */
  @Input() checked: any = false;
  @Output() checkedChange = new EventEmitter<any>();

  private onChange: (value: any) => void = () => { /* noop */ };
  private onTouched: () => void = () => { /* noop */ };

  readonly ngControl = inject(NgControl, { self: true, optional: true });

  constructor() {
    super();
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  /* effectiveId / effectiveAriaLabel / errorsId all inherited from
     AbstractEfFormControl. */

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

  writeValue(value: any): void {
    this.checked = value;
  }

  registerOnChange(fn: (value: any) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.updateDisabledState(isDisabled);
  }

  /** Handler for PrimeNG's onChange event. */
  handleChange(event: any): void {
    this.checked = event.checked;
    this.onChange(event.checked);
    this.checkedChange.emit(event.checked);
    this.onTouched();
  }

  /** Handler for the native checkbox change event (Comptoir variant). */
  handleNativeChange(rawChecked: boolean): void {
    const next = this.binary ? rawChecked : (rawChecked ? this.value : null);
    this.checked = next;
    this.onChange(next);
    this.checkedChange.emit(next);
    this.onTouched();
  }
}
