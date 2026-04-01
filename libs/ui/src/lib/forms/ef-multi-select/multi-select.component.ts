import { booleanAttribute, Component, HostBinding, inject, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { ControlValueAccessor, FormsModule, NgControl } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EfLabelComponent } from '../../layout/ef-label/ef-label.component';

@Component({
  selector: 'ef-multi-select',
  templateUrl: 'multi-select.component.html',
  styleUrls: ['./multi-select.component.scss'],
  standalone: true,
  imports: [FormsModule, MultiSelectModule, TranslateModule, EfLabelComponent],
})
export class EfMultiSelectComponent implements ControlValueAccessor, OnChanges {
  @Output() changeEvent = new EventEmitter<string[]>();

  @Input() label?: string;
  @Input() labelKey?: string;
  @Input() id = '';
  @Input() name = '';
  @Input() optionLabel = 'name';
  @Input() optionValue = 'id';
  @Input() options: any;
  @Input() filteredOptions: any;
  @Input() maxSelectedLabels = 3;
  @Input() disabled = false;
  @Input() display: string;
  @Input() size: 'large' | 'small';
  @Input() selectionLimit: any;
  @Input() filters: any;
  @Input() placeholder = '';
  @Input() placeholderKey?: string;
  @Input() required = false;
  @Input({ transform: booleanAttribute }) inline = false;

  @HostBinding('class.ef-inline') get isInline() { return this.inline; }

  selectedValues: any[];

  private propagateChange: (value: any[]) => void = () => { /* noop */ };
  private propagateTouched: () => void = () => { /* noop */ };

  readonly ngControl = inject(NgControl, { self: true, optional: true });
  private readonly translateService = inject(TranslateService);

  constructor() {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  get effectivePlaceholder(): string {
    return this.placeholderKey ? this.translateService.instant(this.placeholderKey) : (this.placeholder ?? '');
  }

  get showRequired(): boolean {
    const ctrl = this.ngControl?.control;
    return ctrl?.hasError('required') && ctrl?.touched;
  }

  get serverErrors(): string[] | null {
    return this.ngControl?.control?.errors?.serverError ?? null;
  }

  writeValue(value: string[]): void {
    if (Array.isArray(value) && this.options) {
      this.selectedValues = value
        .map(v => this.options.find(opt => opt[this.optionValue] === v)?.[this.optionValue])
        .filter(opt => !!opt);
    }
  }

  registerOnChange(fn: (value: any[]) => void): void {
    this.propagateChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.propagateTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  handleChange(event: { value: any[] }): void {
    this.selectedValues = event.value;
    this.propagateChange(this.selectedValues);
    this.changeEvent.emit(this.selectedValues);
    this.propagateTouched();

    if (this.selectedValues.length === 0) {
      this.propagateChange(null);
    }
  }

  ngOnChanges(): void {
    if (this.options && this.filters && typeof this.filters === 'object') {
      this.applyFilters(this.filters);
    } else {
      this.filteredOptions = this.options;
    }
  }

  private applyFilters(filters: { [key: string]: any }): void {
    this.filteredOptions = this.options.filter(option =>
      Object.keys(filters).every(key => option[key] === filters[key])
    );
    this.selectedValues = [];
  }
}
