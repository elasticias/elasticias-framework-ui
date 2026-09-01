/**
 * Display shape for an active filter chip in the smart-bar. The
 * abstract search screen owns a writable signal of `ActiveFilter[]`
 * that consumers populate when an advanced filter is applied;
 * `removeFilter(key)` slices the matching entry out.
 */
export interface ActiveFilter {
    /** Stable identifier — passed back to `removeFilter`. */
    key: string;

    /** i18n key for the chip's label (e.g. `'filter_client'`). */
    labelKey: string;

    /** Pre-formatted display value (e.g. `'Leila Bennani'`,
     *  `'30 derniers jours'`). The chip renders this verbatim. */
    value: string;
}
