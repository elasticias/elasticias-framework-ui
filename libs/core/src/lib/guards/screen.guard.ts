import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { StorageUtils } from '@elasticias/utils';
import { Permissions } from '@elasticias/types';

/**
 * Configuration for the screen guard factory.
 */
export interface ScreenGuardConfig {
  /** Storage key where screen grants are stored (default: 'CURRENT_USER_GRANTS') */
  grantsStorageKey?: string;
  /** Route to redirect to when access is denied (default: '/') */
  deniedRedirect?: string;
  /** Minimum required permission to access the screen (default: Permissions.Read) */
  requiredPermission?: Permissions;
  /** Storage type to read grants from (default: 'session') */
  storageType?: 'local' | 'session';
}

/**
 * Creates a reusable Angular route guard that checks screen-level permissions.
 *
 * Usage in route definitions:
 * ```typescript
 * {
 *   path: 'countries',
 *   data: { screenCode: 'Countries' },
 *   canActivate: [screenGuard()],
 *   children: [
 *     { path: '', component: CountriesComponent },
 *     { path: 'details/:id', component: CountriesDetailsComponent },
 *   ]
 * }
 * ```
 *
 * The guard reads the `screenCode` from route data (traversing parent routes)
 * and checks if the current user has at least the required permission (default: Read).
 */
export function screenGuard(config?: ScreenGuardConfig): CanActivateFn {
  return (route: ActivatedRouteSnapshot) => {
    const router = inject(Router);
    const grantsKey = config?.grantsStorageKey ?? 'CURRENT_USER_GRANTS';
    const deniedRedirect = config?.deniedRedirect ?? '/';
    const requiredPermission = config?.requiredPermission ?? Permissions.Read;
    const storageType = config?.storageType ?? 'local';

    const screenCode = getScreenCode(route);

    // If no screenCode found on this route or any parent, allow access
    if (!screenCode) {
      return true;
    }

    const screenGrants = storageType === 'session'
      ? StorageUtils.getSession<Record<string, { permissions?: string[] }>>(grantsKey)
      : StorageUtils.getLocal<Record<string, { permissions?: string[] }>>(grantsKey);

    if (!screenGrants) {
      router.navigate([deniedRedirect]);
      return false;
    }

    const grant = screenGrants[screenCode];
    if (!grant?.permissions?.includes(requiredPermission)) {
      router.navigate([deniedRedirect]);
      return false;
    }

    return true;
  };
}

/**
 * Walks up the route tree to find the nearest screenCode in route data.
 */
function getScreenCode(route: ActivatedRouteSnapshot): string | undefined {
  let current: ActivatedRouteSnapshot | null = route;
  while (current) {
    const code = current.data?.['screenCode'] as string | undefined;
    if (code) return code;
    current = current.parent;
  }
  return undefined;
}

/**
 * Utility function to check if the current user has a specific permission on a screen.
 * Can be used in components/services outside of route guards.
 */
export function hasScreenPermission(
  screenCode: string,
  permission: Permissions,
  grantsStorageKey = 'CURRENT_USER_GRANTS',
  storageType: 'local' | 'session' = 'local'
): boolean {
  const screenGrants = storageType === 'session'
    ? StorageUtils.getSession<Record<string, { permissions?: string[] }>>(grantsStorageKey)
    : StorageUtils.getLocal<Record<string, { permissions?: string[] }>>(grantsStorageKey);
  if (!screenGrants) return false;

  const grant = screenGrants[screenCode];
  return grant?.permissions?.includes(permission) ?? false;
}
