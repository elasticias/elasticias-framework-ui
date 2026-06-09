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
import { MultiSelectModule } from 'primeng/multiselect';
import { TranslateModule } from '@ngx-translate/core';
import { EfLabelComponent } from '../../layout/ef-label/ef-label.component';
import { AbstractEfFormControl } from '../abstract-ef-form-control.component';

/**
 * Comptoir select — wraps PrimeNG `p-select` (single) or `p-multiselect`
 * (multi) and skins it against the `.es` / `.es__panel` patterns lifted
 * from the static prototype (`docs/ux-ui/erp/screens/components.html`,
 * Section 04). All the heavy machinery (filter, virtual scroll, group
 * support, keyboard nav, ARIA listbox semantics, RTL, focus trapping,
 * lazy loading) comes from PrimeNG; we own only the visuals + the
 * Elasticias API surface (i18n `*Key` inputs, `selectionChangeEvent`,
 * `filterByKeys`, content-projected templates).
 *
 * The `'comptoir'` variant remains as a lite, no-deps escape hatch
 * (native `<select>` styled via `.ef-select-native`); use the default
 * `'primeng'` variant for any screen that needs filter / multi /
 * group / templating.
 *
 * ```html
 * <ef-select
 *   labelKey="orders.status"
 *   placeholderKey="orders.status_placeholder"
 *   [(value)]="status"
 *   [options]="statuses"
 *   optionLabel="label" optionValue="code"
 *   [filter]="true" [showClear]="true">
 * </ef-select>
 *
 * <ef-select
 *   labelKey="users.assigned"
 *   [options]="users" optionLabel="name" optionValue="id"
 *   [multiple]="true" [filter]="true">
 *   <ng-template #item let-u>
 *     <span class="av">{{ u.initials }}</span>
 *     <span class="body">
 *       <span class="nm">{{ u.name }}</span>
 *       <span class="meta">{{ u.role }}</span>
 *     </span>
 *   </ng-template>
 * </ef-select>
 * ```
 */
@Component({
  selector: 'ef-select',
  standalone: true,
  templateUrl: './ef-select.component.html',
  styleUrls: ['./ef-select.component.scss'],
  imports: [
    SelectModule,
    MultiSelectModule,
    FormsModule,
    TranslateModule,
    EfLabelComponent,
    CommonModule,
  ],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => EfSelectComponent),
    multi: true,
  }],
})
export class EfSelectComponent
  extends AbstractEfFormControl
  implements ControlValueAccessor, OnInit, OnChanges
{
  /* Identity / label / placeholder / aria / required / readonly /
     disabled all inherited from AbstractEfFormControl. */

  /* ── Data ────────────────────────────────────────────────────── */

  @Input() options: any[] = [];
  @Input() optionLabel = 'name';
  @Input() optionValue?: string;
  @Input() optionDisabled?: string;
  /** Stable identity key — required for groups and virtual scroll. */
  @Input() dataKey?: string;

  /** Group mode — pair with `optionGroupLabel` + `optionGroupChildren`. */
  @Input({ transform: booleanAttribute }) group = false;
  @Input() optionGroupLabel = 'label';
  @Input() optionGroupChildren = 'items';

  /* ── Layout / size ───────────────────────────────────────────── */

  @Input() size: 'small' | 'large' = 'small';
  @Input({ transform: booleanAttribute }) fluid = true;
  @Input({ transform: booleanAttribute }) inline = false;
  @Input() appendTo?: string;

  /* ── Behavior ────────────────────────────────────────────────── */

  /** Multi-selection — internally swaps `<p-select>` for `<p-multiselect>`. */
  @Input({ transform: booleanAttribute }) multiple = false;

  @Input({ transform: booleanAttribute }) filter = false;
  /** Filter the list against these option fields (string or csv).
   *  PrimeNG default: `optionLabel`. */
  @Input() filterBy?: string;
  @Input() filterPlaceholder?: string;
  @Input() filterPlaceholderKey?: string;
  /** Auto-focus the filter input when the panel opens (default: true). */
  @Input({ transform: booleanAttribute }) autofocusFilter = true;

  @Input({ transform: booleanAttribute }) showClear = false;
  @Input({ transform: booleanAttribute }) editable = false;
  @Input({ transform: booleanAttribute }) loading = false;

  /** Virtual-scroll for long lists (>100 items). Pair with
   *  `virtualScrollItemSize` (default 38px). */
  @Input({ transform: booleanAttribute }) virtualScroll = false;
  @Input() virtualScrollItemSize = 38;
  @Input() scrollHeight = '240px';

  /** Multi-select trigger display: `'chip'` (default — chips visible
   *  in the trigger, individually removable) or `'comma'`. */
  @Input() multiDisplay: 'chip' | 'comma' = 'chip';

  /** Multi-select header "select all" toggle. Off by default — the
   *  Comptoir multiselect leads with the filter; opt in when bulk
   *  select-all is genuinely useful. */
  @Input({ transform: booleanAttribute }) showToggleAll = false;

  /* ── Empty state messages (i18n) ─────────────────────────────── */

  @Input() emptyMessage?: string;
  @Input() emptyMessageKey?: string;
  @Input() emptyFilterMessage?: string;
  @Input() emptyFilterMessageKey?: string;

  /* ── Style hooks (merged with our base `.es` / `.es__panel`) ── */

  @Input() styleClass?: string;
  @Input() panelStyleClass?: string;

  /** Filter options by matching key-value pairs (legacy Elasticias
   *  helper — pre-filters `options` before they reach PrimeNG). */
  @Input() filterByKeys?: { [key: string]: any };

  /**
   * Rendering variant.
   * - `'primeng'` (default) — wraps `p-select` / `p-multiselect`.
   *   All rich features (filter, group, virtualScroll, templates).
   * - `'comptoir'`          — native `<select class="ef-select-native">`
   *                           against the Comptoir pattern styles.
   *                           No filter / virtualization / multi /
   *                           group / templates — use `'primeng'` for
   *                           those.
   */
  @Input() variant: 'primeng' | 'comptoir' = 'primeng';

  @HostBinding('class.ef-inline') get isInline() { return this.inline; }
  @HostBinding('class.ef-select-host') readonly hostClass = true;

  /* ── Content templates (projected into PrimeNG via local refs) ── */

  @ContentChild('item') itemTemplate: TemplateRef<any> | null = null;
  @ContentChild('selectedItem') selectedItemTemplate: TemplateRef<any> | null = null;
  @ContentChild('group') groupTemplate: TemplateRef<any> | null = null;
  @ContentChild('header') headerTemplate: TemplateRef<any> | null = null;
  @ContentChild('footer') footerTemplate: TemplateRef<any> | null = null;
  @ContentChild('empty') emptyTemplate: TemplateRef<any> | null = null;
  @ContentChild('emptyFilter') emptyFilterTemplate: TemplateRef<any> | null = null;
  @ContentChild('filter') filterTemplate: TemplateRef<any> | null = null;
  @ContentChild('loader') loaderTemplate: TemplateRef<any> | null = null;

  /* ── Outputs ─────────────────────────────────────────────────── */

  @Output() selectionChangeEvent = new EventEmitter<any>();
  @Output() filterChangeEvent = new EventEmitter<string>();
  @Output() panelShowEvent = new EventEmitter<void>();
  @Output() panelHideEvent = new EventEmitter<void>();

  /** Two-way-bindable as `[value]` (one-way) or
   *  `[(value)]` (set + listen via `selectionChangeEvent`). */
  @Input() value: any = null;
  filteredOptions: any[] = [];

  private onChange: (value: any) => void = () => { /* noop */ };
  private onTouched: () => void = () => { /* noop */ };

  /** Resolved lazily in ngOnInit to avoid circular DI with NG_VALUE_ACCESSOR */
  ngControl: NgControl | null = null;
  private readonly injector = inject(Injector);

  ngOnInit(): void {
    this.ngControl = this.injector.get(NgControl, null);
    this.applyFilters();
  }

  /* effectiveId / effectivePlaceholder / effectiveAriaLabel /
     errorsId all inherited from AbstractEfFormControl. */

  /** Translated filter placeholder. Falls back to a generic key, then
   *  to "Search…" so it always renders something readable. */
  get effectiveFilterPlaceholder(): string {
    if (this.filterPlaceholderKey) {
      return this.translateService.instant(this.filterPlaceholderKey);
    }
    return this.filterPlaceholder ?? this.translateService.instant('ef_select_filter_placeholder');
  }

  get effectiveEmptyMessage(): string {
    if (this.emptyMessageKey) return this.translateService.instant(this.emptyMessageKey);
    return this.emptyMessage ?? this.translateService.instant('ef_select_empty');
  }

  get effectiveEmptyFilterMessage(): string {
    if (this.emptyFilterMessageKey) return this.translateService.instant(this.emptyFilterMessageKey);
    return this.emptyFilterMessage ?? this.translateService.instant('ef_select_empty_filter');
  }

  /** Always include `.es` so the global Comptoir skin in
   *  `_patterns.scss` always finds a hook, regardless of what the
   *  consumer passes via `styleClass`. */
  get effectiveStyleClass(): string {
    return ['es', this.size === 'small' ? 'es--sm' : null, this.styleClass]
      .filter(Boolean).join(' ');
  }

  get effectivePanelStyleClass(): string {
    return ['es__panel', this.panelStyleClass].filter(Boolean).join(' ');
  }

  get showRequired(): boolean {
    const ctrl = this.ngControl?.control;
    return !!(ctrl?.hasError('required') && ctrl?.touched);
  }

  get serverErrors(): string[] | null {
    return this.ngControl?.control?.errors?.['serverError'] ?? null;
  }

  get isInvalid(): boolean {
    const ctrl = this.ngControl?.control;
    return !!(ctrl?.invalid && (ctrl?.touched || ctrl?.dirty));
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
    this.value = this.multiple ? [] : null;
    this.onChange(this.value);
    this.onTouched();
    this.selectionChangeEvent.emit(this.value);
  }

  handleFilter(event: { originalEvent?: Event; filter: string }): void {
    this.filterChangeEvent.emit(event?.filter ?? '');
  }

  handlePanelShow(): void {
    this.panelShowEvent.emit();
  }

  handlePanelHide(): void {
    this.panelHideEvent.emit();
    this.onTouched();
  }

  /** Comptoir variant — native `<select>` change handler. The empty
   *  string from the placeholder option becomes `null`; otherwise we
   *  resolve the value through `optionValue` if provided. */
  handleNativeSelectChange(rawValue: string): void {
    if (rawValue === '' || rawValue == null) {
      this.handleClear();
      return;
    }
    let resolved: any = rawValue;
    if (this.optionValue) {
      // Map the string back to its option's value (which may be a
      // number, object key, etc. — preserves the original type).
      const match = this.filteredOptions.find(
        (opt) => String(opt[this.optionValue!]) === rawValue,
      );
      if (match) resolved = match[this.optionValue];
    }
    this.value = resolved;
    this.onChange(resolved);
    this.onTouched();
    this.selectionChangeEvent.emit(resolved);
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
