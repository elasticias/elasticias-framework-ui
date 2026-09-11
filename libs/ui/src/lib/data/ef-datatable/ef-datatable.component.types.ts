import { TemplateRef } from '@angular/core';

/**
 * Column alignment options for ef-datatable
 */
export type EfDatatableColumnAlign = 'start' | 'center' | 'end';

/**
 * Column data types for automatic formatting
 */
export type EfDatatableColumnType =
  | 'text'
  | 'number'
  | 'money'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'reference';

/**
 * Column definition interface for ef-datatable
 */
export interface EfDatatableColumn {
  /** Property name in data object */
  field: string;

  /** Column header text */
  header: string;

  /** Data type for automatic formatting (default: 'text') */
  type?: EfDatatableColumnType;

  /** Text alignment (default: 'start' except money/number = 'end') */
  align?: EfDatatableColumnAlign;

  /** Enable sorting for this column (default: true) */
  sortable?: boolean;

  /** Enable resizing for this column (default: true) */
  resizable?: boolean;

  /** CSS width (e.g., '100px', 'w-[200px]') */
  width?: string;

  /** Custom Tailwind or CSS classes */
  styleClass?: string;

  // Type-specific formatting options

  /** Date format string for DatePipe (default: 'shortDate') */
  dateFormat?: string;

  /** Currency code for money type (default: 'EUR') */
  currencyCode?: string;

  /** Currency display format (default: 'symbol') */
  currencyDisplay?: 'symbol' | 'code' | 'name';

  /** Locale for number/date/currency formatting (default: 'fr-FR') */
  locale?: string;

  /** Minimum fraction digits for numbers (default: 2) */
  minFractionDigits?: number;

  /** Maximum fraction digits for numbers (default: 2) */
  maxFractionDigits?: number;

  // Reference data integration

  /** Key for context.ref.get() to lookup reference data */
  referenceKey?: string;

  /** Field to match in reference data (default: 'code') */
  referenceValueField?: string;

  /** Field to display from reference data (default: 'name') */
  referenceLabelField?: string;

  // Template support

  /** Custom cell template (receives rowData and column) */
  template?: TemplateRef<unknown>;

  /** Custom header template (receives column) */
  headerTemplate?: TemplateRef<unknown>;
}

/**
 * Action column configuration for edit/delete/duplicate buttons
 */
export interface EfDatatableActions {
  /** Show action column (default: true if config provided) */
  show?: boolean;

  /** Action column width (default: 'w-20') */
  width?: string;

  /** Show edit button (default: true) */
  showEdit?: boolean;

  /** Show delete button (default: true) */
  showDelete?: boolean;

  /** Show duplicate button (default: false) */
  showDuplicate?: boolean;

  /** Position of action column (default: 'end') */
  position?: 'start' | 'end';
}

/**
 * Main table configuration options
 */
export interface EfDatatableConfig {
  // Data binding

  /** Enable lazy loading (default: true) */
  lazy?: boolean;

  /** Unique identifier field name (default: 'id') */
  dataKey?: string;

  // Pagination

  /** Enable pagination (default: true) */
  paginator?: boolean;

  /** Rows per page (default: 10) */
  rows?: number;

  /** Page size options (default: [5, 10, 25, 50]) */
  rowsPerPageOptions?: number[];

  // Scrolling

  /** Enable scrolling (default: true) */
  scrollable?: boolean;

  /** Scroll viewport height (default: '300px') */
  scrollHeight?: string;

  // Column features

  /** Enable column resizing (default: true) */
  resizableColumns?: boolean;

  /** Column resize behavior (default: 'expand') */
  columnResizeMode?: 'fit' | 'expand';

  // State persistence

  /** State storage location (default: 'local') */
  stateStorage?: 'local' | 'session';

  /** State storage key (auto-generated if not provided) */
  stateKey?: string;

  // Styling

  /** Table size (default: 'small') */
  size?: 'small' | 'large';

  /** Custom CSS classes (default: 'text-sm') */
  styleClass?: string;

  /** Inline table styles */
  tableStyle?: Record<string, string>;

  // i18n

  /**
   * Translation key for the no-data message. Prefer this over
   * `emptyMessage`: the old default was a hardcoded, unaccented French
   * string that rendered in every language.
   */
  emptyMessageKey?: string;

  /** @deprecated Untranslatable. Use `emptyMessageKey`. */
  emptyMessage?: string;

  /** Pagination report template */
  currentPageReportTemplate?: string;
}

/**
 * Default table configuration values
 */
export const EF_DATATABLE_DEFAULTS: Required<EfDatatableConfig> = {
  lazy: true,
  dataKey: 'id',
  paginator: true,
  rows: 10,
  rowsPerPageOptions: [5, 10, 25, 50],
  scrollable: true,
  scrollHeight: '300px',
  resizableColumns: true,
  columnResizeMode: 'expand',
  stateStorage: 'local',
  stateKey: '',
  size: 'small',
  styleClass: 'text-sm',
  tableStyle: { 'min-width': '50rem' },
  emptyMessageKey: 'common_empty_none_yet',
  emptyMessage: '',
  currentPageReportTemplate: '{currentPage} de {totalPages}',
};

/**
 * Default column configuration values
 */
export const EF_DATATABLE_COLUMN_DEFAULTS: Partial<EfDatatableColumn> = {
  type: 'text',
  sortable: true,
  resizable: true,
  dateFormat: 'shortDate',
  currencyCode: 'MAD',
  currencyDisplay: 'symbol',
  locale: 'fr-FR',
  minFractionDigits: 2,
  maxFractionDigits: 2,
  referenceValueField: 'code',
  referenceLabelField: 'label',
};

/**
 * Default action column configuration
 */
export const EF_DATATABLE_ACTIONS_DEFAULTS: Required<EfDatatableActions> = {
  show: true,
  width: 'w-20',
  showEdit: true,
  showDelete: true,
  showDuplicate: false,
  position: 'end',
};

/**
 * Helper function to determine column alignment based on type
 * @param column - The column configuration
 * @returns The computed alignment
 */
export function getColumnAlignment(
  column: EfDatatableColumn,
): EfDatatableColumnAlign {
  if (column.align) return column.align;
  if (column.type === 'money' || column.type === 'number') return 'end';
  return 'start';
}

/**
 * Helper function to merge column configuration with defaults
 * @param column - The column configuration
 * @returns Column with defaults applied
 */
export function mergeColumnDefaults(
  column: EfDatatableColumn,
): EfDatatableColumn {
  return { ...EF_DATATABLE_COLUMN_DEFAULTS, ...column };
}
