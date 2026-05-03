import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { computed, DestroyRef, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

export type EfViewport = 'mobile' | 'tablet' | 'desktop';

interface ViewportQuery {
    viewport: EfViewport;
    query: string;
}

const QUERIES: ViewportQuery[] = [
    { viewport: 'mobile',  query: '(max-width: 767px)' },
    { viewport: 'tablet',  query: '(min-width: 768px) and (max-width: 1279px)' },
    { viewport: 'desktop', query: '(min-width: 1280px)' },
];

/**
 * Emits the current viewport tier based on `window.matchMedia` breakpoints.
 *
 * Breakpoints come from `libs/tokens/targets.json`:
 *   - mobile:  ≤ 767px
 *   - tablet:  768 – 1279px
 *   - desktop: ≥ 1280px
 *
 * SSR-safe: returns `'desktop'` when `window` is unavailable.
 *
 * Usage:
 * ```ts
 * private viewport = inject(EfViewportService);
 *
 * isMobile = computed(() => this.viewport.current() === 'mobile');
 * ```
 */
@Injectable({ providedIn: 'root' })
export class EfViewportService {
    private readonly document = inject(DOCUMENT);
    private readonly platformId = inject(PLATFORM_ID);
    private readonly destroyRef = inject(DestroyRef);

    private readonly _current = signal<EfViewport>('desktop');

    readonly current = this._current.asReadonly();
    readonly isMobile  = computed(() => this._current() === 'mobile');
    readonly isTablet  = computed(() => this._current() === 'tablet');
    readonly isDesktop = computed(() => this._current() === 'desktop');

    constructor() {
        if (!isPlatformBrowser(this.platformId)) return;

        const win = this.document.defaultView;
        if (!win || typeof win.matchMedia !== 'function') return;

        const lists = QUERIES.map(({ viewport, query }) => {
            const mql = win.matchMedia(query);
            const handler = (e: MediaQueryListEvent | MediaQueryList) => {
                if (e.matches) this._current.set(viewport);
            };
            handler(mql);
            mql.addEventListener('change', handler as (e: MediaQueryListEvent) => void);
            return { mql, handler };
        });

        this.destroyRef.onDestroy(() => {
            for (const { mql, handler } of lists) {
                mql.removeEventListener('change', handler as (e: MediaQueryListEvent) => void);
            }
        });
    }
}
