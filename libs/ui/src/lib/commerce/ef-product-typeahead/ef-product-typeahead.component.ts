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
 *   (select)="onPicked($event)" />
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

  select = output<ProductTypeaheadSelection>();

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

    return this.products()
      .map((product) => {
        const label = (product['displayName'] ||
          product['name'] ||
          '') as string;
        const variants = (
          (product['variants'] as Record<string, unknown>[] | undefined) ?? []
        ).filter((v) => v['isActive'] !== false);
        return {
          key: String(product[keyField]),
          product,
          label,
          ref: (product['reference'] || product['code'] || '') as string,
          variants,
          segments: this.buildSegments(label, q),
        };
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
}
