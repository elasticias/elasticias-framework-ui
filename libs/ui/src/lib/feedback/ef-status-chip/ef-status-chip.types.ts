/**
 * Comptoir status spectrum — the canonical set of chip tones every
 * status reference can map to via `metadata.color`.
 *
 * Tenants customize their status palettes by writing one of these
 * values into `reference_data.metadata.color` for each entry. The
 * elastic-portal admin (when ready) picks from this same enum, so
 * the framework stays tenant-agnostic and the data layer is the
 * only knob that needs to change per tenant.
 */
export type EfStatusColor =
    | 'pending'
    | 'processing'
    | 'shipped'
    | 'delivered'
    | 'cancelled'
    | 'refunded'
    | 'onhold'
    | 'tenant'
    | 'module'
    | 'neutral';

/**
 * Shape `ef-status-chip` expects when reading from a reference
 * dictionary. Mirrors the `reference_data` MongoDB collection in
 * ElasticERP — apps can pass any object with these fields.
 */
export interface EfStatusReferenceItem {
    code: string;
    label?: string;
    labelKey?: string;
    metadata?: {
        color?: EfStatusColor | string;
        icon?: string;
        [key: string]: unknown;
    };
}
