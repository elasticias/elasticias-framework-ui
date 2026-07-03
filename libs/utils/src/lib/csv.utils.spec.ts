import { describe, expect, it } from 'vitest';
import { CsvUtils } from './csv.utils';

interface Row { name: string; qty: number; note: string | null; }

const columns = [
  { key: 'name', header: 'Produit' },
  { key: 'qty', header: 'Qté' },
  { key: 'note', header: 'Note' },
] as const;

describe('CsvUtils.toCsv', () => {
  it('emits a header row then one line per row, ;-separated, CRLF line endings', () => {
    const csv = CsvUtils.toCsv<Row>([{ name: 'Musc', qty: 3, note: 'ok' }], columns as never);
    expect(csv).toBe('Produit;Qté;Note\r\nMusc;3;ok');
  });

  it('quotes and escapes values containing separator, quotes or newlines', () => {
    const csv = CsvUtils.toCsv<Row>(
      [{ name: 'A;B', qty: 1, note: 'said "hi"\nnext' }],
      columns as never,
    );
    expect(csv).toBe('Produit;Qté;Note\r\n"A;B";1;"said ""hi""\nnext"');
  });

  it('renders null/undefined as empty and supports a custom separator', () => {
    const csv = CsvUtils.toCsv<Row>([{ name: 'X', qty: 0, note: null }], columns as never, ',');
    expect(csv).toBe('Produit,Qté,Note\r\nX,0,');
  });

  it('neutralizes a string value that looks like a formula (CSV injection guard)', () => {
    const csv = CsvUtils.toCsv<Row>(
      [{ name: '=HYPERLINK("http://evil")', qty: 1, note: null }],
      columns as never,
    );
    expect(csv).toBe('Produit;Qté;Note\r\n"\'=HYPERLINK(""http://evil"")";1;');
  });

  it('leaves a negative NUMBER untouched — the formula guard only applies to strings', () => {
    const csv = CsvUtils.toCsv<Row>([{ name: 'X', qty: -5, note: null }], columns as never);
    expect(csv).toBe('Produit;Qté;Note\r\nX;-5;');
  });

  it('prefixes "@" and "+" led string values so Excel does not treat them as formulas', () => {
    const csv = CsvUtils.toCsv<Row>(
      [
        { name: '@name', qty: 1, note: '+33612345678' },
        { name: 'ok', qty: 2, note: null },
      ],
      columns as never,
    );
    expect(csv).toBe(
      'Produit;Qté;Note\r\n"\'@name";1;"\'+33612345678"\r\nok;2;',
    );
  });
});
