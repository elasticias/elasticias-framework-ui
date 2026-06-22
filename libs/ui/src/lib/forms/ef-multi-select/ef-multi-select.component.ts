import { booleanAttribute, Component, HostBinding, inject, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { ControlValueAccessor, FormsModule, NgControl } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';
import { TranslateModule } from '@ngx-translate/core';
import { EfLabelComponent } from '../../layout/ef-label/ef-label.component';
import { AbstractEfFormControl } from '../abstract-ef-form-control.component';

@Component({
  selector: 'ef-multi-select',
  templateUrl: 'ef-multi-select.component.html',
  styleUrls: ['./ef-multi-select.component.scss'],
  standalone: true,
  imports: [FormsModule, MultiSelectModule, TranslateModule, EfLabelComponent],
})
export class EfMultiSelectComponent
  extends AbstractEfFormControl
  implements ControlValueAccessor, OnChanges
{
  /* identity (inputId / name) / label / labelKey / placeholder / placeholderKey /
     required / disabled (isDisabled) / showClear / errors (resolvedExternalErrors)
     all inherited from AbstractEfFormControl. The clear ✕ is rendered by
     PrimeNG's own `[showClear]` (bound below), so the base's custom
     `ef-clear-button` hooks (`hasValue`/`clearValue`) are left at their no-op
     defaults — `(onClear)` drives `handleClear()` instead. */

  @Output() changeEvent = new EventEmitter<string[]>();

  @Input() optionLabel = 'name';
  @Input() optionValue = 'id';
  @Input() options: any;
  @Input() filteredOptions: any;
  @Input() maxSelectedLabels = 3;
  @Input() display: 'comma' | 'chip' = 'comma';
  @Input() size: 'large' | 'small';
  @Input() selectionLimit: any;
  @Input() filters: any;
  @Input({ transform: booleanAttribute }) inline = false;

  @HostBinding('class.ef-inline') get isInline() { return this.inline; }
  @HostBinding('class.ef-required') get isRequired() { return this.required(); }

  selectedValues: any[] = [];

  private propagateChange: (value: any[]) => void = () => { /* noop */ };
  private propagateTouched: () => void = () => { /* noop */ };

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

  writeValue(value: string[]): void {
    if (Array.isArray(value) && value.length > 0 && this.options) {
      this.selectedValues = value
        .map(v => this.options.find((opt: any) => opt[this.optionValue] === v)?.[this.optionValue])
        .filter((opt: any) => !!opt);
    } else {
      this.selectedValues = [];
    }
  }

  registerOnChange(fn: (value: any[]) => void): void {
    this.propagateChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.propagateTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.updateDisabledState(isDisabled);
  }

  onInternalModelChange(val: any[]): void {
    const value = val ?? [];
    this.selectedValues = value;
    this.propagateChange(value);
    this.changeEvent.emit(value);
    this.propagateTouched();
  }

  handleClear(): void {
    this.selectedValues = [];
    this.propagateChange([]);
    this.changeEvent.emit([]);
    this.propagateTouched();
  }

  ngOnChanges(): void {
    if (this.options && this.filters && typeof this.filters === 'object') {
      this.applyFilters(this.filters);
    } else {
      this.filteredOptions = this.options;
    }
  }

  private applyFilters(filters: { [key: string]: any }): void {
    this.filteredOptions = this.options.filter((option: any) =>
      Object.keys(filters).every(key => option[key] === filters[key])
    );
    this.selectedValues = [];
  }
}
