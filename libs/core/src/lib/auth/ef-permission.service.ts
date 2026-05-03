import { computed, inject, Injectable, Signal, signal } from '@angular/core';
import { EF_MODULES_TOKEN, EfModule, EfModuleId } from '../modules/ef-module-registry';

export type EfPermissionLevel = 'none' | 'read' | 'write' | 'admin';

export interface EfModulePermission {
    module: EfModuleId;
    level: EfPermissionLevel;
}

const LEVEL_ORDER: Record<EfPermissionLevel, number> = {
    none: 0,
    read: 1,
    write: 2,
    admin: 3,
};

const ACTION_REQUIRED: Record<Exclude<EfPermissionLevel, 'none'>, EfPermissionLevel> = {
    read:  'read',
    write: 'write',
    admin: 'admin',
};

/**
 * Module-scoped permission service.
 *
 * Apps populate it from their auth bootstrap once the user's profile is
 * loaded — typically via `setPermissions()` or by providing a custom
 * source signal:
 *
 * ```ts
 * // bootstrap.ts
 * const perms = inject(EfPermissionService);
 * perms.setPermissions(profile.permissions);
 * ```
 *
 * The service is the single source of truth for shell components
 * (`ef-module-rail`, `ef-module-side`, `*efCan` directive) and routing
 * defaults. Once the screens/menus → Mongo migration lands, the
 * permissions list will be served denormalized on the user/profile
 * document and consumed here without a join.
 */
@Injectable({ providedIn: 'root' })
export class EfPermissionService {
    private readonly modules = inject(EF_MODULES_TOKEN);

    private readonly _permissions = signal<ReadonlyArray<EfModulePermission>>([]);

    readonly permissions = this._permissions.asReadonly();

    /**
     * Replace the current permission set. Pass `[]` to clear (e.g., on logout).
     */
    setPermissions(perms: ReadonlyArray<EfModulePermission>): void {
        this._permissions.set(perms);
    }

    /**
     * The level granted to the current user for a given module.
     * Returns `'none'` if the module is not in the permission set.
     */
    level(module: EfModuleId): EfPermissionLevel {
        return this._permissions().find(p => p.module === module)?.level ?? 'none';
    }

    /**
     * Whether the current user can perform `action` on `module`.
     * Levels are hierarchical: `admin` > `write` > `read` > `none`.
     */
    can(module: EfModuleId, action: Exclude<EfPermissionLevel, 'none'> = 'read'): boolean {
        return LEVEL_ORDER[this.level(module)] >= LEVEL_ORDER[ACTION_REQUIRED[action]];
    }

    /**
     * The list of modules the user can read, in registry order.
     * Used by `ef-module-rail` to decide which icons render.
     */
    readonly visibleModules: Signal<ReadonlyArray<EfModule>> = computed(() => {
        const perms = this._permissions();
        const granted = new Set(
            perms.filter(p => p.level !== 'none').map(p => p.module)
        );
        return this.modules.filter(m => granted.has(m.id));
    });

    /**
     * The first visible module — the default landing module after login.
     * Returns `null` when the user has no modules.
     */
    readonly defaultModule: Signal<EfModule | null> = computed(() => {
        return this.visibleModules()[0] ?? null;
    });
}
