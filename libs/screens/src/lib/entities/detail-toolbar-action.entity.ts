import { Permissions } from '@elasticias/types';

/**
 * Declarative custom action consumed by `ef-detail-toolbar`'s
 * `[customActions]` input AND produced by
 * `AbstractDetailScreenV2.getCustomActions()`.
 *
 * Lives in `@elasticias/screens` so the abstract can return arrays
 * of these without a circular dep on `@elasticias/ui`. ef-detail-
 * toolbar consumes the same type via re-export from
 * `@elasticias/ui/.../ef-detail-toolbar.types`.
 *
 * Custom actions render in the toolbar's right group, before the
 * standard `print | duplicate | delete | save` row, separated by
 * a `|` divider when both groups are present.
 */
export interface EfDetailToolbarAction {
    /** Stable identifier for trackBy / tests. */
    id?: string;

    /** Translation key — preferred. */
    labelKey?: string;
    /** Direct label fallback when `labelKey` is empty. */
    label?: string;

    /** PrimeIcons class (e.g. `'pi pi-eye'`). */
    icon?: string;

    /**
     * Visual tone:
     * - `'ghost'`   (default) — outlined paper-alt button
     * - `'primary'`           — ink-active fill
     * - `'tenant'`            — tenant accent fill (use for the
     *                           screen's principal action)
     * - `'danger'`            — ghost styling tinted with
     *                           `--st-cancelled-fg`
     */
    severity?: 'ghost' | 'primary' | 'tenant' | 'danger';

    /**
     * Hide the action regardless of the permission check. Useful for
     * conditional visibility tied to entity state (e.g. only show
     * "Approve" when `entity.status === 'pending'`). Default `true`.
     */
    visible?: boolean;

    /** Disable without removing. */
    disabled?: boolean;

    /**
     * If set, the action is hidden unless the bound `ScreenContext`
     * grants this permission. Actions with no `permission` always
     * show (subject to `visible`).
     */
    permission?: Permissions;

    /** Click handler. */
    command?: () => void;
}
