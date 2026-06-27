import { Permissions } from '@elasticias/types';

/**
 * Declarative row-action item consumed by `ef-row-actions`.
 *
 * The component renders a native Comptoir-styled popup (no PrimeNG
 * Menu) so the design — kbd hint, danger tone, divider, ink-active
 * trigger when open — matches the prototype 1:1.
 *
 * Use `command` for actions, `separator: true` for a divider line.
 */
export interface EfRowAction {
    /** Stable identifier for trackBy / tests. */
    id?: string;

    /** Translation key — preferred. */
    labelKey?: string;
    /** Direct label — used only when `labelKey` is empty. */
    label?: string;

    /** PrimeIcons class (e.g. `'pi pi-pencil'`). */
    icon?: string;

    /** Optional keyboard-shortcut hint shown right-aligned (e.g. `'↵'`, `'E'`, `'⌘D'`). */
    kbd?: string;

    /** Tone: `'danger'` styles destructive items in the cancelled palette. */
    severity?: 'default' | 'danger';

    /** Render a divider in this slot — all other fields ignored. */
    separator?: boolean;

    /** Disable without removing. */
    disabled?: boolean;

    /**
     * Hide the item explicitly. Combined with `permission` and any
     * caller-supplied filter; defaults to `true` (visible).
     */
    visible?: boolean;

    /**
     * If set, the item is hidden unless the bound `ScreenContext`
     * grants this permission. Items with no `permission` always show.
     */
    permission?: Permissions;

    /** Click handler. The container handles closing the popup. */
    command?: () => void;
}
