export interface PaginationParams {
  pageNumber: number;
  pageSize: number;
}

export interface SortParams {
  field: string;
  direction: SortDirection;
}

export type SortDirection = 'ASC' | 'DESC';

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
}

/**
 * One page of a server-paginated search, as a component reads it: only the
 * rows and the total. Deliberately minimal and tolerant, so any paged DTO is
 * assignable to it: `PagedResult<T>` above, an NSwag `PaginatedListOf...`.
 */
export interface EfPage<T> {
  items?: ReadonlyArray<T> | null;
  totalCount?: number | null;
}

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  LOYALTY_POINTS = 'LOYALTY_POINTS',
  GIFT_CARD = 'GIFT_CARD',
}

export enum ErpOrderStatus {
  DRAFT = 'DRAFT',
  SHIPPED = 'SHIPPED',
  INVOICED = 'INVOICED',
  IN_PROGRESS = 'IN_PROGRESS',
}

export enum PosOrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}
