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
import { TranslateModule } from '@ngx-translate/core';
import { EfQuantityStepperComponent } from '../../forms/ef-quantity-stepper/ef-quantity-stepper.component';
import { EfProductCatalogueFilterComponent } from '../ef-product-catalogue-filter/ef-product-catalogue-filter.component';
import {
  CategoryAssignment,
  CategoryGroup,
  SelectedFilter,
} from '../ef-product-catalogue-filter/ef-product-catalogue-filter.component';
import { EfButtonComponent } from '../../layout/ef-button/ef-button.component';

export interface CatalogueProduct {
  id: number;
  productCode: string;
  name: string;
  displayName: string;
  unitPrice?: number | null;
  packagingVolume?: number | null;
  categoryAssignments?: CategoryAssignment[];
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
  initialSelectedItems = input<Array<{ productId?: any; quantity: number }>>(
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
  productThumbnailTpl = contentChild<TemplateRef<any>>('productThumbnail');

  @ViewChild('sortMenu') sortMenu!: Menu;

  /** Emitted when products are validated */
  productsValidated =
    output<Array<{ product: CatalogueProduct; quantity: number }>>();

  productSearch = signal('');
  selectedFilters = signal<SelectedFilter[]>([]);
  selectedSort = signal('Sort By');
  selectedProducts = signal<
    Array<{ product: CatalogueProduct; quantity: number }>
  >([]);

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

  private productKey(product: CatalogueProduct): unknown {
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
    }> = [];

    initialItems.forEach((orderItem) => {
      const matchingProduct = allProducts.find(
        (p) => this.productKey(p) === orderItem.productId,
      );
      if (matchingProduct) {
        selectedProductsArray.push({
          product: matchingProduct,
          quantity: orderItem.quantity || 1,
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

  getProductQuantity(product: CatalogueProduct): number {
    const key = this.productKey(product);
    const selectedProduct = this.selectedProducts().find(
      (sp) => this.productKey(sp.product) === key,
    );
    return selectedProduct?.quantity || 0;
  }

  addProduct(product: CatalogueProduct): void {
    const key = this.productKey(product);
    const currentProducts = this.selectedProducts();
    const existingProduct = currentProducts.find(
      (sp) => this.productKey(sp.product) === key,
    );

    if (existingProduct) {
      this.selectedProducts.set(
        currentProducts.map((sp) =>
          this.productKey(sp.product) === key
            ? { ...sp, quantity: sp.quantity + 1 }
            : sp,
        ),
      );
    } else {
      this.selectedProducts.set([...currentProducts, { product, quantity: 1 }]);
    }
  }

  removeProduct(product: CatalogueProduct): void {
    const key = this.productKey(product);
    const currentProducts = this.selectedProducts();
    this.selectedProducts.set(
      currentProducts.filter((sp) => this.productKey(sp.product) !== key),
    );
  }

  updateProductQuantity(product: CatalogueProduct, quantity: number): void {
    const key = this.productKey(product);
    const currentProducts = this.selectedProducts();

    if (quantity === 0) {
      this.selectedProducts.set(
        currentProducts.filter((sp) => this.productKey(sp.product) !== key),
      );
    } else {
      this.selectedProducts.set(
        currentProducts.map((sp) =>
          this.productKey(sp.product) === key ? { ...sp, quantity } : sp,
        ),
      );
    }
  }

  validateSelection(): void {
    const selectedItems = this.selectedProducts();
    if (selectedItems.length > 0) {
      this.productsValidated.emit([...selectedItems]);
      this.selectedProducts.set([]);
    }
  }

  getPackagingLabel(product: CatalogueProduct): string {
    const packagingAssignment = product.categoryAssignments?.find(
      (ca) => ca.type === 'PACKAGING',
    );
    return packagingAssignment?.code || '';
  }

  trackKey(product: CatalogueProduct): unknown {
    return this.productKey(product);
  }

  formatPrice(product: CatalogueProduct): string {
    const price = product.unitPrice;
    if (price == null) return '';
    return (
      this.currencyPipe.transform(
        price,
        this.currencyCode(),
        'symbol-narrow',
        '1.2-2',
      ) || ''
    );
  }
}
