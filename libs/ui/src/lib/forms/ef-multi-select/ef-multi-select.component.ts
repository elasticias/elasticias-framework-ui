import { booleanAttribute, Component, computed, HostBinding, inject, input, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { ControlValueAccessor, FormsModule, NgControl } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EfLabelComponent } from '../../layout/ef-label/ef-label.component';
import { EfServerErrorsDirective, resolveExternalErrors } from '../ef-server-errors.directive';

@Component({
  selector: 'ef-multi-select',
  templateUrl: 'ef-multi-select.component.html',
  styleUrls: ['./ef-multi-select.component.scss'],
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
  @Input() display: 'comma' | 'chip' = 'comma';
  @Input() size: 'large' | 'small';
  @Input() selectionLimit: any;
  @Input() filters: any;
  @Input() placeholder = '';
  @Input() placeholderKey?: string;
  @Input({ transform: booleanAttribute }) showClear = false;
  @Input() required = false;
  @Input({ transform: booleanAttribute }) inline = false;

  @HostBinding('class.ef-inline') get isInline() { return this.inline; }
  @HostBinding('class.ef-required') get isRequired() { return this.required; }

  selectedValues: any[] = [];

  /** External (server) errors — explicit `[errors]` input or the enclosing
   *  `[efServerErrors]` scope keyed by `name`. See {@link EfServerErrorsDirective}. */
  readonly errors = input<string[] | null | undefined>(undefined);
  private readonly serverErrorsScope = inject(EfServerErrorsDirective, { optional: true });
  readonly resolvedExternalErrors = computed<string[] | null>(() =>
    resolveExternalErrors(this.errors(), this.serverErrorsScope, this.name),
  );

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
    return this.resolvedExternalErrors() ?? this.ngControl?.control?.errors?.serverError ?? null;
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
    this.disabled = isDisabled;
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
