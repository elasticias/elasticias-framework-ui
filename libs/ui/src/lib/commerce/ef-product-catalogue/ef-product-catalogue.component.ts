import { CommonModule, CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  inject,
  input,
  LOCALE_ID,
  OnChanges,
  output,
  signal,
  TemplateRef,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BadgeModule } from 'primeng/badge';
import { CardModule } from 'primeng/card';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { Menu, MenuModule } from 'primeng/menu';
import { SelectModule } from 'primeng/select';
import { TranslateModule } from '@ngx-translate/core';
import { EfQuantityStepperComponent } from '../../forms/ef-quantity-stepper/ef-quantity-stepper.component';
import { EfProductCatalogueFilterComponent } from '../ef-product-catalogue-filter/ef-product-catalogue-filter.component';
import {
  CategoryAssignment,
  CategoryGroup,
  SelectedFilter,
} from '../ef-product-catalogue-filter/ef-product-catalogue-filter.component';
import { EfButtonComponent } from '../../layout/ef-button/ef-button.component';

export interface CatalogueProductVariant {
  variantId: string;
  title: string;
  sku?: string | null;
  price: number;
  compareAtPrice?: number | null;
  optionValues?: Record<string, string>;
  isActive?: boolean;
  countGroup?: string | null;
  [key: string]: unknown;
}

export interface CatalogueProduct {
  id: number;
  productCode: string;
  name: string;
  displayName: string;
  unitPrice?: number | null;
  packagingVolume?: number | null;
  categoryAssignments?: CategoryAssignment[];
  productType?: string | null; // 'SIMPLE' | 'VARIABLE'
  variants?: CatalogueProductVariant[];
  defaultVariantId?: string | null;
  [key: string]: unknown;
}

@Component({
  selector: 'ef-product-catalogue',
  styleUrl: './ef-product-catalogue.component.scss',
  templateUrl: './ef-product-catalogue.component.html',
  imports: [
    CommonModule,
    FormsModule,
    BadgeModule,
    EfButtonComponent,
    CardModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    MenuModule,
    SelectModule,
    EfQuantityStepperComponent,
    EfProductCatalogueFilterComponent,
    TranslateModule,
  ],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfProductCatalogueComponent implements OnChanges {
  private readonly locale = inject(LOCALE_ID);
  private readonly currencyPipe = new CurrencyPipe(this.locale);

  /** Products to display */
  products = input<CatalogueProduct[]>([]);

  /** Category groups for filtering */
  categoryGroups = input<CategoryGroup[]>([]);

  /** Initial selected items (for editing existing orders) */
  initialSelectedItems = input<Array<{ productId?: unknown; quantity: number; variantId?: string | null }>>(
    [],
  );

  /** Default filters to apply on init */
  defaultFilters = input<SelectedFilter[]>([]);

  /** Property name used as unique key for tracking products in the list */
  trackByField = input<string>('id');

  /** Currency code for price formatting */
  currencyCode = input<string>('MAD');

  /**
   * Custom product thumbnail template.
   * Context: { $implicit: CatalogueProduct }
   *
   * @example
   * <ef-product-catalogue [products]="products()">
   *   <ng-template #productThumbnail let-product>
   *     <my-custom-thumbnail [product]="product" />
   *   </ng-template>
   * </ef-product-catalogue>
   */
  productThumbnailTpl = contentChild<TemplateRef<unknown>>('productThumbnail');

  @ViewChild('sortMenu') sortMenu!: Menu;

  /** Emitted when products are validated */
  productsValidated =
    output<Array<{ product: CatalogueProduct; quantity: number; variantId?: string }>>();

  productSearch = signal('');
  selectedFilters = signal<SelectedFilter[]>([]);
  selectedSort = signal('Sort By');
  selectedProducts = signal<
    Array<{ product: CatalogueProduct; quantity: number; variantId?: string }>
  >([]);

  /** Tracks the currently selected variantId per product key */
  selectedVariants = signal<Record<string, string>>({});

  filteredProducts = computed(() => {
    let filtered = this.products();
    const filters = this.selectedFilters();
    const searchTerm = this.productSearch().toLowerCase().trim();

    if (searchTerm) {
      filtered = filtered.filter((p) => {
        const displayName = (p.displayName || '').toLowerCase();
        const name = (p.name || '').toLowerCase();
        return displayName.includes(searchTerm) || name.includes(searchTerm);
      });
    }

    if (filters.length === 0) {
      return filtered;
    }

    const filtersByType = filters.reduce(
      (acc, filter) => {
        if (!acc[filter.type]) {
          acc[filter.type] = [];
        }
        acc[filter.type].push(filter.code);
        return acc;
      },
      {} as Record<string, string[]>,
    );

    filtered = filtered.filter((product) => {
      const assignments = product.categoryAssignments || [];
      return Object.entries(filtersByType).every(([type, codes]) => {
        return assignments.some(
          (a) => a.type === type && codes.includes(a.code),
        );
      });
    });

    return filtered;
  });

  sortOptions = [
    {
      label: 'Newest First',
      icon: 'pi pi-calendar-plus',
      command: () => {
        this.selectedSort.set('Newest First');
        this.sortMenu.hide();
      },
    },
    {
      label: 'Price: Low to High',
      icon: 'pi pi-sort-amount-up',
      command: () => {
        this.selectedSort.set('Price: Low to High');
        this.sortMenu.hide();
      },
    },
    {
      label: 'Price: High to Low',
      icon: 'pi pi-sort-amount-down',
      command: () => {
        this.selectedSort.set('Price: High to Low');
        this.sortMenu.hide();
      },
    },
  ];

  onFiltersChanged(filters: SelectedFilter[]): void {
    this.selectedFilters.set(filters);
  }

  ngOnChanges(): void {
    this.initializeSelectedProducts();
    this.initializeDefaultFilters();
  }

  productKey(product: CatalogueProduct): unknown {
    return product[this.trackByField()];
  }

  private initializeSelectedProducts(): void {
    const initialItems = this.initialSelectedItems();
    const allProducts = this.products();

    if (
      !initialItems ||
      initialItems.length === 0 ||
      !allProducts ||
      allProducts.length === 0
    ) {
      return;
    }

    const selectedProductsArray: Array<{
      product: CatalogueProduct;
      quantity: number;
      variantId?: string;
    }> = [];

    initialItems.forEach((orderItem) => {
      const matchingProduct = allProducts.find(
        (p) => this.productKey(p) === orderItem.productId,
      );
      if (matchingProduct) {
        selectedProductsArray.push({
          product: matchingProduct,
          quantity: orderItem.quantity || 1,
          variantId: orderItem.variantId ?? undefined,
        });
      }
    });

    this.selectedProducts.set(selectedProductsArray);
  }

  private initializeDefaultFilters(): void {
    const defaults = this.defaultFilters();
    if (defaults.length > 0 && this.selectedFilters().length === 0) {
      this.selectedFilters.set(defaults);
    }
  }

  toggleSortMenu(event: Event): void {
    this.sortMenu.toggle(event);
  }

  /** Composite key for tracking product+variant selections */
  private selectionKey(productKey: unknown, variantId?: string): string {
    return variantId ? `${productKey}::${variantId}` : `${productKey}`;
  }

  /** Get the selected variantId for a product, or its defaultVariantId */
  getSelectedVariantId(product: CatalogueProduct): string | undefined {
    const key = String(this.productKey(product));
    const selected = this.selectedVariants()[key];
    if (selected) return selected;
    if (this.isVariableProduct(product)) {
      const activeVariants = this.getActiveVariants(product);
      return product.defaultVariantId ?? activeVariants[0]?.variantId;
    }
    return undefined;
  }

  /** Set the selected variant for a product */
  setSelectedVariant(product: CatalogueProduct, variantId: string): void {
    const key = String(this.productKey(product));
    this.selectedVariants.update((v) => ({ ...v, [key]: variantId }));
  }

  /** Check if product is a VARIABLE product with variants */
  isVariableProduct(product: CatalogueProduct): boolean {
    return product.productType === 'VARIABLE' && !!product.variants?.length;
  }

  /** Get active variants for a product */
  getActiveVariants(product: CatalogueProduct): CatalogueProductVariant[] {
    return (product.variants || []).filter((v) => v.isActive !== false);
  }

  /** Get total quantity for a product across all its variants */
  getProductQuantity(product: CatalogueProduct): number {
    const key = this.productKey(product);
    if (this.isVariableProduct(product)) {
      return this.selectedProducts()
        .filter((sp) => this.productKey(sp.product) === key)
        .reduce((sum, sp) => sum + sp.quantity, 0);
    }
    const selected = this.selectedProducts().find(
      (sp) => this.productKey(sp.product) === key,
    );
    return selected?.quantity || 0;
  }

  /** Get quantity for a specific product+variant combination */
  getVariantQuantity(product: CatalogueProduct, variantId: string): number {
    const key = this.productKey(product);
    const selected = this.selectedProducts().find(
      (sp) => this.productKey(sp.product) === key && sp.variantId === variantId,
    );
    return selected?.quantity || 0;
  }

  addProduct(product: CatalogueProduct): void {
    const key = this.productKey(product);
    const variantId = this.isVariableProduct(product)
      ? this.getSelectedVariantId(product)
      : undefined;
    const selKey = this.selectionKey(key, variantId);
    const currentProducts = this.selectedProducts();

    const existingIndex = currentProducts.findIndex(
      (sp) => this.selectionKey(this.productKey(sp.product), sp.variantId) === selKey,
    );

    if (existingIndex !== -1) {
      this.selectedProducts.set(
        currentProducts.map((sp, i) =>
          i === existingIndex ? { ...sp, quantity: sp.quantity + 1 } : sp,
        ),
      );
    } else {
      this.selectedProducts.set([
        ...currentProducts,
        { product, quantity: 1, variantId },
      ]);
    }
  }

  removeProduct(product: CatalogueProduct): void {
    const key = this.productKey(product);
    if (this.isVariableProduct(product)) {
      // Remove all variant selections for this product
      this.selectedProducts.set(
        this.selectedProducts().filter(
          (sp) => this.productKey(sp.product) !== key,
        ),
      );
    } else {
      this.selectedProducts.set(
        this.selectedProducts().filter(
          (sp) => this.productKey(sp.product) !== key,
        ),
      );
    }
  }

  removeVariantSelection(product: CatalogueProduct, variantId: string): void {
    const key = this.productKey(product);
    const selKey = this.selectionKey(key, variantId);
    this.selectedProducts.set(
      this.selectedProducts().filter(
        (sp) => this.selectionKey(this.productKey(sp.product), sp.variantId) !== selKey,
      ),
    );
  }

  updateProductQuantity(product: CatalogueProduct, quantity: number): void {
    const key = this.productKey(product);
    const variantId = this.isVariableProduct(product)
      ? this.getSelectedVariantId(product)
      : undefined;
    const selKey = this.selectionKey(key, variantId);
    const currentProducts = this.selectedProducts();

    if (quantity === 0) {
      this.selectedProducts.set(
        currentProducts.filter(
          (sp) => this.selectionKey(this.productKey(sp.product), sp.variantId) !== selKey,
        ),
      );
    } else {
      this.selectedProducts.set(
        currentProducts.map((sp) =>
          this.selectionKey(this.productKey(sp.product), sp.variantId) === selKey
            ? { ...sp, quantity }
            : sp,
        ),
      );
    }
  }

  updateVariantQuantity(product: CatalogueProduct, variantId: string, quantity: number): void {
    const key = this.productKey(product);
    const selKey = this.selectionKey(key, variantId);
    const currentProducts = this.selectedProducts();

    if (quantity === 0) {
      this.removeVariantSelection(product, variantId);
    } else {
      const existingIndex = currentProducts.findIndex(
        (sp) => this.selectionKey(this.productKey(sp.product), sp.variantId) === selKey,
      );
      if (existingIndex !== -1) {
        this.selectedProducts.set(
          currentProducts.map((sp, i) =>
            i === existingIndex ? { ...sp, quantity } : sp,
          ),
        );
      } else {
        this.selectedProducts.set([
          ...currentProducts,
          { product, quantity, variantId },
        ]);
      }
    }
  }

  validateSelection(): void {
    const selectedItems = this.selectedProducts();
    if (selectedItems.length > 0) {
      this.productsValidated.emit([...selectedItems]);
      this.selectedProducts.set([]);
      this.selectedVariants.set({});
    }
  }

  getPackagingLabel(product: CatalogueProduct): string {
    const packagingAssignment = product.categoryAssignments?.find(
      (ca) => ca.type === 'PACKAGING',
    );
    return packagingAssignment?.code || '';
  }

  getVariantTitle(product: CatalogueProduct, variantId: string): string {
    const variant = product.variants?.find((v) => v.variantId === variantId);
    return variant?.title || variantId;
  }

  trackKey(product: CatalogueProduct): unknown {
    return this.productKey(product);
  }

  formatPrice(product: CatalogueProduct): string {
    if (this.isVariableProduct(product)) {
      const variantId = this.getSelectedVariantId(product);
      const variant = product.variants?.find((v) => v.variantId === variantId);
      if (variant) {
        return this.formatCurrency(variant.price);
      }
      // Fallback: show price range
      const activeVariants = this.getActiveVariants(product);
      if (activeVariants.length > 0) {
        const min = Math.min(...activeVariants.map((v) => v.price));
        const max = Math.max(...activeVariants.map((v) => v.price));
        if (min === max) return this.formatCurrency(min);
        return `${this.formatCurrency(min)} - ${this.formatCurrency(max)}`;
      }
    }
    const price = product.unitPrice;
    if (price == null) return '';
    return this.formatCurrency(price);
  }

  formatVariantPrice(variant: CatalogueProductVariant): string {
    return this.formatCurrency(variant.price);
  }

  private formatCurrency(value: number | null | undefined): string {
    if (value == null) return '';
    return (
      this.currencyPipe.transform(
        value,
        this.currencyCode(),
        'symbol-narrow',
        '1.2-2',
      ) || ''
    );
  }
}
