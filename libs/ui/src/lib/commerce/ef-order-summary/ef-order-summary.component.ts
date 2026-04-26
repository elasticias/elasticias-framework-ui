import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FieldsetModule } from 'primeng/fieldset';
import { OrderLineItem } from '../ef-order-builder/ef-order-builder.component.types';

/**
 * Product count group entry for displaying grouped counts
 */
export interface ProductCountGroup {
  code: string;
  label: string;
  count: number;
  column: number;
}

/**
 * Reference data item for product count group labels
 */
export interface ProductCountGroupLabel {
  code: string;
  label: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
  column?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Product with countGroup field
 */
export interface ProductWithCountGroup {
  countGroup?: string;
  [key: string]: unknown;
}

/**
 * Displays a summary of product quantities grouped by their countGroup field.
 * Maps countGroup codes to labels from product_count_group_labels reference data.
 *
 * @example
 * <ef-order-summary
 *   [orderLines]="orderLines()"
 *   [countGroupLabels]="countGroupLabels"
 * />
 */
@Component({
  selector: 'ef-order-summary',
  standalone: true,
  imports: [CommonModule, FieldsetModule],
  templateUrl: './ef-order-summary.component.html',
  styleUrl: './ef-order-summary.component.scss',
})
export class EfOrderSummaryComponent {
  /**
   * Order line items to summarize
   */
  orderLines = input.required<OrderLineItem[]>();

  /**
   * Product count group labels from reference data
   */
  countGroupLabels = input<ProductCountGroupLabel[]>([]);

  /**
   * Legend text for the fieldset
   */
  legend = input<string>('Récapitulatif');

  /**
   * Computed grouped counts by countGroup
   */
  groupedCounts = computed<ProductCountGroup[]>(() => {
    const lines = this.orderLines();
    const labels = this.countGroupLabels();

    const countMap = new Map<string, number>();

    lines.forEach((line) => {
      const product = line.product as ProductWithCountGroup;
      const countGroup = (line as { countGroup?: string }).countGroup || product?.countGroup;

      if (countGroup) {
        const currentCount = countMap.get(countGroup) || 0;
        countMap.set(countGroup, currentCount + (line.quantity || 0));
      }
    });

    const groups: ProductCountGroup[] = [];

    countMap.forEach((count, code) => {
      const labelItem = labels.find(
        (l) => l.code.toUpperCase() === code.toUpperCase(),
      );
      groups.push({
        code,
        label: labelItem?.label || code,
        count,
        column: labelItem?.column ?? 1,
      });
    });

    // Sort by the sortOrder from labels, then by label alphabetically
    groups.sort((a, b) => {
      const labelA = labels.find(
        (l) => l.code.toUpperCase() === a.code.toUpperCase(),
      );
      const labelB = labels.find(
        (l) => l.code.toUpperCase() === b.code.toUpperCase(),
      );
      const orderA = labelA?.sortOrder ?? 999;
      const orderB = labelB?.sortOrder ?? 999;

      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.label.localeCompare(b.label);
    });

    return groups;
  });

  /**
   * Total quantity across all groups
   */
  totalCount = computed(() => {
    return this.groupedCounts().reduce((sum, group) => sum + group.count, 0);
  });

  /**
   * Split groups into columns based on column field from reference data
   */
  columnGroups = computed(() => {
    const groups = this.groupedCounts();
    const columnMap = new Map<number, ProductCountGroup[]>();

    groups.forEach((group) => {
      const colIndex = group.column;
      if (!columnMap.has(colIndex)) {
        columnMap.set(colIndex, []);
      }
      const col = columnMap.get(colIndex);
      if (col) {
        col.push(group);
      }
    });

    // Sort columns by key and return as array
    const sortedKeys = Array.from(columnMap.keys()).sort((a, b) => a - b);
    return sortedKeys.map((key) => columnMap.get(key) as ProductCountGroup[]);
  });

  /**
   * Check if there are any groups to display
   */
  hasGroups = computed(() => this.groupedCounts().length > 0);
}
