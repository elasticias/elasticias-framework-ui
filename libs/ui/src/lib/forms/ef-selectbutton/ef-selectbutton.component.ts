import {
  booleanAttribute,
  Component,
  inject,
  Input,
  TemplateRef,
  ContentChild,
} from '@angular/core';
import { ControlValueAccessor, NgControl, FormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TranslateModule } from '@ngx-translate/core';
import { EfLabelComponent } from '../../layout/ef-label/ef-label.component';
import { CommonModule } from '@angular/common';
import { AbstractEfFormControl } from '../abstract-ef-form-control.component';

@Component({
  selector: 'ef-selectbutton',
  standalone: true,
  templateUrl: './ef-selectbutton.component.html',
  imports: [SelectButtonModule, FormsModule, TranslateModule, CommonModule, EfLabelComponent],
})
export class EfSelectButtonComponent
  extends AbstractEfFormControl
  implements ControlValueAccessor
{
  /* identity / label / labelKey / disabled (isDisabled) all inherited from
     AbstractEfFormControl. A selectbutton has no clearable concept, so the
     base's `hasValue`/`clearValue` defaults (no ✕) are left untouched. */

  @Input() options: any[] = [];
  @Input() optionLabel = 'label';
  @Input() optionValue = 'value';
  @Input({ transform: booleanAttribute }) multiple = false;
  @Input({ transform: booleanAttribute }) allowEmpty = true;
  @Input() size: 'small' | 'large' = 'small';
  @Input() styleClass?: string;

  @ContentChild('item') itemTemplate?: TemplateRef<any>;

  value: any = null;

  private onChange: (value: any) => void = () => { /* noop */ };
  private onTouched: () => void = () => { /* noop */ };

  readonly ngControl = inject(NgControl, { self: true, optional: true });

  constructor() {
    super();
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
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

  handleChange(event: any): void {
    this.value = event.value;
    this.onChange(event.value);
    this.onTouched();
  }
}
