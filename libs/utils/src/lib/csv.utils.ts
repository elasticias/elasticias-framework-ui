export interface CsvColumn<T> {
  key: keyof T & string;
  header: string;
}

export class CsvUtils {
  /** fr-MA Excel convention: ';' separator. Output has a header row, CRLF endings. */
  static toCsv<T>(
    rows: ReadonlyArray<T>,
    columns: ReadonlyArray<CsvColumn<T>>,
    separator = ';',
  ): string {
    // Excel/LibreOffice treat cells starting with =, +, -, @ or a tab as formulas.
    // Operator-entered client/product names could carry these as their first
    // character, so string values are neutralized (numbers are never affected —
    // the guard only applies before coercion, when `raw` is actually a string).
    const needsFormulaGuard = (value: string): boolean => /^[=+\-@\t]/.test(value);
    const escape = (raw: unknown): string => {
      if (raw === null || raw === undefined) return '';
      const isString = typeof raw === 'string';
      let s = String(raw);
      const guard = isString && needsFormulaGuard(s);
      if (guard) s = `'${s}`;
      return guard || s.includes(separator) || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const header = columns.map((c) => escape(c.header)).join(separator);
    const lines = rows.map((r) => columns.map((c) => escape(r[c.key])).join(separator));
    return [header, ...lines].join('\r\n');
  }

  /** UTF-8 BOM so Excel opens French accents / Arabic correctly. */
  static download(filename: string, csv: string): void {
    const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
