import {
  booleanAttribute,
  Component,
  Input,
  Self,
  Optional,
} from '@angular/core';
import { ControlValueAccessor, NgControl, FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { TranslateModule } from '@ngx-translate/core';
import { EfLabelComponent } from '../../layout/ef-label/ef-label.component';

@Component({
  selector: 'ef-checkbox',
  standalone: true,
  templateUrl: './ef-checkbox.component.html',
  styleUrls: ['./ef-checkbox.component.scss'],
  imports: [CheckboxModule, FormsModule, TranslateModule, EfLabelComponent],
})
export class EfCheckboxComponent implements ControlValueAccessor {
  /** Direct label text (not translated) */
  @Input() label?: string;
  /** Translation key — takes priority over label */
  @Input() labelKey?: string;

  @Input() inputId?: string;
  @Input() name?: string;
  @Input() value?: any;
  @Input({ transform: booleanAttribute }) binary: boolean = false;
  @Input({ transform: booleanAttribute }) required: boolean = false;
  @Input({ transform: booleanAttribute }) disabled: boolean = false;

  checked: any = false;

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(@Self() @Optional() public ngControl: NgControl) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  get effectiveId(): string {
    return this.inputId ?? this.name ?? '';
  }

  get effectiveLabel(): string | undefined {
    return this.labelKey ? undefined : this.label;
  }

  get showRequired(): boolean {
    const ctrl = this.ngControl?.control;
    return ctrl?.hasError('required') && ctrl?.touched;
  }

  get serverErrors(): string[] | null {
    return this.ngControl?.control?.errors?.serverError ?? null;
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
    this.disabled = isDisabled;
  }

  handleChange(event: any): void {
    this.checked = event.checked;
    this.onChange(this.binary ? event.checked : event.checked);
    this.onTouched();
  }
}
