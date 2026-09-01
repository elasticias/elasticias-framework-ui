interface CompactUnit {
  readonly threshold: number;
  readonly divisor: number;
  readonly suffix: string;
}

// Ordered largest-first so the first matching threshold wins.
const UNITS: readonly CompactUnit[] = [
  { threshold: 1_000_000_000, divisor: 1_000_000_000, suffix: 'Md' },
  { threshold: 1_000_000, divisor: 1_000_000, suffix: 'M' },
  { threshold: 1_000, divisor: 1_000, suffix: 'k' },
];

export class NumberUtils {
  /**
   * Compact human-readable number: 1000 → "1 k", 2_500_000 → "2,5 M" (fr decimal comma).
   * maxDecimals applies after scaling; trailing zeros stripped. Below 1000 → localized plain number.
   */
  static compact(value: number, opts?: { locale?: string; maxDecimals?: number }): string {
    if (!Number.isFinite(value)) return '';

    const locale = opts?.locale ?? 'fr-MA';
    const maxDecimals = opts?.maxDecimals ?? 2;

    if (value === 0) return '0';

    const sign = value < 0 ? '-' : '';
    const abs = Math.abs(value);

    const format = (n: number, decimals: number): string =>
      n.toLocaleString(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals,
      });

    let unit = UNITS.find((u) => abs >= u.threshold);
    if (!unit) {
      return sign + format(abs, maxDecimals);
    }

    let scaled = abs / unit.divisor;
    // Rounding at maxDecimals can push the scaled value up to (or past) the
    // next unit's threshold (e.g. 999_999.9 @ 1 decimal -> 1000.0 k). Re-scale
    // in that case so the boundary bumps to the next unit instead.
    const rounded = Number(scaled.toFixed(maxDecimals));
    if (rounded >= 1000) {
      const nextUnitIndex = UNITS.indexOf(unit) - 1;
      const nextUnit = nextUnitIndex >= 0 ? UNITS[nextUnitIndex] : undefined;
      if (nextUnit) {
        unit = nextUnit;
        scaled = abs / unit.divisor;
      }
    }

    return `${sign}${format(scaled, maxDecimals)}\u00A0${unit.suffix}`;
  }
}
