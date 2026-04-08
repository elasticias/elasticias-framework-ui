import { UuidUtils } from '@elasticias/utils';

/**
 * Summary item for product count groups
 */
export interface OrderSummaryItem {
  code: string;
  label: string;
  count: number;
  column: number;
}

/**
 * Order products summary grouped by countGroup
 */
export interface OrderProductsSummary {
  items: OrderSummaryItem[];
  totalCount: number;
}

/**
 * Represents a line item in an order, invoice, or quote
 */
export interface OrderLineItem {
  id?: string | number;
  product?: any;
  productId?: number;
  productDescription?: string;
  productUnitPrice: number;
  quantity: number;
  discount: number;
  grossAmount: number;
  amount?: number;
  taxeId?: number | null;
  taxRate?: number;
  taxAmount?: number;
  position?: number;
  isEditing?: boolean;
  editingField?: string | null;
}

/**
 * Standard order entity contract
 */
export interface OrderEntity {
  // Core identification
  id?: number;
  documentNumber?: string;
  documentType: 'order' | 'invoice' | 'quote';
  status?: 'draft' | 'confirmed' | 'processing' | 'completed' | 'cancelled';

  // Customer information
  customerId?: string | null;
  customerName?: string;

  // Dates
  orderDate: Date;
  deliveryDate?: Date | null;
  dueDate?: Date | null;

  // Line items
  orderLines: OrderLineItem[];

  // Financial calculations
  grossTotal: number;
  discountTotal: number;
  taxTotal: number;
  finalTotal: number;

  // Optional fields
  notes?: string;
  internalNotes?: string;
  paymentTerms?: string;
  shippingAddress?: string;
  billingAddress?: string;

  // Products summary by countGroup
  productsSummary?: OrderProductsSummary;
}

/**
 * Configuration for document types (order, invoice, quote)
 */
export interface DocumentConfig {
  documentType: 'order' | 'invoice' | 'quote';
  headerLabel: string;
  dateLabel: string;
  customerLabel: string;
  enableTax?: boolean;
  enableDiscount?: boolean;
  showCatalogue?: boolean;
  allowInlineEdit?: boolean;
  showNotes?: boolean;
  showProductsSummary?: boolean;
  currencyCode?: string;
  locale?: string;
}

/**
 * Change tracking metadata
 */
export interface OrderChangeInfo {
  hasChanges: boolean;
  lastModified: Date;
  modifiedFields: Set<string>;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: { [key: string]: string[] };
  warnings?: { [key: string]: string[] };
}

/**
 * Helper functions for order line items
 */
export class OrderLineItemHelper {
  /**
   * Calculate subtotal for a line item (price * quantity - discount)
   */
  static calculateSubtotal(item: OrderLineItem): number {
    if (!item.productUnitPrice || !item.quantity) return 0;
    const subtotal = item.productUnitPrice * item.quantity;
    const discount = item.discount || 0;
    return subtotal - (subtotal * discount) / 100;
  }

  /**
   * Calculate tax amount for a line item
   */
  static calculateTaxAmount(item: OrderLineItem): number {
    if (!item.taxRate) return 0;
    const subtotal = this.calculateSubtotal(item);
    return (subtotal * item.taxRate) / 100;
  }

  /**
   * Calculate final amount including tax
   */
  static calculateFinalAmount(item: OrderLineItem): number {
    const subtotal = this.calculateSubtotal(item);
    const taxAmount = this.calculateTaxAmount(item);
    return subtotal + taxAmount;
  }

  /**
   * Create a new empty line item
   */
  static createEmptyItem(): OrderLineItem {
    return {
      id: UuidUtils.randomUUID(),
      product: null,
      productId: undefined,
      productUnitPrice: 0,
      quantity: 1,
      discount: 0,
      grossAmount: 0,
      taxRate: 0,
      taxAmount: 0,
      isEditing: true,
      editingField: null,
    };
  }

  /**
   * Create a line item from product selection
   */
  static createFromProduct(product: any, quantity = 1): OrderLineItem {
    const unitPrice = product.unitPrice || product.salePrice || 0;
    const taxRate = product.taxRate || 0;

    const item: OrderLineItem = {
      id: UuidUtils.randomUUID(),
      productId: product.productId || product.id,
      product: product,
      productDescription: product.displayName || product.name || '',
      productUnitPrice: unitPrice,
      quantity: quantity,
      discount: 0,
      grossAmount: 0,
      amount: 0,
      taxeId: product.taxeId || null,
      taxRate: taxRate,
      taxAmount: 0,
      isEditing: false,
      editingField: null,
    };

    // Calculate amounts
    item.grossAmount = OrderLineItemHelper.calculateSubtotal(item);
    item.taxAmount = OrderLineItemHelper.calculateTaxAmount(item);
    item.amount = OrderLineItemHelper.calculateFinalAmount(item);

    return item;
  }

  /**
   * Update calculations for an existing line item
   */
  static updateCalculations(item: OrderLineItem): OrderLineItem {
    return {
      ...item,
      grossAmount: this.calculateSubtotal(item),
      taxAmount: this.calculateTaxAmount(item),
      amount: this.calculateFinalAmount(item),
    };
  }

  /**
   * Validate a line item
   */
  static validate(item: OrderLineItem): ValidationResult {
    const errors: { [key: string]: string[] } = {};

    if (!item.product && !item.productId) {
      errors['product'] = ['Le produit est requis'];
    }

    if (!item.productUnitPrice || item.productUnitPrice <= 0) {
      errors['productUnitPrice'] = ["Le prix d'unité doit être supérieur à 0"];
    }

    if (!item.quantity || item.quantity <= 0) {
      errors['quantity'] = ['La quantité doit être supérieure à 0'];
    }

    if (item.discount && (item.discount < 0 || item.discount > 100)) {
      errors['discount'] = ['La remise doit être entre 0 et 100'];
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Compare two line items for equality
   */
  static areEqual(item1: OrderLineItem, item2: OrderLineItem): boolean {
    return (
      item1.productId === item2.productId &&
      item1.productUnitPrice === item2.productUnitPrice &&
      item1.quantity === item2.quantity &&
      item1.discount === item2.discount &&
      item1.taxRate === item2.taxRate
    );
  }
}

/**
 * Helper functions for order entity
 */
export class OrderEntityHelper {
  /**
   * Create a new empty order entity
   */
  static createEmpty(
    documentType: 'order' | 'invoice' | 'quote' = 'order',
  ): OrderEntity {
    return {
      documentType,
      orderDate: new Date(),
      orderLines: [],
      grossTotal: 0,
      discountTotal: 0,
      taxTotal: 0,
      finalTotal: 0,
      status: 'draft',
    };
  }

  /**
   * Calculate all totals for an order
   */
  static calculateTotals(order: OrderEntity): OrderEntity {
    const grossTotal = order.orderLines.reduce(
      (total, item) =>
        total + (item.productUnitPrice || 0) * (item.quantity || 0),
      0,
    );

    const discountTotal = order.orderLines.reduce((total, item) => {
      const itemTotal = (item.productUnitPrice || 0) * (item.quantity || 0);
      const discount = item.discount || 0;
      return total + (itemTotal * discount) / 100;
    }, 0);

    const taxTotal = order.orderLines.reduce((total, item) => {
      return total + (item.taxAmount || 0);
    }, 0);

    const finalTotal = grossTotal - discountTotal + taxTotal;

    return {
      ...order,
      grossTotal,
      discountTotal,
      taxTotal,
      finalTotal,
    };
  }

  /**
   * Validate order entity
   */
  static validate(order: OrderEntity): ValidationResult {
    const errors: { [key: string]: string[] } = {};
    const warnings: { [key: string]: string[] } = {};

    // Validate required fields
    if (!order.customerId) {
      errors['customerId'] = ['Le client est requis'];
    }

    if (!order.orderDate) {
      errors['orderDate'] = ['La date est requise'];
    }

    if (!order.orderLines || order.orderLines.length === 0) {
      errors['orderLines'] = ['Au moins un article est requis'];
    }

    // Validate line items
    order.orderLines.forEach((item, index) => {
      const itemValidation = OrderLineItemHelper.validate(item);
      if (!itemValidation.isValid) {
        Object.keys(itemValidation.errors).forEach((key) => {
          errors[`orderLines[${index}].${key}`] = itemValidation.errors[key];
        });
      }
    });

    // Check for warnings
    if (order.finalTotal <= 0) {
      warnings['finalTotal'] = ['Le montant total est invalide'];
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Clone order entity for immutability
   */
  static clone(order: OrderEntity): OrderEntity {
    return {
      ...order,
      orderDate: new Date(order.orderDate),
      deliveryDate: order.deliveryDate ? new Date(order.deliveryDate) : null,
      dueDate: order.dueDate ? new Date(order.dueDate) : null,
      orderLines: order.orderLines.map((item) => ({ ...item })),
    };
  }

  /**
   * Compare two orders for changes
   */
  static detectChanges(
    original: OrderEntity,
    current: OrderEntity,
  ): OrderChangeInfo {
    const modifiedFields = new Set<string>();

    // Compare basic fields
    const fieldsToCompare: (keyof OrderEntity)[] = [
      'customerId',
      'orderDate',
      'deliveryDate',
      'dueDate',
      'notes',
      'internalNotes',
      'status',
    ];

    fieldsToCompare.forEach((field) => {
      if (original[field] !== current[field]) {
        modifiedFields.add(field as string);
      }
    });

    // Compare order items
    if (original.orderLines.length !== current.orderLines.length) {
      modifiedFields.add('orderLines');
    } else {
      for (let i = 0; i < original.orderLines.length; i++) {
        if (
          !OrderLineItemHelper.areEqual(
            original.orderLines[i],
            current.orderLines[i],
          )
        ) {
          modifiedFields.add('orderLines');
          break;
        }
      }
    }

    return {
      hasChanges: modifiedFields.size > 0,
      lastModified: new Date(),
      modifiedFields,
    };
  }
}
