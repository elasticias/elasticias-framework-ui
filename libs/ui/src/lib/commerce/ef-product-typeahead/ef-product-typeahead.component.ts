import {
  Component,
  ChangeDetectionStrategy,
  booleanAttribute,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  HighlightSegment,
  ProductTypeaheadRow,
  ProductTypeaheadSelection,
} from './ef-product-typeahead.component.types';

/**
 * Keyboard-navigable product search. Filters products by display name,
 * highlights the match, exposes per-product variant chips, and emits the
 * chosen product + active variant + unit price. Pure input-driven — no API.
 *
 * @example
 * <ef-product-typeahead
 *   [products]="products()"
 *   productKeyField="id"
 *   placeholderKey="label.search_product"
 *   (productSelect)="onPicked($event)" />
 */
@Component({
  selector: 'ef-product-typeahead',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './ef-product-typeahead.component.html',
  styleUrl: './ef-product-typeahead.component.scss',
})
export class EfProductTypeaheadComponent {
  products = input.required<Record<string, unknown>[]>();
  productKeyField = input<string>('id');
  placeholderKey = input<string>('');
  disabled = input(false, { transform: booleanAttribute });
  currency = input<string>('MAD');
  locale = input<string>('fr-FR');
  /**
   * How variants are presented.
   * - `true` (default): compact — one row per product with inline variant
   *   chips (e.g. `30ml` / `50ml`); clicking a chip switches the active
   *   variant + price.
   * - `false`: V1 expanded — one row per active variant, with the variant
   *   title composed into the label (`Name - 30ml`) and its own price.
   *
   * Display-only: the emitted `ProductTypeaheadSelection` (product + chosen
   * variant + unit price) is identical either way.
   */
  showVariants = input(true, { transform: booleanAttribute });

  productSelect = output<ProductTypeaheadSelection>();

  query = signal('');
  open = signal(false);
  highlightedIndex = signal(0);
  /** Map of product key -> chosen variant index (defaults to 0). */
  activeVariant = signal<Record<string, number>>({});

  private static norm(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }

  rows = computed<ProductTypeaheadRow[]>(() => {
    const q = this.query().trim();
    if (q.length < 2) return [];
    const keyField = this.productKeyField();
    const nq = EfProductTypeaheadComponent.norm(q);
    const expand = !this.showVariants();

    return this.products()
      .flatMap((product) => {
        const baseLabel = (product['displayName'] ||
          product['name'] ||
          '') as string;
        const key = String(product[keyField]);
        const variants = (
          (product['variants'] as Record<string, unknown>[] | undefined) ?? []
        ).filter((v) => v['isActive'] !== false);

        // V1 expanded mode: one row per active variant, with the variant
        // title composed into the label and resolved as the row's sole
        // variant (so price + emitted payload follow it). A variant-less
        // product still yields one base row.
        if (expand && variants.length > 0) {
          return variants.map((variant, vi) => {
            const label = `${baseLabel} - ${variant['title']}`;
            const variantId = variant['variantId'];
            return {
              key: variantId != null ? `${key}:${variantId}` : `${key}:${vi}`,
              product,
              label,
              variants: [variant],
              segments: this.buildSegments(label, q),
            };
          });
        }

        // Compact mode (variant chips), or a product with no variants.
        return [
          {
            key,
            product,
            label: baseLabel,
            variants,
            segments: this.buildSegments(baseLabel, q),
          },
        ];
      })
      .filter((row) => EfProductTypeaheadComponent.norm(row.label).includes(nq));
  });

  buildSegments(label: string, query: string): HighlightSegment[] {
    const nLabel = EfProductTypeaheadComponent.norm(label);
    const nq = EfProductTypeaheadComponent.norm(query.trim());
    const at = nLabel.indexOf(nq);
    if (nq.length === 0 || at === -1) return [{ text: label, mark: false }];
    return [
      { text: label.slice(0, at), mark: false },
      { text: label.slice(at, at + nq.length), mark: true },
      { text: label.slice(at + nq.length), mark: false },
    ].filter((s) => s.text.length > 0);
  }

  onInput(value: string): void {
    this.query.set(value);
    this.open.set(true);
    this.highlightedIndex.set(0);
  }

  moveHighlight(delta: number): void {
    const max = this.rows().length - 1;
    if (max < 0) return;
    const next = Math.min(max, Math.max(0, this.highlightedIndex() + delta));
    this.highlightedIndex.set(next);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.open.set(true);
      this.moveHighlight(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.moveHighlight(-1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.selectHighlighted();
    } else if (event.key === 'Escape') {
      this.open.set(false);
    }
  }

  /** Active variant index for a row (defaults to 0). */
  variantIndexOf(row: ProductTypeaheadRow): number {
    return this.activeVariant()[row.key] ?? 0;
  }

  variantOf(row: ProductTypeaheadRow): Record<string, unknown> | null {
    return row.variants[this.variantIndexOf(row)] ?? null;
  }

  priceOf(row: ProductTypeaheadRow): number {
    const variant = this.variantOf(row);
    return (variant?.['price'] ??
      row.product['unitPrice'] ??
      row.product['salePrice'] ??
      0) as number;
  }

  setActiveVariant(row: ProductTypeaheadRow, index: number): void {
    this.activeVariant.update((m) => ({ ...m, [row.key]: index }));
  }

  selectRow(row: ProductTypeaheadRow): void {
    this.productSelect.emit({
      product: row.product,
      variant: this.variantOf(row),
      unitPrice: this.priceOf(row),
    });
    // Keep the picked product visible in the field (the bar fills; the
    // consumer adds the line explicitly). Just close the results menu.
    this.query.set(row.label);
    this.open.set(false);
  }

  selectHighlighted(): void {
    const row = this.rows()[this.highlightedIndex()];
    if (row) this.selectRow(row);
  }

  /** Clear the field after the consumer has consumed the selection. */
  reset(): void {
    this.query.set('');
    this.open.set(false);
    this.highlightedIndex.set(0);
    this.activeVariant.set({});
  }
}
