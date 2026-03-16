import { Pipe, PipeTransform } from '@angular/core';

/**
 * Merged currency pipe from ERP (AppCurrencyPipe) and Store (CurrencyFormatPipe).
 * Uses Intl.NumberFormat for formatting — no CurrencyPipe dependency needed.
 * Default: MAD currency, fr-MA locale.
 */
@Pipe({ name: 'efCurrency', standalone: true })
export class EfCurrencyPipe implements PipeTransform {
  transform(value: number | null | undefined, currency = 'MAD', locale = 'fr-MA'): string {
    if (value == null) return '';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
}
