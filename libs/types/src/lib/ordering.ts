export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productImageUrl: string;
  unitPrice: number;
  quantity: number;
  selectedModifiers: SelectedModifier[];
  specialInstructions: string;
  lineTotal: number;
}

export interface SelectedModifier {
  modifierId: string;
  modifierName: string;
  groupName: string;
  priceAdjustment: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  taxAmount: number;
  deliveryFee: number;
  total: number;
  orderMode: OrderMode;
}

export type OrderMode = 'delivery' | 'pickup';

export interface Order {
  id: string;
  orderNumber: string;
  status: StoreOrderStatus;
  items: CartItem[];
  subtotal: number;
  taxAmount: number;
  deliveryFee: number;
  total: number;
  orderMode: OrderMode;
  deliveryAddress?: DeliveryAddress;
  scheduledAt: string | null;
  createdAt: string;
  estimatedReadyAt: string | null;
}

export type StoreOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivering'
  | 'delivered'
  | 'cancelled';

export interface DeliveryAddress {
  id?: string;
  label: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
}
