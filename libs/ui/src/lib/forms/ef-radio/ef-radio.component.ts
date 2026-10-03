import {
  booleanAttribute,
  Component,
  EventEmitter,
  HostBinding,
  inject,
  Input,
  Output,
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NgControl } from '@angular/forms';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TranslateModule } from '@ngx-translate/core';
import { EfLabelComponent } from '../../layout/ef-label/ef-label.component';
import { AbstractEfFormControl } from '../abstract-ef-form-control.component';

/**
 * Comptoir radio group — one `p-radiobutton` per option, single value.
 *
 * Options follow the `ef-select` shape (`options` / `optionLabel` /
 * `optionValue`, change via `selectionChangeEvent`), so a short select
 * can become a radio group by swapping the tag.
 *
 * Two layouts, set by `inline`, matching `ef-checkbox`:
 * - `inline` (default) — group label and options on one line.
 * - `[inline]="false"` — field layout: the label sits above, like
 *   `ef-select` / `ef-input-text`, and the options sit in a
 *   `--hit-base` row so they line up with the inputs beside them in a
 *   form grid.
 *
 * Options wrap when the row runs out of width, so a long list never
 * widens the page on a phone.
 *
 * ```html
 * <ef-radio
 *   name="clientType"
 *   labelKey="sales_clients_col_type"
 *   [inline]="false"
 *   [options]="context.ref.get('client_type')()"
 *   optionLabel="label"
 *   optionValue="code"
 *   [value]="clientType()"
 *   (selectionChangeEvent)="patchEntity({ clientType: $event })" />
 * ```
 */
@Component({
  selector: 'ef-radio',
  standalone: true,
  templateUrl: './ef-radio.component.html',
  styleUrls: ['./ef-radio.component.scss'],
  imports: [RadioButtonModule, FormsModule, TranslateModule, EfLabelComponent],
})
export class EfRadioComponent
  extends AbstractEfFormControl
  implements ControlValueAccessor
{
  @Input() options: any[] = [];
  /** Property shown as the option's text. */
  @Input() optionLabel = 'label';
  /** Property used as the value. Unset → the whole option object. */
  @Input() optionValue?: string;
  /** Property that disables a single option when truthy. */
  @Input() optionDisabled?: string;

  /** Group label beside the options (default). `false` stacks it above,
   *  matching the other form fields in a grid row. */
  @Input({ transform: booleanAttribute }) inline = true;
  @HostBinding('class.ef-stacked') get isStacked() { return !this.inline; }

  @Input() value: any = null;
  @Output() selectionChangeEvent = new EventEmitter<any>();

  private onChange: (value: any) => void = () => { /* noop */ };
  private onTouched: () => void = () => { /* noop */ };

  readonly ngControl = inject(NgControl, { self: true, optional: true });

  constructor() {
    super();
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  get hasLabel(): boolean {
    return !!(this.labelKey() || this.label());
  }

  /** Shared `name` so the browser treats the options as one group. */
  get groupName(): string {
    return this.name() || this.effectiveId;
  }

  get labelId(): string {
    return `${this.effectiveId}-label`;
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

  optionValueOf(opt: any): any {
    return this.optionValue ? opt?.[this.optionValue] : opt;
  }

  optionLabelOf(opt: any): string {
    return opt?.[this.optionLabel] ?? '';
  }

  isOptionDisabled(opt: any): boolean {
    return this.isDisabled() || (!!this.optionDisabled && !!opt?.[this.optionDisabled]);
  }

  optionId(index: number): string {
    return `${this.effectiveId}-${index}`;
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
    this.updateDisabledState(isDisabled);
  }

  handleChange(next: any): void {
    this.value = next;
    this.onChange(next);
    this.selectionChangeEvent.emit(next);
    this.onTouched();
  }
}
