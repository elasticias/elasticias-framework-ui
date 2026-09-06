import { StorageUtils } from './storage.utils';

/**
 * Options for {@link PersistedState}.
 */
export interface PersistedStateOptions<T> {
    /** Keep the value in sessionStorage (dies with the tab) instead of
     *  localStorage (survives a browser restart). Default: localStorage. */
    session?: boolean;

    /**
     * Rebuild `T` from what came back out of JSON. Required whenever the
     * shape holds anything JSON cannot carry — a `Date` round-trips as an
     * ISO string, and code downstream that calls `.getTime()` on it breaks
     * far away from here. Return `null` to reject a value written by an
     * older version of the app.
     */
    revive?: (raw: unknown) => T | null;

    /** Serialize before writing, when the in-memory shape isn't plain JSON. */
    serialize?: (value: T) => unknown;
}

/**
 * A single piece of component state that should survive a page refresh —
 * the active period on a dashboard, a chosen tab, a collapsed rail.
 *
 * Every operation is best-effort. Storage can be unavailable (private
 * browsing, a locked-down browser), the entry can be corrupt, or it can
 * hold a shape from a previous release. In all of those cases `read()`
 * returns `null` and the caller keeps its own default, which is why this
 * is only ever suitable for convenience state and never for anything the
 * app depends on being there.
 *
 * Reach for it through `AbstractComponent.persisted()` inside a screen;
 * construct it directly in components that sit outside that hierarchy.
 */
export class PersistedState<T> {
    constructor(
        private readonly key: string,
        private readonly options: PersistedStateOptions<T> = {},
    ) {}

    /** The stored value, or `null` when there is nothing usable. */
    read(): T | null {
        try {
            const raw = this.options.session
                ? StorageUtils.getSession<unknown>(this.key)
                : StorageUtils.getLocal<unknown>(this.key);
            if (raw === null || raw === undefined) return null;
            return this.options.revive ? this.options.revive(raw) : (raw as T);
        } catch {
            return null;
        }
    }

    write(value: T): void {
        try {
            const payload = this.options.serialize ? this.options.serialize(value) : value;
            if (this.options.session) StorageUtils.setSession(this.key, payload);
            else StorageUtils.setLocal(this.key, payload);
        } catch {
            /* Storage is a convenience here, never a contract. */
        }
    }

    clear(): void {
        try {
            if (this.options.session) StorageUtils.removeSession(this.key);
            else StorageUtils.removeLocal(this.key);
        } catch {
            /* ignore */
        }
    }
}
