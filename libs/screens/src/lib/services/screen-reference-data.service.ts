import { InjectionToken, Signal } from '@angular/core';
import { ReferenceDataProvider } from '../config/screen-context';
import { LoadOptions } from '../config/screen-config';

/**
 * Abstract interface for reference data services used by screen components.
 * Apps must implement this interface and provide it via SCREEN_REF_DATA_SERVICE token.
 *
 * Extends ReferenceDataProvider (getReference/hasReference for ScreenContext)
 * with methods for loading, refreshing, and invalidating reference data.
 */
export interface ScreenReferenceDataService extends ReferenceDataProvider {
  /**
   * Load dynamic reference data by keys
   * @param keys Array of reference data keys to load
   * @param options Optional load options (bypassCache, ttl, forceRefresh)
   */
  loadReferenceKeys(keys: string[], options?: LoadOptions): Promise<void>;

  /**
   * Load static reference data by type names
   * @param types Array of static reference type names
   * @param forceRefresh Force reload from server
   */
  loadStaticRefs(types: string[], forceRefresh?: boolean): Promise<void>;

  /**
   * Refresh reference data keys (force reload from server)
   * @param keys Array of keys to refresh
   * @param bypassCache Bypass cache entirely
   */
  refreshKeys(keys: string[], bypassCache?: boolean): Promise<void>;

  /**
   * Invalidate reference data keys (mark as stale)
   * @param keys Array of keys to invalidate
   */
  invalidateKeys(keys: string[]): Promise<void>;
}

/**
 * Injection token for the screen reference data service.
 * Apps must provide this token with their concrete implementation.
 *
 * @example
 * // In app module or component providers:
 * { provide: SCREEN_REF_DATA_SERVICE, useExisting: ReferenceDataService }
 */
export const SCREEN_REF_DATA_SERVICE = new InjectionToken<ScreenReferenceDataService>(
  'SCREEN_REF_DATA_SERVICE'
);
