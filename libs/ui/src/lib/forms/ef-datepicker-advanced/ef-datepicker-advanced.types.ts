// EfDatePresetKey + EfDateRange now live in @elasticias/screens so
// AbstractSearchScreenV2 can own dateRange state without circular
// deps. Re-exported here so consumers that already import from
// `@elasticias/ui` keep working unchanged.
export type { EfDatePresetKey, EfDateRange } from '@elasticias/screens';

/**
 * One row in the picker's presets list. UI-specific — carries the
 * optional `compute` and `hintFn` callbacks that the picker invokes
 * at render time. Stays in @elasticias/ui because it's a render-time
 * descriptor, not a state shape.
 */
export interface EfDatePreset {
    /** Stable key. Built-in keys (`today`, `this_week`, …) are computed
     *  automatically; custom keys must come with a date computer. */
    key: import('@elasticias/screens').EfDatePresetKey;

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
