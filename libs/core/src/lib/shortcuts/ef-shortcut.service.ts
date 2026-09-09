import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { computed, DestroyRef, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isMacPlatform } from './format-shortcut';
import { comboFromEvent, isTypingTarget, normaliseKeys } from './shortcut-keys';
import { EfShortcut, EfShortcutGroup } from './ef-shortcut.types';

/**
 * App-wide keyboard-shortcut registry, plus the single `document:keydown`
 * dispatcher that acts on it.
 *
 * ```ts
 * private readonly shortcuts = inject(EfShortcutService);
 *
 * constructor() {
 *   // Auto-unregisters on this component's DestroyRef, called from a
 *   // constructor / field initializer, an active injection context.
 *   this.shortcuts.register({
 *     id: 'sales-order.save',
 *     keys: 'mod+s',
 *     labelKey: 'sales_order_save',
 *     group: 'shortcut_group_sales_order',
 *     handler: () => this.save(),
 *   });
 * }
 * ```
 *
 * Two things make this safe to leave switched on everywhere:
 * - The dispatcher ignores keydown while the target is an input, textarea,
 *   select, or anything `contenteditable`. See `isTypingTarget`.
 * - `preventDefault` is only called once a registration actually matches,
 *   so an unmapped key never loses its browser default.
 *
 * `list()` exposes the registry grouped for `ef-shortcuts-dialog`, as a
 * signal so the dialog reflects registrations and disposals live.
 */
@Injectable({ providedIn: 'root' })
export class EfShortcutService {
    private readonly document = inject(DOCUMENT);
    private readonly platformId = inject(PLATFORM_ID);
    private readonly destroyRef = inject(DestroyRef);

    private readonly registry = signal<ReadonlyMap<string, EfShortcut>>(new Map());

    /**
     * The registry, grouped for display and deduplicated by
     * (group, label, keys): several instances of the same conceptual
     * shortcut (one row-actions component per row, say) collapse to a
     * single line rather than repeating once per instance.
     */
    readonly list = computed<EfShortcutGroup[]>(() => {
        const deduped = new Map<string, EfShortcut>();
        for (const shortcut of this.registry().values()) {
            const key = `${shortcut.group}::${shortcut.labelKey}::${shortcut.keys}`;
            if (!deduped.has(key)) deduped.set(key, shortcut);
        }

        const byGroup = new Map<string, EfShortcut[]>();
        for (const shortcut of deduped.values()) {
            const group = byGroup.get(shortcut.group) ?? [];
            group.push(shortcut);
            byGroup.set(shortcut.group, group);
        }

        return Array.from(byGroup.entries()).map(([group, shortcuts]) => ({ group, shortcuts }));
    });

    constructor() {
        if (!isPlatformBrowser(this.platformId)) return;
        this.document.addEventListener('keydown', this.onKeydown);
        this.destroyRef.onDestroy(() => this.document.removeEventListener('keydown', this.onKeydown));
    }

    /**
     * Registers a shortcut and returns a disposer. When `register` is
     * called from an active injection context (a component constructor or
     * field initializer), the shortcut also auto-unregisters when that
     * context is destroyed. Call it explicitly elsewhere (a plain method,
     * a route resolver already outside construction) and dispose it
     * yourself.
     */
    register(shortcut: EfShortcut): () => void {
        const entry: EfShortcut = { ...shortcut, keys: normaliseKeys(shortcut.keys) };

        this.registry.update(map => {
            const next = new Map(map);
            next.set(entry.id, entry);
            return next;
        });

        const dispose = (): void => this.unregister(entry.id);
        this.tryGetCallerDestroyRef()?.onDestroy(dispose);
        return dispose;
    }

    /** Removes a registration by id. Safe to call twice: the disposer
     *  returned by `register` calls this. */
    unregister(id: string): void {
        this.registry.update(map => {
            if (!map.has(id)) return map;
            const next = new Map(map);
            next.delete(id);
            return next;
        });
    }

    /** `inject()` throws outside an active injection context; that is how
     *  a call from a plain method (as opposed to a constructor) is told
     *  apart from one worth auto-disposing. */
    private tryGetCallerDestroyRef(): DestroyRef | null {
        try {
            return inject(DestroyRef, { optional: true });
        } catch {
            return null;
        }
    }

    private readonly onKeydown = (event: KeyboardEvent): void => {
        if (isTypingTarget(event.target)) return;

        const combo = comboFromEvent(event, isMacPlatform);
        for (const shortcut of this.registry().values()) {
            if (shortcut.keys !== combo) continue;
            if (shortcut.when && !shortcut.when()) continue;
            event.preventDefault();
            shortcut.handler();
            return;
        }
    };
}
