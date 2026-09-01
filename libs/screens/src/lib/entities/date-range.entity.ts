/**
 * Built-in date-preset keys. `AbstractSearchScreenV2.buildDefaultDateRange`
 * and `ef-datepicker-advanced` recognise these and compute start/end
 * automatically; consumers can also pass a `string` for custom keys
 * paired with a compute callback in the picker's preset list.
 */
export type EfDatePresetKey =
    | 'today'
    | 'this_week'
    | 'this_month'
    | 'last_30_days'
    | 'last_90_days'
    | 'this_quarter'
    | 'this_year'
    | 'custom'
    | string;

/**
 * Active date-range filter, owned by `AbstractSearchScreenV2.dateRange`
 * and round-tripped through `ef-datepicker-advanced`. `start`/`end` are
 * inclusive day boundaries (both at 00:00 local time).
 */
export interface EfDateRange {
    /** Inclusive start. */
    start: Date;

    /** Inclusive end — 00:00 local on the last day. Strict comparisons
     *  should treat this as `< end + 1 day`. */
    end: Date;

    /** Which preset is active (`'custom'` for a manually picked range). */
    presetKey: EfDatePresetKey;

    /** Resolved literal label — formatted date range for `'custom'`,
     *  the preset's `label` (or built-in hint) for built-ins. Used by
     *  the trigger as the fallback when `labelKey` is empty. */
    label: string;

    /** Translation key for the trigger's bold value text. The picker
     *  renders this through `| translate` so it stays reactive when
     *  translations finish loading or the language changes. */
    labelKey?: string;
}
