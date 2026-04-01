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

@Component({
  selector: 'ef-selectbutton',
  standalone: true,
  templateUrl: './ef-selectbutton.component.html',
  imports: [SelectButtonModule, FormsModule, TranslateModule, CommonModule, EfLabelComponent],
})
export class EfSelectButtonComponent implements ControlValueAccessor {
  /** Direct label text above the selectbutton (not translated) */
  @Input() label?: string;
  /** Translation key for label — takes priority over label */
  @Input() labelKey?: string;

  @Input() options: any[] = [];
  @Input() optionLabel = 'label';
  @Input() optionValue = 'value';
  @Input({ transform: booleanAttribute }) multiple = false;
  @Input({ transform: booleanAttribute }) allowEmpty = true;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input() size: 'small' | 'large' = 'small';
  @Input() styleClass?: string;

  @ContentChild('item') itemTemplate?: TemplateRef<any>;

  value: any = null;

  private onChange: (value: any) => void = () => { /* noop */ };
  private onTouched: () => void = () => { /* noop */ };

  readonly ngControl = inject(NgControl, { self: true, optional: true });

  constructor() {
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
    this.disabled = isDisabled;
  }

  handleChange(event: any): void {
    this.value = event.value;
    this.onChange(event.value);
    this.onTouched();
  }
}
