/**
 * Built-in preset keys. The component computes the start/end dates for
 * these from `today` at open time. Pass `'custom'` to indicate the
 * user picked a manual range.
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
 * One row in the presets list. The component ships a default set if
 * `[presets]` is omitted; consumers can replace or extend the list.
 */
export interface EfDatePreset {
    /** Stable key. Built-in keys (`today`, `this_week`, …) are computed
     *  automatically; custom keys must come with a date computer. */
    key: EfDatePresetKey;

    /** Translation key for the row label. */
    labelKey?: string;
    /** Direct label fallback when `labelKey` is empty. */
    label?: string;

    /**
     * Computer for non-built-in presets — given today, return start/end
     * (inclusive). For built-in keys this is provided by the component.
     */
    compute?: (today: Date) => { start: Date; end: Date };

    /** Optional secondary text right-aligned (e.g. `'5 j'`, `'T2'`). */
    hintFn?: (today: Date) => string;
}

/**
 * Emitted by `(rangeChange)` whenever the user picks a preset or applies
 * a custom range. `start`/`end` are inclusive day boundaries (both at
 * 00:00 local time).
 */
export interface EfDateRange {
    /** Inclusive start. */
    start: Date;
    /** Inclusive end (00:00 local on the last day — caller treats as
     *  `< end + 1 day` if doing strict comparisons). */
    end: Date;
    /** Which preset was active (`'custom'` for manual selection). */
    presetKey: EfDatePresetKey;
    /** Resolved label suitable for the trigger's bold value text. */
    label: string;
}
