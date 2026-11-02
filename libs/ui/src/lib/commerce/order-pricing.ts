/**
 * Which catalogue price a new order line starts from.
 * - `wholesale`: the ERP channel price (`variant.price`, then `product.unitPrice`,
 *   which mirrors the default variant's, then `product.salePrice`). B2B sales orders.
 * - `retail`: the shop price (`variant.salePrice`, then `product.salePrice`). A Web
 *   order must cost what the shop charges, and the shop sells a variant at its
 *   `salePrice` only: an unpriced variant is not sold, so retail never falls back to
 *   the wholesale price, and `compareAtPrice` (the "was" price) is never charged.
 *   With no shop price the line starts at 0 for the staff to set.
 */
export type EfOrderPriceList = 'wholesale' | 'retail';

/** A positive number, or null: the shop treats a missing, zero or non-numeric price as unpriced. */
function positivePrice(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** The unit price a new line for `product` (and its chosen `variant`) starts at under `priceList`. */
export function defaultUnitPrice(
  product: Record<string, unknown>,
  variant: Record<string, unknown> | null | undefined,
  priceList: EfOrderPriceList = 'wholesale',
): number {
  if (priceList === 'retail') {
    return (
      positivePrice(variant?.['salePrice']) ??
      positivePrice(product['salePrice']) ??
      0
    );
  }
  return ((variant?.['price'] ??
    product['unitPrice'] ??
    product['salePrice'] ??
    0) as number);
}
