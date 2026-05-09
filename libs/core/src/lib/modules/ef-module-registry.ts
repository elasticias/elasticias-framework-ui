import { InjectionToken } from '@angular/core';

/**
 * The eight ERP modules surfaced by Comptoir. New modules require
 * a matching `--m-{id}` token in the SCSS layer (libs/ui/src/lib/_comptoir.scss)
 * and a labelKey in the consuming app's i18n bundles.
 */
export type EfModuleId =
    | 'sales'
    | 'purchase'
    | 'stock'
    | 'pos'
    | 'marketing'
    | 'store'
    | 'finance'
    | 'admin';

export type EfNavAction = 'read' | 'write' | 'admin';

export interface EfNavItem {
    /** Stable identifier — usually matches the screen code (e.g. `Users`, `SalesOrders`). */
    id: string;
    labelKey: string;
    icon?: string;
    route: string;
    /** Minimum permission level required to render this item. Defaults to `read`. */
    requiredAction?: EfNavAction;
}

export interface EfNavSection {
    id: string;
    labelKey?: string;
    items: EfNavItem[];
}

export interface EfModule {
    id: EfModuleId;
    labelKey: string;
    /** PrimeNG icon class used by `ef-module-rail`, e.g. `pi pi-shopping-bag`. */
    icon: string;
    /**
     * CSS custom-property name (without the leading `--`) that the rail
     * applies to the module-current accent. Always `m-{id}` and resolves
     * via the SCSS layer's `[data-module]` selectors at runtime.
     */
    accent: `m-${EfModuleId}`;
    defaultRoute: string;
    navSections: EfNavSection[];
    /**
     * Logical grouping for rail divider placement. `ef-module-rail` renders
     * a 1px divider between two consecutive visible modules whose `group`
     * differs. Free string — `'operations' | 'commerce' | 'admin'` is the
     * conventional set but apps can use anything stable.
     */
    group?: string;
}

/**
 * Default skeleton for the eight ERP modules. Apps either consume this
 * directly via `EF_MODULES_TOKEN` or extend it with their own `navSections`.
 *
 * Phase 1 ships the metadata only — `ef-module-rail` (Phase 2) uses
 * `id` / `labelKey` / `icon` / `accent` / `defaultRoute`. `navSections`
 * are populated per-app as each module's screens land in Phase 4-5.
 */
export const EF_MODULES: ReadonlyArray<EfModule> = [
    {
        id: 'sales',
        labelKey: 'modules.sales',
        icon: 'pi pi-shopping-bag',
        accent: 'm-sales',
        defaultRoute: '/operations/sales',
        navSections: [],
        group: 'operations',
    },
    {
        id: 'purchase',
        labelKey: 'modules.purchase',
        icon: 'pi pi-truck',
        accent: 'm-purchase',
        defaultRoute: '/operations/purchase',
        navSections: [],
        group: 'operations',
    },
    {
        id: 'stock',
        labelKey: 'modules.stock',
        icon: 'pi pi-warehouse',
        accent: 'm-stock',
        defaultRoute: '/operations/stock',
        navSections: [],
        group: 'operations',
    },
    {
        id: 'pos',
        labelKey: 'modules.pos',
        icon: 'pi pi-shop',
        accent: 'm-pos',
        defaultRoute: '/pos',
        navSections: [],
        group: 'operations',
    },
    {
        id: 'marketing',
        labelKey: 'modules.marketing',
        icon: 'pi pi-megaphone',
        accent: 'm-marketing',
        defaultRoute: '/marketing',
        navSections: [],
        group: 'commerce',
    },
    {
        id: 'store',
        labelKey: 'modules.store',
        icon: 'pi pi-globe',
        accent: 'm-store',
        defaultRoute: '/store',
        navSections: [],
        group: 'commerce',
    },
    {
        id: 'finance',
        labelKey: 'modules.finance',
        icon: 'pi pi-chart-line',
        accent: 'm-finance',
        defaultRoute: '/finance',
        navSections: [],
        group: 'commerce',
    },
    {
        id: 'admin',
        labelKey: 'modules.admin',
        icon: 'pi pi-shield',
        accent: 'm-admin',
        defaultRoute: '/admin',
        navSections: [],
        group: 'admin',
    },
];

/**
 * DI token that the shell components (`ef-module-rail`, `ef-module-side`)
 * read from. Apps provide their own definition (typically extending
 * `EF_MODULES` with populated `navSections`):
 *
 * ```ts
 * providers: [
 *   { provide: EF_MODULES_TOKEN, useValue: APP_MODULES }
 * ]
 * ```
 */
export const EF_MODULES_TOKEN = new InjectionToken<ReadonlyArray<EfModule>>(
    'EF_MODULES',
    { providedIn: 'root', factory: () => EF_MODULES }
);
