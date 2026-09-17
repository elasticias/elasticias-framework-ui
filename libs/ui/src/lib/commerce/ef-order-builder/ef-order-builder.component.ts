import {
  Component,
  computed,
  effect,
  input,
  model,
  OnInit,
  output,
  signal,
  viewChild,
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
import { ProductCountGroupLabel } from '../ef-order-summary/ef-order-summary.component';
import { EfSelectComponent } from '../../forms/ef-select/ef-select.component';
import { EfDatepickerAdvancedComponent } from '../../forms/ef-datepicker-advanced/ef-datepicker-advanced.component';
import { EfInputNumberComponent } from '../../forms/ef-inputnumber/ef-inputnumber.component';
import { EfQuantityStepperComponent } from '../../forms/ef-quantity-stepper/ef-quantity-stepper.component';
import { EfLabelComponent } from '../../layout/ef-label/ef-label.component';
import { EfButtonComponent } from '../../layout/ef-button/ef-button.component';
import { EfCardComponent } from '../../layout/ef-card/ef-card.component';
import { EfChangeHistoryComponent } from '../../data/ef-change-history/ef-change-history.component';
import { EfChangeHistoryEntry } from '../../data/ef-change-history/ef-change-history.types';
import { EfProductTypeaheadComponent } from '../ef-product-typeahead/ef-product-typeahead.component';
import { EfDataCardComponent } from '../../data/ef-data-card/ef-data-card.component';
import { EfColumnTemplateDirective } from '../../data/ef-data-card/ef-column-template.directive';
import type { EfDataCardColumn } from '../../data/ef-data-card/ef-data-card.types';
import { ProductTypeaheadSelection } from '../ef-product-typeahead/ef-product-typeahead.component.types';
import { UuidUtils } from '@elasticias/utils';

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
/** Numeric line columns that support inline click-to-edit. */
type EditableLineField = 'price' | 'qty' | 'discount' | 'tva';

@Component({
  selector: 'ef-order-builder',
  standalone: true,
  templateUrl: 'ef-order-builder.component.html',
  styleUrl: 'ef-order-builder.component.scss',
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    EfSelectComponent,
    EfDatepickerAdvancedComponent,
    EfInputNumberComponent,
    EfQuantityStepperComponent,
    EfLabelComponent,
    EfButtonComponent,
    EfCardComponent,
    EfChangeHistoryComponent,
    EfProductTypeaheadComponent,
    EfDataCardComponent,
    EfColumnTemplateDirective,
  ],
})
export class EfOrderBuilderComponent implements OnInit {
  rowTrackBy = (_: number, item: OrderLineItem) => item.id;

  config = input<DocumentConfig>({
    documentType: 'order',
    enableTax: false,
    enableDiscount: true,
    showCatalogue: false,
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

  /** Optional change-history entries; when non-empty the Historique rail card renders. */
  auditEntries = input<EfChangeHistoryEntry[]>([]);

  openCatalogue = output<void>();
  orderChanged = output<OrderChangeInfo>();
  orderValidated = output<ValidationResult>();
  productsAdded = output<OrderLineItem[]>();

  private originalOrder = signal<OrderEntity | null>(null);
  private initialized = signal(false);

  quickAddSelection = signal<ProductTypeaheadSelection | null>(null);
  quickAddPrice = signal<number>(0);
  quickAddQuantity = signal<number>(1);

  quickAddDisabled = computed(
    () =>
      this.quickAddSelection() === null || (this.quickAddQuantity() ?? 0) <= 0,
  );

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

    // Group on a normalised key. The catalogue stores the same format
    // under more than one spelling — one live order carries both
    // `PF-30ml-F-TRANSPARENT` and `PF-30ML-F-TRANSPARENT` — and this
    // function used to key the map on the raw string while matching
    // labels with `.toUpperCase()`. Two keys then resolved to one label
    // and the panel printed that format twice, splitting 119 units into
    // a row of 112 and a row of 7. Whoever read it undercounted.
    const normalise = (code: string): string => code.trim().toUpperCase();

    // Keep the first spelling seen, so the row still carries a real code
    // for anything downstream that wants one.
    const originalByKey = new Map<string, string>();

    lines.forEach((line) => {
      const product = line.product as { countGroup?: string };
      const countGroup = line.countGroup || product?.countGroup;

      if (countGroup) {
        const key = normalise(countGroup);
        if (!originalByKey.has(key)) originalByKey.set(key, countGroup);
        countMap.set(key, (countMap.get(key) || 0) + (line.quantity || 0));
      }
    });

    const items: OrderSummaryItem[] = [];

    countMap.forEach((count, key) => {
      const labelItem = labels.find((l) => normalise(l.code) === key);
      items.push({
        code: originalByKey.get(key) ?? key,
        label: labelItem?.label || originalByKey.get(key) || key,
        count,
        column: labelItem?.column ?? 1,
      });
    });

    items.sort((a, b) => {
      // Same normalisation as above: this used to be a case-SENSITIVE
      // compare sitting two lines below a case-insensitive one, so a
      // differently-cased code fell through to sortOrder 999.
      const labelA = labels.find((l) => normalise(l.code) === normalise(a.code));
      const labelB = labels.find((l) => normalise(l.code) === normalise(b.code));
      const orderA = labelA?.sortOrder ?? 999;
      const orderB = labelB?.sortOrder ?? 999;
      return orderA - orderB;
    });

    const totalCount = items.reduce((sum, item) => sum + item.count, 0);

    return { items, totalCount };
  });

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

  focusMode = model(true);
  railOpen = signal(false);

  /**
   * Inline cell editing — lines render their numeric values as read-only text
   * until the user clicks a value, which swaps just that cell to an input
   * (V1 behaviour). One cell is editable at a time; blur / Enter / Escape /
   * Tab commits and returns the cell to display.
   */
  editingCell = signal<{
    id: OrderLineItem['id'];
    field: EditableLineField;
  } | null>(null);

  /**
   * Columns for the lines table.
   *
   * Only the article column is elastic: it carries no width and so absorbs
   * whatever the fixed columns leave. Every other column holds a number whose
   * magnitude is known in advance, so a fixed track keeps the decimal points
   * aligned down the table instead of letting the longest product description
   * shift them. The `mobile` roles decide what `ef-data-card` shows on a
   * phone before the row is expanded, which is why the article leads and the
   * subtotal reads as the row's status.
   */
  readonly lineColumns = computed<EfDataCardColumn[]>(() => {
    const cfg = this.config();
    const cols: EfDataCardColumn[] = [
      { id: 'product', headerKey: 'label.article', mobile: 'primary' },
      {
        id: 'price',
        headerKey: 'label.sale_price',
        width: '132px',
        align: 'end',
        cellClass: 'num',
        mobile: 'secondary',
      },
      {
        id: 'qty',
        headerKey: 'label.quantity',
        width: '116px',
        align: 'end',
        cellClass: 'num',
        mobile: 'secondary',
      },
    ];
    if (cfg.enableDiscount) {
      cols.push({
        id: 'discount',
        headerKey: 'label.discount',
        width: '116px',
        align: 'end',
        cellClass: 'num',
        mobile: 'detail',
      });
    }
    if (cfg.enableTax) {
      cols.push({
        id: 'tax',
        headerKey: 'order_builder.tax',
        width: '116px',
        align: 'end',
        cellClass: 'num',
        mobile: 'detail',
      });
    }
    cols.push({
      id: 'subtotal',
      headerKey: 'label.subtotal',
      width: '136px',
      align: 'end',
      cellClass: 'total',
      mobile: 'status',
    });
    if (!this.readonly()) {
      cols.push({
        id: 'remove',
        header: '',
        width: '56px',
        align: 'end',
        cellClass: 'col-act',
        mobile: 'detail',
        hideable: false,
        exportable: false,
      });
    }
    return cols;
  });

  isEditingCell(item: OrderLineItem, field: EditableLineField): boolean {
    const cell = this.editingCell();
    return cell !== null && cell.id === item.id && cell.field === field;
  }

  startEditCell(item: OrderLineItem, field: EditableLineField): void {
    if (this.readonly()) return;
    this.editingCell.set({ id: item.id, field });
  }

  stopEditCell(): void {
    this.editingCell.set(null);
  }

  onEditCellKeydown(event: KeyboardEvent): void {
    if (
      event.key === 'Enter' ||
      event.key === 'Escape' ||
      event.key === 'Tab'
    ) {
      this.stopEditCell();
    }
  }

  toggleFocus(): void {
    this.focusMode.update((v) => !v);
  }
  toggleRail(open?: boolean): void {
    this.railOpen.set(open ?? !this.railOpen());
  }

  hasAudit = computed(() => this.auditEntries().length > 0);

  /** Récap items grouped into columns (column index from reference data). */
  recapColumns = computed<OrderSummaryItem[][]>(() => {
    const items = this.productsSummary().items;
    const byCol = new Map<number, OrderSummaryItem[]>();
    for (const it of items) {
      const col = it.column ?? 1;
      if (!byCol.has(col)) byCol.set(col, []);
      byCol.get(col)!.push(it);
    }
    return [...byCol.keys()].sort((a, b) => a - b).map((k) => byCol.get(k)!);
  });

  constructor() {
    effect(() => {
      if (!this.initialized()) return;

      const updatedOrder = OrderEntityHelper.calculateTotals(this.order());
      const summary = this.productsSummary();

      if (
        updatedOrder.grossTotal !== this.order().grossTotal ||
        updatedOrder.discountTotal !== this.order().discountTotal ||
        updatedOrder.taxTotal !== this.order().taxTotal ||
        updatedOrder.finalTotal !== this.order().finalTotal ||
        JSON.stringify(updatedOrder.productsSummary) !== JSON.stringify(summary)
      ) {
        this.order.set({ ...updatedOrder, productsSummary: summary });
      }
    });

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

  /**
   * Move a line to a new position.
   *
   * The order of an order's lines is data the operator owns — it is the order
   * the picker walks the shelves in and the order the printed document reads
   * in — so it is reordered by hand rather than derived from a sort.
   */
  reorderLine(ev: { from: number; to: number }): void {
    if (this.readonly()) return;
    const items = [...this.orderLines()];
    if (ev.from < 0 || ev.from >= items.length) return;
    if (ev.to < 0 || ev.to >= items.length) return;
    const [moved] = items.splice(ev.from, 1);
    items.splice(ev.to, 0, moved);
    this.updateOrderLines(items);
  }

  removeOrderLine(id: string | number | undefined): void {
    if (this.readonly() || id === undefined) return;

    const updatedItems = this.orderLines().filter((item) => item.id !== id);
    this.updateOrderLines(updatedItems);
  }

  onFieldChange(item: OrderLineItem): void {
    const updatedItem = OrderLineItemHelper.updateCalculations(item);
    Object.assign(item, updatedItem);
    this.updateOrderLines([...this.orderLines()]);
  }

  calculateSubtotal(item: OrderLineItem): number {
    return OrderLineItemHelper.calculateSubtotal(item);
  }

  handleOpenCatalogue(): void {
    if (this.readonly()) return;
    this.openCatalogue.emit();
  }

  private readonly typeahead = viewChild(EfProductTypeaheadComponent);

  /**
   * Fill the quick-add bar from a typeahead pick. Does NOT add the line —
   * the user reviews price/quantity then clicks "Ajouter" (addQuickProduct).
   */
  onTypeaheadSelect(selection: ProductTypeaheadSelection): void {
    if (this.readonly()) return;
    this.quickAddSelection.set(selection);
    this.quickAddPrice.set(selection.unitPrice);
  }

  addQuickProduct(): void {
    const selection = this.quickAddSelection();
    if (
      this.readonly() ||
      selection === null ||
      (this.quickAddQuantity() ?? 0) <= 0
    ) {
      return;
    }
    const variantId =
      (selection.variant?.['variantId'] as string | undefined) ?? undefined;
    const newItem = OrderLineItemHelper.createFromProduct(
      selection.product,
      this.quickAddQuantity(),
      this.productKeyField(),
      variantId,
    );
    const overridden = OrderLineItemHelper.updateCalculations({
      ...newItem,
      productUnitPrice: this.quickAddPrice(),
    });
    this.updateOrderLines([...this.orderLines(), overridden]);
    this.productsAdded.emit([overridden]);

    this.quickAddSelection.set(null);
    this.quickAddPrice.set(0);
    this.quickAddQuantity.set(1);
    this.typeahead()?.reset();
  }

  addProductsFromCatalogue(
    selectedProducts: Array<{
      product: Record<string, unknown>;
      quantity: number;
      variantId?: string;
    }>,
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
        (item) =>
          item.productId === productKeyValue &&
          item.variantId === (variantId ?? null),
      );

      if (existingIndex !== -1) {
        // The catalogue is seeded with current order lines via
        // `initialSelectedItems` and shows live steppers, so the emitted
        // selection represents the desired final quantity for each product
        // — replace rather than add, otherwise reopening the catalogue and
        // re-validating doubles every previously-selected line.
        const existing = currentItems[existingIndex];
        const updated = OrderLineItemHelper.updateCalculations({
          ...existing,
          quantity,
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

    const customer = this.customers().find(
      (c) => c['customerId'] === customerId,
    );
    return (customer?.['companyName'] || customer?.['name']) as
      | string
      | undefined;
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
        const variants = product['variants'] as
          | Array<Record<string, unknown>>
          | undefined;
        const variant =
          item.variantId && variants?.length
            ? variants.find((v) => v['variantId'] === item.variantId)
            : undefined;
        item.productDescription = OrderLineItemHelper.composeDescription(
          product,
          variant,
        );
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
