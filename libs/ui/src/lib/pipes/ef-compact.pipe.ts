import { Pipe, PipeTransform } from '@angular/core';
import { NumberUtils } from '@elasticias/utils';

/**
 * Compact human-readable rendering of a number for KPI displays:
 * 1000 → "1 k", 2_500_000 → "2,5 M" (fr-MA locale, decimal comma).
 */
@Pipe({ name: 'efCompact', standalone: true, pure: true })
export class EfCompactPipe implements PipeTransform {
  transform(value: number | null | undefined, maxDecimals = 2): string {
    return value === null || value === undefined ? '' : NumberUtils.compact(value, { maxDecimals });
  }
}
