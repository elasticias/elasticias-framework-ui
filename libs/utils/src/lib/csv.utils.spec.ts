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
});
