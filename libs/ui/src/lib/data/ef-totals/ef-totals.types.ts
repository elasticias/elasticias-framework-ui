/**
 * One key-value row in the totals stack.
 */
export interface EfTotalsRow {
    /** Translation key for the row label — preferred. */
    labelKey?: string;
    /** Direct label fallback when `labelKey` is empty. */
    label?: string;

    /** Pre-formatted value text (e.g. `'12 350,00'`). */
    value: string | number;

    /** Optional small unit text right of the value (e.g. `'MAD'`). */
    unit?: string;

    /** `'discount'` paints the value in `--st-pending-fg`. */
    tone?: 'default' | 'discount';
}

/**
 * Display-size grand row (Bricolage 28px) shown after a divider.
 * Same shape as a regular row but rendered with the `.grand-row` class.
 */
export interface EfTotalsGrand {
    labelKey?: string;
    label?: string;
    value: string | number;
    /** Currency / unit suffix shown smaller after the big number. */
    currency?: string;
}
