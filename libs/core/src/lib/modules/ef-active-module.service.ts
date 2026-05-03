import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { EF_MODULES_TOKEN, EfModule, EfModuleId } from './ef-module-registry';

/**
 * Single source of truth for "which ERP module is active right now."
 *
 * Watches the Router and matches the current URL against each module's
 * `defaultRoute`. The longest matching prefix wins, so `/operations/sales`
 * resolves to `sales` even though `/operations` could in theory match
 * something shorter.
 *
 * Consumers — `ef-module-rail`, `ef-module-side`, `ef-app-main`,
 * `ef-page-head` — read `activeModule()` and derive their state from it.
 *
 * Apps that navigate programmatically without a URL change (rare) can
 * call `setActiveModule(id)` to override.
 */
@Injectable({ providedIn: 'root' })
export class EfActiveModuleService {
    private readonly router = inject(Router);
    private readonly modules = inject(EF_MODULES_TOKEN);
    private readonly destroyRef = inject(DestroyRef);

    private readonly _activeModule = signal<EfModule | null>(null);

    readonly activeModule = this._activeModule.asReadonly();
    readonly activeModuleId = computed(() => this._activeModule()?.id ?? null);

    constructor() {
        this.resolveFromUrl(this.router.url);

        this.router.events
            .pipe(
                filter((e): e is NavigationEnd => e instanceof NavigationEnd),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(e => this.resolveFromUrl(e.urlAfterRedirects));
    }

    /**
     * Force the active module. Most apps don't need this — the router
     * subscription keeps `activeModule()` in sync automatically.
     */
    setActiveModule(id: EfModuleId | null): void {
        if (id === null) {
            this._activeModule.set(null);
            return;
        }
        const match = this.modules.find(m => m.id === id);
        if (match) this._activeModule.set(match);
    }

    private resolveFromUrl(url: string): void {
        const path = url.split('?')[0].split('#')[0];

        let best: EfModule | null = null;
        let bestLen = 0;
        for (const m of this.modules) {
            const route = m.defaultRoute;
            if (path === route || path.startsWith(route + '/')) {
                if (route.length > bestLen) {
                    best = m;
                    bestLen = route.length;
                }
            }
        }
        this._activeModule.set(best);
    }
}
