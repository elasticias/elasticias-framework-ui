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

/**
 * Where a column goes when the table becomes a list on a phone.
 *
 * - `primary`   — the line you scan for. One per table; the first is used.
 * - `secondary` — the muted line under it, joined with separators.
 * - `status`    — rendered as a badge in the row header rather than a field.
 * - `detail`    — only visible once the row is expanded.
 * - `hidden`    — not shown on mobile at all.
 *
 * Leave it unset and `ef-data-card` derives one: the first text-ish column
 * becomes `primary`, a `status`/`chip` column becomes `status`, money and
 * dates become `secondary`, and everything else falls to `detail`. Set it
 * only where the guess is wrong.
 */
export type EfDataCardColumnMobileRole =
    | 'primary'
    | 'secondary'
    | 'status'
    | 'detail'
    | 'hidden';

export interface EfDataCardColumn {
    /**
     * Stable column identifier. Used as the trackBy key, the
     * `efColumnTemplate` selector, and the cell's `data-col`
     * attribute. Must be unique within a table.
     */
    id: string;

    /** Dotted path into the row (defaults to `id`). */
    field?: string;

    /** Where this column goes in the mobile list. Derived when unset. */
    mobile?: EfDataCardColumnMobileRole;

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

    /**
     * Set `false` to keep this column out of a CSV export. Use it for
     * columns that only make sense on screen — a thumbnail, a rendered
     * badge with no underlying value. Defaults to exported.
     */
    exportable?: boolean;

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

/**
 * Payload for `ef-data-card`'s `(exportRequest)`.
 *
 * The card knows which columns are visible and in what order; it does not
 * know the query behind the rows, so it hands the host screen the column
 * set and lets the screen fetch the full result set and write the file.
 */
export interface EfDataCardExportRequest {
    /** Visible columns, in display order, minus the row-actions column. */
    columns: EfDataCardColumn[];
    /**
     * Resolves one cell for the file, using the same reference lookups the
     * table renders with. Supplied by the card so label resolution lives in
     * one place; the host applies it to the rows it fetches.
     */
    resolveCell: (row: unknown, col: EfDataCardColumn) => unknown;
}
