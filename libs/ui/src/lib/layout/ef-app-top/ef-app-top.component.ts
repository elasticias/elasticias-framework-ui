import { booleanAttribute, ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { TooltipModule } from 'primeng/tooltip';
import { EF_SESSION, EfActiveModuleService } from '@elasticias/core';
import { EfThemeToggleComponent } from '../ef-theme-toggle/ef-theme-toggle.component';

/**
 * Top chrome bar for the desktop and mobile shells.
 *
 * Layout is three slots: `breadcrumb` (left), `search` (centre), and
 * `actions` (right). Apps project into `search` and `actions` for global
 * features (⌘K, notifications bell, profile chip).
 *
 * The breadcrumb slot fills automatically from `EfActiveModuleService`:
 * a leading dot in the active module's accent, the module label, then
 * the active nav-item label as the leaf. Apps that need a custom
 * breadcrumb can still project their own content into `[breadcrumb]`.
 */
@Component({
    selector: 'ef-app-top',
    standalone: true,
    templateUrl: './ef-app-top.component.html',
    styleUrl: './ef-app-top.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, TranslateModule, TooltipModule, EfThemeToggleComponent],
})
export class EfAppTopComponent {
    /**
     * Show the light/dark switch at the trailing edge of the bar.
     *
     * It lives here rather than being projected through `[actions]`
     * because that slot is declared once per viewport branch in
     * `ef-app-shell` and only the mobile one receives content — so
     * anything an app projects there never appears on desktop.
     */
    readonly themeToggle = input(true, { transform: booleanAttribute });

    /**
     * Show the sign-out button. It only renders when the app has provided
     * `EF_SESSION`, so this input turns off a control the app opted into
     * rather than being the thing that enables it.
     */
    readonly logout = input(true, { transform: booleanAttribute });

    /** Present only when the app provides `EF_SESSION`. */
    protected readonly session = inject(EF_SESSION, { optional: true });

    protected signOut(): void {
        this.session?.logout();
    }

    /* ── Sign-out on touch ──────────────────────────────────────────
       Sign-out has no undo, and nothing guards an unsaved form, so on a
       touch screen it must neither invite a long press nor act on one.
       PrimeNG's tooltip opens on touchstart and never cancels the click
       that follows, so "hold it to see what it does" would sign the user
       out on release. A screen without hover therefore gets no tooltip on
       this button (the aria-label still names it), and a click that ends
       a touch held for HOLD_MS or longer is dropped. */

    /** A touch or pen press at least this long is a hold, not a tap. */
    static readonly HOLD_MS = 500;

    /** True on a screen whose primary pointer cannot hover (a phone, a tablet). */
    protected readonly touchOnly = signal(false);

    private pressStart: { pointerType: string; at: number } | null = null;

    constructor() {
        const mql = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
            ? window.matchMedia('(hover: none)')
            : null;
        if (mql) {
            this.touchOnly.set(mql.matches);
            const onChange = (e: MediaQueryListEvent) => this.touchOnly.set(e.matches);
            mql.addEventListener?.('change', onChange);
            inject(DestroyRef).onDestroy(() => mql.removeEventListener?.('change', onChange));
        }
    }

    protected onSignOutPointerDown(event: PointerEvent): void {
        this.pressStart = { pointerType: event.pointerType, at: Date.now() };
    }

    protected onSignOutClick(): void {
        const press = this.pressStart;
        this.pressStart = null;
        const held = press !== null && press.pointerType !== 'mouse' &&
            Date.now() - press.at >= EfAppTopComponent.HOLD_MS;
        if (held) return;
        this.signOut();
    }

    private readonly active = inject(EfActiveModuleService);

    readonly module = this.active.activeModule;
    readonly navItem = this.active.activeNavItem;

    readonly hasBreadcrumb = computed(() => this.module() != null);
}
