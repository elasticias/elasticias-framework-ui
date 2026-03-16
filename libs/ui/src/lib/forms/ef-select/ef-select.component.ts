import {
  booleanAttribute,
  Component,
  HostBinding,
  Input,
  Output,
  EventEmitter,
  Self,
  Optional,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { ControlValueAccessor, NgControl, FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EfLabelComponent } from '../../layout/ef-label/ef-label.component';

@Component({
  selector: 'ef-select',
  standalone: true,
  templateUrl: './ef-select.component.html',
  styleUrls: ['./ef-select.component.scss'],
  imports: [SelectModule, FormsModule, TranslateModule, EfLabelComponent],
})
export class EfSelectComponent implements ControlValueAccessor, OnChanges {
  @Input() label?: string;
  @Input() labelKey?: string;
  @Input() inputId?: string;
  @Input() name?: string;
  @Input() options: any[] = [];
  @Input() optionLabel: string = 'name';
  @Input() optionValue?: string;
  @Input() placeholder: string = '';
  @Input() placeholderKey?: string;
  @Input() size: 'small' | 'large' = 'small';
  @Input({ transform: booleanAttribute }) required: boolean = false;
  @Input({ transform: booleanAttribute }) fluid: boolean = true;
  @Input({ transform: booleanAttribute }) inline: boolean = false;
  @Input({ transform: booleanAttribute }) filter: boolean = false;
  @Input({ transform: booleanAttribute }) showClear: boolean = false;
  @Input({ transform: booleanAttribute }) disabled: boolean = false;
  @Input() appendTo?: string;

  /** Filter options by matching key-value pairs */
  @Input() filterByKeys?: { [key: string]: any };

  @HostBinding('class.ef-inline') get isInline() { return this.inline; }

  @Output() onSelectionChange = new EventEmitter<any>();

  value: any = null;
  filteredOptions: any[] = [];

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(@Self() @Optional() public ngControl: NgControl, private translateService: TranslateService) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  get effectivePlaceholder(): string {
    return this.placeholderKey ? this.translateService.instant(this.placeholderKey) : (this.placeholder ?? '');
  }

  get effectiveId(): string {
    return this.inputId ?? this.name ?? '';
  }

  get showRequired(): boolean {
    const ctrl = this.ngControl?.control;
    return ctrl?.hasError('required') && ctrl?.touched;
  }

  get serverErrors(): string[] | null {
    return this.ngControl?.control?.errors?.serverError ?? null;
  }

  get isInvalid(): boolean {
    const ctrl = this.ngControl?.control;
    return ctrl?.invalid && (ctrl?.touched || ctrl?.dirty);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options'] || changes['filterByKeys']) {
      this.applyFilters();
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
    this.onSelectionChange.emit(event.value);
  }

  private applyFilters(): void {
    if (this.options && this.filterByKeys && typeof this.filterByKeys === 'object') {
      this.filteredOptions = this.options.filter(option =>
        Object.keys(this.filterByKeys!).every(key => option[key] === this.filterByKeys![key])
      );
    } else {
      this.filteredOptions = this.options ?? [];
    }
  }
}
