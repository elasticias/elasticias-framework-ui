/**
 * Built-in cell-rendering types. Each type ships a default cell
 * template in ef-data-card; the `'custom'` type defers to a
 * `<ng-template efColumnTemplate="…">` projected by the consumer.
 *
 * Lives in `@elasticias/screens` so AbstractSearchScreenV2 can return
 * column descriptors from its `add*Column` builders without a
 * circular import on `@elasticias/ui`. ef-data-card consumes the same
 * type via re-export.
 */
export type EfDataCardColumnType =
    | 'text'
    | 'number'
    | 'money'
    | 'date'
    | 'datetime'
    | 'boolean'
    | 'mono'
    | 'chip'
    | 'status'
    | 'reference'
    | 'custom';

export type EfDataCardColumnAlign = 'start' | 'center' | 'end';

export type EfDataCardSortDirection = 'asc' | 'desc';

export interface EfDataCardSort {
    /** Backend field name (matches `column.sortField` or `column.field`). */
    field: string;
    direction: EfDataCardSortDirection;
}

export interface EfDataCardColumn {
    /**
     * Stable column identifier. Used as the trackBy key, the
     * `efColumnTemplate` selector, and the cell's `data-col`
     * attribute. Must be unique within a table.
     */
    id: string;

    /** Dotted path into the row (defaults to `id`). */
    field?: string;

    /** Direct header text — used only when `headerKey` is empty. */
    header?: string;
    /** Translation key for the header — preferred. */
    headerKey?: string;

    /** Built-in renderer; falls back to `'text'`. */
    type?: EfDataCardColumnType;

    /** `'end'` is auto-applied for `'number'` / `'money'`. */
    align?: EfDataCardColumnAlign;

    /**
     * Set `false` to keep the column out of the Columns picker, so the
     * viewer cannot hide it. Structural columns (`select`, `actions`) are
     * always excluded regardless.
     */
    hideable?: boolean;

    /** Inline CSS width (e.g. `'40px'`, `'15%'`). */
    width?: string;

    /** Extra CSS classes to apply on the `<td>` (e.g. `'num'`). */
    cellClass?: string;

    /** Sort enabled for this column (default: `false` — opt-in). */
    sortable?: boolean;
    /** Backend sort field — defaults to `field` then `id`. */
    sortField?: string;

    /** Date / datetime: pipe format string (default: `'shortDate'` / `'short'`). */
    dateFormat?: string;

    /** Money: ISO currency code (default: `'EUR'`). */
    currencyCode?: string;
    /** Money: how the symbol renders (default: `'symbol'`). */
    currencyDisplay?: 'symbol' | 'code' | 'name';

    /** Locale for number / date / currency pipes (default: `'fr-FR'`). */
    locale?: string;

    /** Number/money fraction digits. */
    minFractionDigits?: number;
    maxFractionDigits?: number;

    /** Reference data lookup key for `type: 'reference'`. */
    referenceKey?: string;
    referenceValueField?: string;
    referenceLabelField?: string;

    /** Chip column: prefix prepended to the value to form the class
     * (e.g. `'chip-'` so value `'pending'` → `'chip chip-pending'`). */
    chipPrefix?: string;
}

/**
 * Caller-friendly opts for `addReferenceColumn` — exposes
 * `valueField` / `labelField` shorthands instead of the verbose
 * `referenceValueField` / `referenceLabelField` properties.
 */
export interface EfReferenceColumnOpts extends Partial<EfDataCardColumn> {
    /** Shorthand for `referenceValueField` (defaults to `'id'`). */
    valueField?: string;
    /** Shorthand for `referenceLabelField` (defaults to `'label'`). */
    labelField?: string;
}
