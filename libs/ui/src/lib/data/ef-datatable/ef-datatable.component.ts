import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  LOCALE_ID,
  OnInit,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Table, TableLazyLoadEvent, TableModule } from 'primeng/table';
import {
  EfDatatableActions,
  EfDatatableColumn,
  EfDatatableColumnAlign,
  EfDatatableConfig,
  EF_DATATABLE_ACTIONS_DEFAULTS,
  EF_DATATABLE_DEFAULTS,
  getColumnAlignment,
  mergeColumnDefaults,
} from './ef-datatable.component.types';
import { ScreenContext } from '@elasticias/screens';
import { DatatableActionBarComponent } from '../datatable-actionbar/datatable-actionbar.component';

/**
 * SearchEntity interface for datatable consumption.
 * Matches the shape expected from the consuming application's SearchEntity.
 */
export interface DatatableSearchEntity {
  items?: Record<string, unknown>[];
  totalCount?: number;
  pagination?: {
    pageNumber: number;
    pageSize: number;
  };
  sort?: Array<{
    field: string;
    sortDirection: string;
  }>;
}

/**
 * ef-datatable - Reusable table component wrapping PrimeNG Table
 *
 * Features:
 * - Typed columns with automatic formatting (text, number, money, date, datetime, boolean, reference)
 * - Built-in action column with edit/delete/duplicate buttons
 * - Support for custom templates
 * - PassThrough (PT) support for deep customization
 * - Lazy loading, pagination, sorting, column resizing
 * - State persistence (localStorage/sessionStorage)
 * - Reference data integration via ScreenContext
 *
 * @example
 * ```html
 * <ef-datatable
 *   [columns]="tableColumns"
 *   [searchEntity]="searchEntity"
 *   [context]="context"
 *   [screenStateKey]="screenStateKey"
 *   [actions]="{ showDuplicate: true }"
 *   (editRow)="edit($event)"
 *   (deleteRow)="delete($event)"
 *   (lazyLoad)="search($event)">
 * </ef-datatable>
 * ```
 */
@Component({
  selector: 'ef-datatable',
  standalone: true,
  templateUrl: './ef-datatable.component.html',
  styleUrl: './ef-datatable.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    TableModule,
    TranslateModule,
    DatatableActionBarComponent,
  ],
})
export class EfDatatableComponent implements OnInit {
  /**
   * Reference to the underlying PrimeNG Table component
   */
  @ViewChild('pTable') pTable?: Table;

  selectedItem: Record<string, unknown> | undefined;

  // ============================================================================
  // INPUTS
  // ============================================================================

  /**
   * Column definitions with type, alignment, and formatting options
   */
  columns = input<EfDatatableColumn[]>([]);

  /**
   * Table configuration (pagination, scrolling, sizing, etc.)
   */
  config = input<EfDatatableConfig>({});

  /**
   * Action column configuration (edit/delete/duplicate buttons)
   */
  actions = input<EfDatatableActions | undefined>();

  /**
   * SearchEntity containing items, pagination, etc.
   */
  searchEntity = input<DatatableSearchEntity | undefined>();

  /**
   * ScreenContext for reference data access
   */
  context = input<ScreenContext | undefined>();

  /**
   * PassThrough options for deep DOM customization
   */
  pt = input<Record<string, unknown>>();

  /**
   * Screen state key for state persistence (auto-generates stateKey if not provided in config)
   */
  screenStateKey = input<string | undefined>();

  // ============================================================================
  // OUTPUTS
  // ============================================================================

  /**
   * Emitted when edit button is clicked (emits row ID)
   */
  editRow = output<unknown>();

  /**
   * Emitted when delete button is clicked (emits row ID)
   */
  deleteRow = output<unknown>();

  /**
   * Emitted when duplicate button is clicked (emits row ID)
   */
  duplicateRow = output<unknown>();

  /**
   * Emitted on lazy load events (pagination, sorting, filtering)
   */
  lazyLoad = output<TableLazyLoadEvent>();

  /**
   * Emitted when a row is selected
   */
  rowSelect = output<unknown>();

  // ============================================================================
  // INTERNAL STATE
  // ============================================================================

  /**
   * Loading indicator
   */
  loading = signal(false);

  /**
   * Merged configuration with defaults
   */
  mergedConfig!: Required<EfDatatableConfig>;

  /**
   * Merged action configuration with defaults
   */
  mergedActions!: Required<EfDatatableActions>;

  /**
   * Processed columns with defaults and computed alignment
   * Reactive to changes in columns input
   */
  processedColumns = computed(() => {
    return this.columns().map(col => {
      const merged = mergeColumnDefaults(col);
      return {
        ...merged,
        align: getColumnAlignment(merged)
      };
    });
  });

  /**
   * Computed sort field from searchEntity for restoring table state
   */
  sortField = computed(() => {
    const sort = this.searchEntity()?.sort;
    return sort && sort.length > 0 ? sort[0].field : undefined;
  });

  /**
   * Computed sort order from searchEntity for restoring table state
   * 1 = ascending, -1 = descending
   */
  sortOrder = computed(() => {
    const sort = this.searchEntity()?.sort;
    if (sort && sort.length > 0) {
      return sort[0].sortDirection === 'Ascending' ? 1 : -1;
    }
    return 1;
  });

  // Angular pipes for formatting (use app's configured locale)
  private readonly locale = inject(LOCALE_ID);
  private readonly datePipe = new DatePipe(this.locale);
  private readonly decimalPipe = new DecimalPipe(this.locale);
  private readonly currencyPipe = new CurrencyPipe(this.locale);

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================

  ngOnInit(): void {
    // Merge config with defaults
    this.mergedConfig = { ...EF_DATATABLE_DEFAULTS, ...this.config() };

    // Merge action config with defaults (only if actions are provided)
    if (this.actions()) {
      this.mergedActions = { ...EF_DATATABLE_ACTIONS_DEFAULTS, ...this.actions() };
    } else {
      this.mergedActions = { ...EF_DATATABLE_ACTIONS_DEFAULTS, show: false };
    }

    // Auto-generate state key if not provided
    if (!this.mergedConfig.stateKey && this.screenStateKey()) {
      this.mergedConfig.stateKey = `APP_TABLE_${this.screenStateKey()}`;
    }
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handle lazy loading events from PrimeNG Table
   * Prevents duplicate events caused by reactive sortField/sortOrder binding updates
   * @param event - Table lazy load event containing pagination, sorting, filtering info
   */
  handleLazyLoad(event: TableLazyLoadEvent): void {
    // Skip if this event matches the current searchEntity state exactly.
    // This indicates a reactive binding echo: after parent updates searchEntity,
    // our sortField()/sortOrder() computed signals update, PrimeNG detects the
    // binding change and fires onLazyLoad again with the same values.
    if (this.isBindingEcho(event)) {
      return;
    }

    this.lazyLoad.emit(event);
  }

  /**
   * Detects if the event is a reactive binding echo (matches current searchEntity state)
   */
  private isBindingEcho(event: TableLazyLoadEvent): boolean {
    const entity = this.searchEntity();
    if (!entity?.sort || entity.sort.length === 0) {
      return false;
    }

    const currentSort = entity.sort[0];
    const eventSortField = Array.isArray(event.sortField)
      ? event.sortField[0]
      : event.sortField;
    const eventSortOrder = event.sortOrder ?? 1;
    const currentSortOrder = currentSort.sortDirection === 'Ascending' ? 1 : -1;

    // Calculate current and event page numbers
    const currentPage = entity.pagination?.pageNumber || 1;
    const currentPageSize = entity.pagination?.pageSize || 10;
    const eventFirst = event.first ?? 0;
    const eventRows = event.rows ?? 10;
    const eventPage = Math.floor(eventFirst / eventRows) + 1;

    // If event matches current state exactly, it's a binding echo
    return (
      currentSort.field === eventSortField &&
      currentSortOrder === eventSortOrder &&
      currentPage === eventPage &&
      currentPageSize === eventRows
    );
  }

  /**
   * Handle edit button click
   * @param rowData - The row data object
   */
  handleEdit(rowData: Record<string, unknown>): void {
    const id = rowData[this.mergedConfig.dataKey];
    this.editRow.emit(id);
  }

  handleDelete(rowData: Record<string, unknown>): void {
    const id = rowData[this.mergedConfig.dataKey];
    this.deleteRow.emit(id);
  }

  handleDuplicate(rowData: Record<string, unknown>): void {
    const id = rowData[this.mergedConfig.dataKey];
    this.duplicateRow.emit(id);
  }

  // ============================================================================
  // FORMATTING METHODS
  // ============================================================================

  /**
   * Format cell value based on column type
   * @param rowData - The row data object
   * @param column - The column configuration
   * @returns Formatted string value
   */
  formatCellValue(rowData: Record<string, unknown>, column: EfDatatableColumn): string | null {
    const value = rowData[column.field];
    if (value == null) return '';

    switch (column.type) {
      case 'date':
        return this.datePipe.transform(value, column.dateFormat);

      case 'datetime':
        return this.datePipe.transform(value, 'short');

      case 'number':
        return this.decimalPipe.transform(
          value,
          `1.${column.minFractionDigits}-${column.maxFractionDigits}`
        );

      case 'money':
        return this.currencyPipe.transform(
          value,
          column.currencyCode,
          column.currencyDisplay,
          `1.${column.minFractionDigits}-${column.maxFractionDigits}`
        );

      case 'boolean':
        return value ? 'Oui' : 'Non';

      case 'reference':
        return this.resolveReferenceValue(rowData, column);

      default:
        return String(value);
    }
  }

  /**
   * Resolve reference data value to display label
   * @param rowData - The row data object
   * @param column - The column configuration
   * @returns Display label from reference data
   */
  private resolveReferenceValue(rowData: Record<string, unknown>, column: EfDatatableColumn): string {
    const ctx = this.context();
    if (!ctx || !column.referenceKey) {
      return String(rowData[column.field]);
    }

    const refData = ctx.ref.get(column.referenceKey)();
    const value = rowData[column.field];

    if (!refData || !Array.isArray(refData)) {
      return String(value);
    }

    const valueField = column.referenceValueField ?? 'code';
    const labelField = column.referenceLabelField ?? 'name';
    const match = refData.find(
      (item: Record<string, unknown>) => item[valueField] === value
    );

    return match ? String(match[labelField]) : String(value);
  }

  /**
   * Get CSS class for text alignment
   * @param align - Alignment option
   * @returns CSS class name
   */
  getAlignmentClass(align?: EfDatatableColumnAlign): string {
    switch (align) {
      case 'start':
        return 'text-start';
      case 'center':
        return 'text-center';
      case 'end':
        return 'text-end';
      default:
        return 'text-start';
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Reset table to first page and clear filters
   */
  reset(): void {
    this.pTable?.reset();
  }

  /**
   * Export table data as CSV
   */
  exportCSV(): void {
    this.pTable?.exportCSV();
  }

  /**
   * Get the current filter state
   */
  getFilters(): Record<string, unknown> | undefined {
    return this.pTable?.filters as Record<string, unknown> | undefined;
  }
}
