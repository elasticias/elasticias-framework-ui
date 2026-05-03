import {
  Component,
  computed,
  effect,
  input,
  model,
  OnDestroy,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  DocumentConfig,
  OrderEntity,
  OrderLineItem,
  OrderLineItemHelper,
  OrderEntityHelper,
  OrderChangeInfo,
  ValidationResult,
  OrderProductsSummary,
  OrderSummaryItem,
} from './ef-order-builder.component.types';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { FieldsetModule } from 'primeng/fieldset';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import {
  EfOrderSummaryComponent,
  ProductCountGroupLabel,
} from '../ef-order-summary/ef-order-summary.component';
import { EfSelectComponent } from '../../forms/ef-select/ef-select.component';
import { EfDatepickerComponent } from '../../forms/ef-datepicker/ef-datepicker.component';
import { EfInputNumberComponent } from '../../forms/ef-inputnumber/ef-inputnumber.component';
import { EfLabelComponent } from '../../layout/ef-label/ef-label.component';
import { EfFieldsetComponent } from '../../layout/ef-fieldset/ef-fieldset.component';
import { UuidUtils, AppUtils } from '@elasticias/utils';

/**
 * Reusable order builder component for orders, invoices, and quotes
 * Manages complete order entity with automatic change tracking
 *
 * @example
 * <ef-order-builder
 *   [(order)]="orderEntity"
 *   [config]="documentConfig"
 *   [products]="products"
 *   [customers]="customers"
 *   (openCatalogue)="handleCatalogueOpen()"
 *   (orderChanged)="handleOrderChange($event)"
 * />
 */
@Component({
  selector: 'ef-order-builder',
  standalone: true,
  templateUrl: 'ef-order-builder.component.html',
  styleUrl: 'ef-order-builder.component.scss',
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    TextareaModule,
    ButtonModule,
    TableModule,
    FieldsetModule,
    DividerModule,
    TooltipModule,
    EfOrderSummaryComponent,
    EfSelectComponent,
    EfDatepickerComponent,
    EfInputNumberComponent,
    EfLabelComponent,
    EfFieldsetComponent,
  ],
})
export class EfOrderBuilderComponent implements OnInit, OnDestroy {
  rowTrackBy = (_: number, item: OrderLineItem) => item.id;

  // Expose AppUtils to template
  protected readonly AppUtils = AppUtils;

  config = input<DocumentConfig>({
    documentType: 'order',
    headerLabel: 'Commamnde',
    dateLabel: 'Date de commande',
    customerLabel: 'Client',
    enableTax: true,
    enableDiscount: true,
    showCatalogue: true,
    allowInlineEdit: true,
    currencyCode: 'MAD',
    locale: 'fr-FR',
  });

  order = model.required<OrderEntity>();
  products = input.required<Record<string, unknown>[]>();
  customers = input.required<Record<string, unknown>[]>();
  readonly = input<boolean>(false);
  countGroupLabels = input<ProductCountGroupLabel[]>([]);
  /** Field name used to identify products (must match catalogue's trackByField) */
  productKeyField = input<string>('id');
  backendErrors = input<{ [key: string]: string[] }>({});

  openCatalogue = output<void>();
  orderChanged = output<OrderChangeInfo>();
  orderValidated = output<ValidationResult>();
  productsAdded = output<OrderLineItem[]>();

  private originalOrder = signal<OrderEntity | null>(null);
  private updateTimeout: ReturnType<typeof setTimeout> | null = null;
  private initialized = signal(false);

  orderLines = computed(() => this.order().orderLines || []);

  grossTotal = computed(() => {
    return this.orderLines().reduce((total, item) => {
      return total + (item.productUnitPrice || 0) * (item.quantity || 0);
    }, 0);
  });

  discountTotal = computed(() => {
    return this.orderLines().reduce((total, item) => {
      const itemTotal = (item.productUnitPrice || 0) * (item.quantity || 0);
      const discount = item.discount || 0;
      return total + (itemTotal * discount) / 100;
    }, 0);
  });

  tvaTotal = computed(() => {
    return this.orderLines().reduce((total, item) => {
      return total + (item.taxAmount || 0);
    }, 0);
  });

  finalTotal = computed(() => {
    return this.grossTotal() - this.discountTotal() + this.tvaTotal();
  });

  currency = computed(() => this.config().currencyCode || 'MAD');
  locale = computed(() => this.config().locale || 'fr-FR');
  hasItems = computed(() => this.orderLines().length > 0);

  productsSummary = computed<OrderProductsSummary>(() => {
    const lines = this.orderLines();
    const labels = this.countGroupLabels();
    const countMap = new Map<string, number>();

    lines.forEach((line) => {
      const product = line.product as { countGroup?: string };
      const countGroup = line.countGroup || product?.countGroup;

      if (countGroup) {
        const currentCount = countMap.get(countGroup) || 0;
        countMap.set(countGroup, currentCount + (line.quantity || 0));
      }
    });

    const items: OrderSummaryItem[] = [];

    countMap.forEach((count, code) => {
      const labelItem = labels.find(
        (l) => l.code.toUpperCase() === code.toUpperCase(),
      );
      items.push({
        code,
        label: labelItem?.label || code,
        count,
        column: labelItem?.column ?? 1,
      });
    });

    items.sort((a, b) => {
      const labelA = labels.find((l) => l.code === a.code);
      const labelB = labels.find((l) => l.code === b.code);
      const orderA = labelA?.sortOrder ?? 999;
      const orderB = labelB?.sortOrder ?? 999;
      return orderA - orderB;
    });

    const totalCount = items.reduce((sum, item) => sum + item.count, 0);

    return { items, totalCount };
  });

  hasEditingRow = computed(() =>
    this.orderLines().some((item) => item.isEditing),
  );

  validationResult = computed(() => {
    return OrderEntityHelper.validate(this.order());
  });

  combinedErrors = computed(() => {
    const clientErrors = this.validationResult().errors;
    const serverErrors = this.backendErrors();
    return { ...clientErrors, ...serverErrors };
  });

  hasErrors = computed(() => Object.keys(this.combinedErrors()).length > 0);

  isValid = computed(
    () =>
      this.validationResult().isValid &&
      Object.keys(this.backendErrors()).length === 0,
  );

  changeInfo = computed<OrderChangeInfo | null>(() => {
    const original = this.originalOrder();
    if (!original || !this.initialized()) return null;

    return OrderEntityHelper.detectChanges(original, this.order());
  });

  hasChanges = computed(() => this.changeInfo()?.hasChanges ?? false);

  constructor() {
    effect(
      () => {
        if (!this.initialized()) return;

        const updatedOrder = OrderEntityHelper.calculateTotals(this.order());
        const summary = this.productsSummary();

        if (
          updatedOrder.grossTotal !== this.order().grossTotal ||
          updatedOrder.discountTotal !== this.order().discountTotal ||
          updatedOrder.taxTotal !== this.order().taxTotal ||
          updatedOrder.finalTotal !== this.order().finalTotal ||
          JSON.stringify(updatedOrder.productsSummary) !==
            JSON.stringify(summary)
        ) {
          this.order.set({ ...updatedOrder, productsSummary: summary });
        }
      },
      { allowSignalWrites: true },
    );

    effect(() => {
      const info = this.changeInfo();
      if (info && info.hasChanges) {
        this.orderChanged.emit(info);
      }
    });

    effect(() => {
      if (!this.initialized()) return;

      const validation = this.validationResult();
      this.orderValidated.emit(validation);
    });
  }

  ngOnInit(): void {
    this.originalOrder.set(OrderEntityHelper.clone(this.order()));
    this.initialized.set(true);
  }

  ngOnDestroy(): void {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = null;
    }
  }

  addNewProductRow(): void {
    if (this.readonly() || this.hasEditingRow()) {
      return;
    }

    const newItem = OrderLineItemHelper.createEmptyItem();
    this.updateOrderLines([...this.orderLines(), newItem]);
  }

  removeOrderLine(id: number | undefined): void {
    if (this.readonly() || id === undefined) return;

    const updatedItems = this.orderLines().filter((item) => item.id !== id);
    this.updateOrderLines(updatedItems);
  }

  onProductSelect(item: OrderLineItem): void {
    if (this.readonly() || !item.product) return;

    const items = this.orderLines();
    const index = items.findIndex((i) => i.id === item.id);

    if (index !== -1) {
      // For Variable products with a default variant, use variant data
      const variants = item.product['variants'] as Array<Record<string, unknown>> | undefined;
      const defaultVariantId = item.product['defaultVariantId'] as string | undefined;
      const variant = defaultVariantId && variants?.length
        ? variants.find((v) => v['variantId'] === defaultVariantId)
        : variants?.[0];

      const unitPrice = variant?.['price'] ?? item.product['unitPrice'] ?? item.product['salePrice'] ?? 0;
      const countGroup = (variant?.['countGroup'] ?? item.product['countGroup'] ?? '') as string;

      const updatedItem = OrderLineItemHelper.updateCalculations({
        ...item,
        productId: this.productKey(item.product),
        variantId: (variant?.['variantId'] as string) ?? null,
        countGroup: countGroup,
        productDescription: OrderLineItemHelper.composeDescription(item.product, variant),
        productUnitPrice: unitPrice as number,
        taxRate: (item.product['taxRate'] || 0) as number,
        isEditing: false,
      });

      const updatedItems = [...items];
      updatedItems[index] = updatedItem;
      this.updateOrderLines(updatedItems);
    }
  }

  startEditField(item: OrderLineItem, fieldName: string): void {
    if (this.readonly() || !this.config().allowInlineEdit) return;

    const items = this.orderLines();
    const index = items.findIndex((i) => i.id === item.id);

    if (index !== -1) {
      const updatedItems = [...items];
      updatedItems[index] = { ...item, editingField: fieldName };
      this.updateOrderLines(updatedItems);
    }
  }

  stopEditField(item: OrderLineItem): void {
    item.editingField = null;

    const updatedItem = OrderLineItemHelper.updateCalculations(item);
    Object.assign(item, updatedItem);

    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    this.updateTimeout = setTimeout(() => {
      this.updateOrderLines([...this.orderLines()]);
      this.updateTimeout = null;
    }, 50);
  }

  onFieldChange(item: OrderLineItem): void {
    const updatedItem = OrderLineItemHelper.updateCalculations(item);
    Object.assign(item, updatedItem);
  }

  saveEditingRow(item: OrderLineItem): void {
    if (this.readonly()) return;

    const validation = OrderLineItemHelper.validate(item);

    if (validation.isValid) {
      const items = this.orderLines();
      const index = items.findIndex((i) => i.id === item.id);

      if (index !== -1) {
        const updatedItem = OrderLineItemHelper.updateCalculations({
          ...item,
          isEditing: false,
        });

        const updatedItems = [...items];
        updatedItems[index] = updatedItem;
        this.updateOrderLines(updatedItems);
      }
    }
  }

  calculateSubtotal(item: OrderLineItem): number {
    return OrderLineItemHelper.calculateSubtotal(item);
  }

  handleOpenCatalogue(): void {
    if (this.readonly()) return;
    this.openCatalogue.emit();
  }

  addProductsFromCatalogue(
    selectedProducts: Array<{ product: Record<string, unknown>; quantity: number; variantId?: string }>,
  ): void {
    if (this.readonly() || !selectedProducts || selectedProducts.length === 0) {
      return;
    }

    const currentItems = [...this.orderLines()];
    const addedItems: OrderLineItem[] = [];

    const keyField = this.productKeyField();

    selectedProducts.forEach(({ product, quantity, variantId }) => {
      const productKeyValue = product[keyField];
      // Match by both productId AND variantId to avoid merging different variants
      const existingIndex = currentItems.findIndex(
        (item) => item.productId === productKeyValue && item.variantId === (variantId ?? null),
      );

      if (existingIndex !== -1) {
        const existing = currentItems[existingIndex];
        const updated = OrderLineItemHelper.updateCalculations({
          ...existing,
          quantity: (existing.quantity || 0) + quantity,
        });
        currentItems[existingIndex] = updated;
      } else {
        const newItem = OrderLineItemHelper.createFromProduct(
          product,
          quantity,
          keyField,
          variantId,
        );
        currentItems.push(newItem);
        addedItems.push(newItem);
      }
    });

    this.updateOrderLines(currentItems);

    if (addedItems.length > 0) {
      this.productsAdded.emit(addedItems);
    }
  }

  updateCustomer(customerId: string | null): void {
    if (this.readonly()) return;

    this.order.update((order) => ({
      ...order,
      customerId,
      customerName: this.getCustomerName(customerId),
    }));
  }

  updateOrderDate(date: Date): void {
    if (this.readonly()) return;

    this.order.update((order) => ({
      ...order,
      orderDate: date,
    }));
  }

  updateDeliveryDate(date: Date | null): void {
    if (this.readonly()) return;

    this.order.update((order) => ({
      ...order,
      deliveryDate: date,
    }));
  }

  updateNotes(notes: string): void {
    if (this.readonly()) return;

    this.order.update((order) => ({
      ...order,
      notes,
    }));
  }

  resetChanges(): void {
    const original = this.originalOrder();
    if (original) {
      this.order.set(OrderEntityHelper.clone(original));
    }
  }

  markAsSaved(): void {
    this.originalOrder.set(OrderEntityHelper.clone(this.order()));
  }

  validate(): ValidationResult {
    return this.validationResult();
  }

  private updateOrderLines(items: OrderLineItem[]): void {
    this.order.update((order) => ({
      ...order,
      orderLines: items,
    }));
  }

  private getCustomerName(customerId: string | null): string | undefined {
    if (!customerId) return undefined;

    const customer = this.customers().find((c) => c['customerId'] === customerId);
    return (customer?.['companyName'] || customer?.['name']) as string | undefined;
  }

  private productKey(product: Record<string, unknown>): unknown {
    return product[this.productKeyField()];
  }

  getProduct(productId: unknown): Record<string, unknown> | undefined {
    const field = this.productKeyField();
    return this.products().find((p) => p[field] === productId);
  }

  getCustomer(customerId: string): Record<string, unknown> | undefined {
    return this.customers().find((c) => c['customerId'] === customerId);
  }

  initializeOrderLines(): void {
    const items = this.order().orderLines || [];

    const initializedItems = items.map((item: OrderLineItem) => {
      let product = item.product;

      if (item.productId && !item.product) {
        product = this.getProduct(item.productId);
      }

      if (product && !item.productDescription) {
        const variants = product['variants'] as Array<Record<string, unknown>> | undefined;
        const variant = item.variantId && variants?.length
          ? variants.find((v) => v['variantId'] === item.variantId)
          : undefined;
        item.productDescription = OrderLineItemHelper.composeDescription(product, variant);
      }

      return OrderLineItemHelper.updateCalculations({
        ...item,
        product,
        id: item.id || UuidUtils.randomUUID(),
        isEditing: item.isEditing ?? false,
        editingField: item.editingField ?? null,
      });
    });

    this.updateOrderLines(initializedItems);
  }

  getTotals() {
    return {
      grossTotal: this.grossTotal(),
      discountTotal: this.discountTotal(),
      tvaTotal: this.tvaTotal(),
      finalTotal: this.finalTotal(),
    };
  }

  exportOrder(): OrderEntity {
    return OrderEntityHelper.calculateTotals(this.order());
  }
}
