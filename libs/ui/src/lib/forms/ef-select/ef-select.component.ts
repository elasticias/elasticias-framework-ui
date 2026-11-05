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
 * Past this many options an `ef-select` whose `filter` is left unset shows
 * a search box. Eight is about what the panel shows without scrolling;
 * beyond that, finding a name by scrolling is slower than typing it.
 */
export const EF_SELECT_FILTER_THRESHOLD = 8;

/** `filter` keeps "not bound" apart from `false`, which `booleanAttribute`
 *  folds together, so the threshold applies only when the caller is silent. */
function optionalBoolean(value: unknown): boolean | undefined {
  return value === undefined || value === null ? undefined : booleanAttribute(value);
}

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
 * Both variants render PrimeNG. `'comptoir'` used to be a native
 * `<select>`, which opened the operating system's own list (a blank,
 * checked first row on macOS, no search); it now gets the same `.es`
 * dropdown, sized for dense rows and appended to `body` so a scrolling
 * card or table cannot clip its panel.
 *
 * The search box turns itself on past `EF_SELECT_FILTER_THRESHOLD`
 * options unless the caller binds `[filter]` either way.
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

  /** Control height. Default (undefined) = the canonical `--hit-field` (40px, 48px on touch),
   *  matching native inputs (ADR-009). `'small'` opts into the dense 32px
   *  variant for compact contexts (e.g. table-row editors). */
  @Input() size?: 'small' | 'large';
  @Input({ transform: booleanAttribute }) fluid = true;
  @Input({ transform: booleanAttribute }) inline = false;
  @Input() appendTo?: string;

  /* ── Behavior ────────────────────────────────────────────────── */

  /** Multi-selection — internally swaps `<p-select>` for `<p-multiselect>`. */
  @Input({ transform: booleanAttribute }) multiple = false;

  /** Show the search box in the panel. Unset (the default) turns it on
   *  when there are more than `EF_SELECT_FILTER_THRESHOLD` options; bind
   *  `true` or `false` to decide for the screen. */
  @Input({ transform: optionalBoolean }) filter: boolean | undefined = undefined;
  /** Filter the list against these option fields (string or csv).
   *  PrimeNG default: `optionLabel`. */
  @Input() filterBy?: string;
  @Input() filterPlaceholder?: string;
  @Input() filterPlaceholderKey?: string;
  /** Auto-focus the filter input when the panel opens (default: true). */
  @Input({ transform: booleanAttribute }) autofocusFilter = true;

  /**
   * Take focus on load. Off by default, and bound explicitly rather than left
   * unset, which matters more than it looks: PrimeNG's AutoFocus directive
   * decides with `if (this.autofocus === false)`, and `Select` declares
   * `autofocus` with no initialiser. An unbound control therefore arrives as
   * `undefined`, misses that strict check, and gets a real `autofocus="true"`
   * attribute written onto its label. Every select on a page became an
   * autofocus candidate, so on load the browser focused one of them and
   * scrolled its container to it — which is why a dashboard opened partway
   * down the page. Binding `false` puts the directive back on its intended
   * branch and removes the attribute.
   */
  @Input({ transform: booleanAttribute }) autofocus = false;

  /* showClear is inherited from AbstractEfFormControl (default true →
     clearable by default; PrimeNG only renders the ✕ when a value is set). */
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
   * - `'primeng'` (default) — wraps `p-select` / `p-multiselect`, skinned with
   *                           the `.es` / `.es__panel` patterns (the custom
   *                           dropdown: filter, styled options, animated panel
   *                           — see `components.html` Section 04). Also pinned
   *                           to the canonical `--hit-field` (40px, 48px on touch) trigger
   *                           height (`.es.p-select { min-height: --hit-field }`),
   *                           so it aligns with inputs/buttons in a row.
   * - `'comptoir'`:          the same `p-select` / `p-multiselect`, for dense
   *                           rows and table-row editors: no 200px minimum width,
   *                           so it shrinks with its cell, and the panel goes to
   *                           `body` unless `appendTo` says otherwise. It no
   *                           longer renders a native `<select>`.
   * Both share the `--hit-field` height (40px, 48px on a coarse pointer), so a
   * select lines up with comptoir inputs and buttons in a row. See ADR-009.
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

  /** Whether the panel shows its search box: the bound `filter`, or past
   *  the threshold when the caller left it unset. */
  get effectiveFilter(): boolean {
    return this.filter ?? (this.filteredOptions?.length ?? 0) > EF_SELECT_FILTER_THRESHOLD;
  }

  /** The overlay target. A comptoir select lives in cards and table rows
   *  that scroll, which would clip a panel attached in place. */
  get effectiveAppendTo(): string | undefined {
    return this.appendTo ?? (this.variant === 'comptoir' ? 'body' : undefined);
  }

  /* effectiveId / effectivePlaceholder / effectiveAriaLabel /
     errorsId all inherited from AbstractEfFormControl. */

  /**
   * The text an unset select shows: the placeholder, or nothing. A blank or
   * dash-only placeholder (a translation of " " or "—") counts as nothing, so
   * the unset state can never read as "— —". The native variant used to wrap
   * any truthy placeholder in dashes, which turned " " into exactly that.
   */
  get placeholderText(): string {
    const text = this.effectivePlaceholder.trim();
    return /^[\s\u2014\u2013-]*$/.test(text) ? '' : text;
  }

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

  private _describedByPt?: { ids: string | null; pt: Record<string, Record<string, string | null>> };

  /**
   * PrimeNG pass-through that puts `aria-describedby` (hint, then errors)
   * on the element the `<label for>` points at: `p-select`'s
   * `span[role=combobox]` (`label`) and `p-multiselect`'s hidden focus
   * input (`hiddenInput`). Neither component has an input for it. Cached
   * per id list so change detection does not hand PrimeNG a new object
   * every pass.
   */
  get describedByPt(): Record<string, Record<string, string | null>> {
    const ids = this.describedBy(this.showRequired || !!this.serverErrors);
    if (this._describedByPt?.ids !== ids) {
      const attrs = { 'aria-describedby': ids };
      this._describedByPt = { ids, pt: { label: attrs, hiddenInput: attrs } };
    }
    return this._describedByPt.pt;
  }

  /** Always include `.es` so the global Comptoir skin in
   *  `_patterns.scss` always finds a hook, regardless of what the
   *  consumer passes via `styleClass`. */
  get effectiveStyleClass(): string {
    return [
      'es',
      this.size === 'small' ? 'es--sm' : null,
      this.variant === 'comptoir' ? 'es--comptoir' : null,
      this.styleClass,
    ]
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
    return this.resolvedExternalErrors() ?? this.ngControl?.control?.errors?.['serverError'] ?? null;
  }

  get isInvalid(): boolean {
    if (this.resolvedExternalErrors()?.length) return true;
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
    this.updateDisabledState(isDisabled);
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
