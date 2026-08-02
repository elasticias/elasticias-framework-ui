import { Component, inject, Input, Output, EventEmitter } from '@angular/core';
import { ControlValueAccessor, NgControl, FormsModule } from '@angular/forms';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TranslateModule } from '@ngx-translate/core';
import { EfLabelComponent } from '../../layout/ef-label/ef-label.component';
import { AbstractEfFormControl } from '../abstract-ef-form-control.component';

/**
 * Comptoir toggle switch — wraps `p-toggleswitch`, boolean-only.
 *
 * Identity / label / aria / required / readonly / disabled inherited
 * from `AbstractEfFormControl`. Use for on/off state that applies
 * immediately (row activation toggles, settings), `ef-checkbox` for
 * form fields that are saved with the enclosing form.
 *
 * ```html
 * <ef-toggleswitch
 *   [checked]="row.isActive"
 *   [disabled]="!context.hasEditPermission"
 *   ariaLabelKey="sales_clients_toggle_active_aria"
 *   (checkedChange)="setActive(row, $event)" />
 * ```
 */
@Component({
  selector: 'ef-toggleswitch',
  standalone: true,
  imports: [ToggleSwitchModule, FormsModule, TranslateModule, EfLabelComponent],
  template: `
    <p-toggleswitch
      [inputId]="effectiveId"
      [name]="name() || undefined"
      [ngModel]="checked"
      [ngModelOptions]="{ standalone: true }"
      [disabled]="isDisabled()"
      [ariaLabel]="effectiveAriaLabel || undefined"
      (onChange)="handleChange($event)"
    />
    @if (labelKey() || label()) {
      <ef-label
        [labelKey]="labelKey()"
        [label]="label()"
        [for]="effectiveId"
        styleClass="form-label-left cursor-pointer"
      />
    }
  `,
})
export class EfToggleSwitchComponent
  extends AbstractEfFormControl
  implements ControlValueAccessor
{
  /** Two-way bindable `[(checked)]` — boolean only. */
  @Input() checked = false;
  @Output() checkedChange = new EventEmitter<boolean>();

  private onChange: (value: boolean) => void = () => { /* noop */ };
  private onTouched: () => void = () => { /* noop */ };

  readonly ngControl = inject(NgControl, { self: true, optional: true });

  constructor() {
    super();
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  writeValue(value: unknown): void {
    this.checked = !!value;
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.updateDisabledState(isDisabled);
  }

  handleChange(event: { checked: boolean }): void {
    this.checked = event.checked;
    this.onChange(event.checked);
    this.checkedChange.emit(event.checked);
    this.onTouched();
  }
}
