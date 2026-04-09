import {
  booleanAttribute,
  Component,
  ContentChild,
  forwardRef,
  HostBinding,
  inject,
  Injector,
  Input,
  OnInit,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  TemplateRef,
} from '@angular/core';
import { ControlValueAccessor, NgControl, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SelectModule } from 'primeng/select';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EfLabelComponent } from '../../layout/ef-label/ef-label.component';

@Component({
  selector: 'ef-select',
  standalone: true,
  templateUrl: './ef-select.component.html',
  styleUrls: ['./ef-select.component.scss'],
  imports: [SelectModule, FormsModule, TranslateModule, EfLabelComponent, CommonModule],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => EfSelectComponent),
    multi: true,
  }],
})
export class EfSelectComponent implements ControlValueAccessor, OnInit, OnChanges {
  @Input() label?: string;
  @Input() labelKey?: string;
  @Input() inputId?: string;
  @Input() name?: string;
  @Input() options: any[] = [];
  @Input() optionLabel = 'name';
  @Input() optionValue?: string;
  @Input() placeholder = '';
  @Input() placeholderKey?: string;
  @Input() size: 'small' | 'large' = 'small';
  @Input({ transform: booleanAttribute }) required = false;
  @Input({ transform: booleanAttribute }) fluid = true;
  @Input({ transform: booleanAttribute }) inline = false;
  @Input({ transform: booleanAttribute }) filter = false;
  @Input({ transform: booleanAttribute }) showClear = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input() appendTo?: string;

  /** Filter options by matching key-value pairs */
  @Input() filterByKeys?: { [key: string]: any };

  @HostBinding('class.ef-inline') get isInline() { return this.inline; }

  @ContentChild('item') itemTemplate: TemplateRef<any> | null = null;
  @ContentChild('selectedItem') selectedItemTemplate: TemplateRef<any> | null = null;

  @Output() selectionChangeEvent = new EventEmitter<any>();

  value: any = null;
  filteredOptions: any[] = [];

  private onChange: (value: any) => void = () => { /* noop */ };
  private onTouched: () => void = () => { /* noop */ };

  /** Resolved lazily in ngOnInit to avoid circular DI with NG_VALUE_ACCESSOR */
  ngControl: NgControl | null = null;
  private readonly injector = inject(Injector);
  private readonly translateService = inject(TranslateService);

  ngOnInit(): void {
    this.ngControl = this.injector.get(NgControl, null);
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
    this.value = value ?? null;
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

  handleSelectionChange(event: { originalEvent?: Event; value: any }): void {
    const val = event?.value ?? null;
    this.value = val;
    this.onChange(val);
    this.onTouched();
    this.selectionChangeEvent.emit(val);
  }

  handleClear(): void {
    this.value = null;
    this.onChange(null);
    this.onTouched();
    this.selectionChangeEvent.emit(null);
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
