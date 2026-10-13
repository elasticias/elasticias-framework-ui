import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import { StorageUtils } from '@elasticias/utils';

/**
 * Where the shell, the theme and data tables keep a viewer's UI preferences
 * (theme state, side-panel fold, table density and hidden columns).
 *
 * The synchronous contract is deliberate: these preferences are read while a
 * component is being built, so the first paint is right. An app that keeps
 * them on a server therefore serves reads from a local cache that it
 * hydrates itself, and sends writes upstream in the background.
 *
 * Keys are the full storage keys, exactly as they are in localStorage today
 * (see {@link efPrefKey} and {@link EF_SIDE_COLLAPSED_KEY}); values are the
 * raw strings stored under them.
 */
export interface EfPreferenceStore {
    /** The stored value, or null when absent or storage is unavailable. */
    get(key: string): string | null;
    /**
     * Consumers may call this with a value the store already holds, and a
     * store that keeps partial values (the theme's AppState) will not match
     * it byte for byte. Server-backed stores should ignore no-op sets
     * (compare the parsed or merged result) rather than issue a request.
     */
    set(key: string, value: string): void;
    remove(key: string): void;
    /**
     * Optional. Emits a key whose value was changed from outside the
     * consumers (for example a server hydrate after sign in), so a consumer
     * that is already alive can re-read it. Must NOT emit for the store's own
     * `set` / `remove` calls. The theme and the app shell follow it (a removed
     * key resets them to defaults; the theme value may be a partial AppState,
     * merged over the live one). ef-data-card reads its key only when it is
     * constructed and ignores it.
     */
    readonly changes?: Observable<string>;
}

/** localStorage key of the app-shell side-panel fold ('1' collapsed, '0' open). Not prefixed. */
export const EF_SIDE_COLLAPSED_KEY = 'ef.shell.side-collapsed';

/** Key for a preference that StorageUtils has always stored under its prefix (`Elasticias_` by default). */
export function efPrefKey(name: string): string {
    return `${StorageUtils.prefix}${name}`;
}

/** Prefix of the per-table key family: `efTablePrefsKey(tableKey)` is the full key. */
export const EF_TABLE_PREFS_PREFIX = 'TABLE_PREFS_';

/** Full key of one table's density / hidden-columns preference (`Elasticias_TABLE_PREFS_<tableKey>`). */
export function efTablePrefsKey(tableKey: string): string {
    return efPrefKey(`${EF_TABLE_PREFS_PREFIX}${tableKey}`);
}

/** localStorage, never throwing: a private window or blocked site data just means nothing is remembered. */
export class LocalStoragePreferenceStore implements EfPreferenceStore {
    get(key: string): string | null {
        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }
    }

    set(key: string, value: string): void {
        try {
            localStorage.setItem(key, value);
        } catch {
            /* the preference holds for this visit only */
        }
    }

    remove(key: string): void {
        try {
            localStorage.removeItem(key);
        } catch {
            /* nothing to remove from */
        }
    }
}

/**
 * Preference store. Defaults to localStorage with the historical keys, so
 * nothing changes unless an app provides its own:
 * `{ provide: EF_PREFERENCE_STORE, useClass: ServerPreferenceStore }`.
 */
export const EF_PREFERENCE_STORE = new InjectionToken<EfPreferenceStore>('EF_PREFERENCE_STORE', {
    providedIn: 'root',
    factory: () => new LocalStoragePreferenceStore(),
});
