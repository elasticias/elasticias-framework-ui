/**
 * Sparkline series — array of numeric values, normalized to the
 * card's viewBox at render time. Pass an empty array to hide the
 * sparkline.
 */
export type EfKpiSparkline = ReadonlyArray<number>;

/**
 * Trend tone — drives the delta arrow color.
 * - `'up'`   → success green (`--st-delivered-fg`)
 * - `'down'` → danger red (`--st-cancelled-fg`)
 * - `'flat'` → muted grey
 */
export type EfKpiDeltaTone = 'up' | 'down' | 'flat';
