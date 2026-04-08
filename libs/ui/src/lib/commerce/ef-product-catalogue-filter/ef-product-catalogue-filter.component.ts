import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AccordionModule } from 'primeng/accordion';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ChipModule } from 'primeng/chip';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { EfLabelComponent } from '../../layout/ef-label/ef-label.component';

export interface CategoryItem {
  code: string;
  label: string;
  description?: string | null;
  isActive: boolean;
  sortOrder: number;
  metadata?: Record<string, unknown> | null;
  children?: CategoryItem[];
}

export interface CategoryGroup {
  code: string;
  label: string;
  description?: string | null;
  isActive: boolean;
  sortOrder: number;
  metadata?: Record<string, unknown> | null;
  children?: CategoryItem[];
}

export interface CategoryAssignment {
  type: string;
  code: string;
}

export interface SelectedFilter {
  type: string;
  code: string;
  label: string;
}

@Component({
  selector: 'ef-product-catalogue-filter',
  templateUrl: './ef-product-catalogue-filter.component.html',
  imports: [
    FormsModule,
    AccordionModule,
    BadgeModule,
    ButtonModule,
    CheckboxModule,
    ChipModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    EfLabelComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfProductCatalogueFilterComponent {
  /** Category groups from reference_data (product_categories items with children) */
  categoryGroups = input.required<CategoryGroup[]>();

  /** Products to calculate counts */
  products = input.required<Array<{ categoryAssignments?: CategoryAssignment[] }>>();

  /** Selected filters (two-way binding) */
  selectedFilters = model<SelectedFilter[]>([]);

  /** Emitted when filters change */
  filtersChanged = output<SelectedFilter[]>();

  /** Search terms for each category group */
  searchTerms = signal<Record<string, string>>({});

  /** Accordion panel values (expanded panels) */
  expandedPanels = computed(() =>
    this.categoryGroups()
      .filter((g) => g.children && g.children.length > 0)
      .map((g) => g.code)
  );

  /** Get filtered children for a category group based on search */
  getFilteredChildren(group: CategoryGroup): CategoryItem[] {
    const children = group.children || [];
    const searchTerm = this.searchTerms()[group.code]?.toLowerCase() || '';

    if (!searchTerm) {
      return children.filter((c) => c.isActive);
    }

    return children.filter(
      (c) => c.isActive && c.label.toLowerCase().includes(searchTerm)
    );
  }

  /** Get product count for a specific category item */
  getItemCount(groupCode: string, itemCode: string): number {
    return this.products().filter((product) =>
      product.categoryAssignments?.some(
        (ca) => ca.type === groupCode && ca.code === itemCode
      )
    ).length;
  }

  /** Check if a filter is selected */
  isFilterSelected(groupCode: string, itemCode: string): boolean {
    return this.selectedFilters().some(
      (f) => f.type === groupCode && f.code === itemCode
    );
  }

  /** Toggle a filter selection */
  toggleFilter(group: CategoryGroup, item: CategoryItem): void {
    const currentFilters = this.selectedFilters();
    const existingIndex = currentFilters.findIndex(
      (f) => f.type === group.code && f.code === item.code
    );

    let newFilters: SelectedFilter[];
    if (existingIndex >= 0) {
      newFilters = currentFilters.filter((_, i) => i !== existingIndex);
    } else {
      newFilters = [
        ...currentFilters,
        { type: group.code, code: item.code, label: item.label },
      ];
    }

    this.selectedFilters.set(newFilters);
    this.filtersChanged.emit(newFilters);
  }

  /** Remove a specific filter */
  removeFilter(filter: SelectedFilter): void {
    const newFilters = this.selectedFilters().filter(
      (f) => !(f.type === filter.type && f.code === filter.code)
    );
    this.selectedFilters.set(newFilters);
    this.filtersChanged.emit(newFilters);
  }

  /** Clear all filters */
  clearAllFilters(): void {
    this.selectedFilters.set([]);
    this.filtersChanged.emit([]);
  }

  /** Update search term for a category group */
  updateSearchTerm(groupCode: string, term: string): void {
    this.searchTerms.update((current) => ({
      ...current,
      [groupCode]: term,
    }));
  }

  /** Get color class from metadata if available */
  getColorClass(item: CategoryItem): string | null {
    const color = item.metadata?.['color'];
    return typeof color === 'string' ? color : null;
  }

  /** Check if group should show search input (more than 5 items) */
  shouldShowSearch(group: CategoryGroup): boolean {
    return (group.children?.length || 0) > 5;
  }
}
