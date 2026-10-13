import { ChangeDetectionStrategy, Component, computed, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EfViewportService } from '@elasticias/core';
import { EfModuleRailComponent } from '../ef-module-rail/ef-module-rail.component';
import { EfModuleSideComponent } from '../ef-module-side/ef-module-side.component';
import { EfAppTopComponent } from '../ef-app-top/ef-app-top.component';
import { EfAppMainComponent } from '../ef-app-main/ef-app-main.component';
import { EfBottomSheetComponent } from '../ef-bottom-sheet/ef-bottom-sheet.component';
import { TooltipModule } from 'primeng/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { Router, RouterLink } from '@angular/router';
import {
    EfActiveModuleService,
    EfPermissionService,
    EfShortcutService,
    EF_PREFERENCE_STORE,
    EF_SIDE_COLLAPSED_KEY,
    formatShortcut,
    EfModule,
    EfNavItem,
    EfNavSection,
} from '@elasticias/core';
import { signal } from '@angular/core';

/**
 * Top-level Comptoir shell.
 *
 * Composes the chrome an Elasticias app puts around its `<router-outlet />`.
 * Apps mount it at their root component:
 *
 * ```html
 * <ef-app-shell>
 *   <router-outlet />
 * </ef-app-shell>
 * ```
 *
 * The shell reads:
 * - `EfViewportService` to switch between desktop and mobile branches
 * - `EfPermissionService` (via the rail / mobile tabs) for visible modules
 * - `EfActiveModuleService` for the active module accent
 *
 * **Desktop / tablet:** rail (64px) + side (240px) + (top + main). The
 * side folds away from a toggle at the foot of the rail (or mod+B); the
 * rail never does. A tablet starts with it folded unless the viewer has
 * a stored choice (`EF_SIDE_COLLAPSED_KEY`).
 * **Mobile:** delegates to `<ef-app-shell-mobile>` — top bar + scrollable
 * body + 5-tab bottom bar + FAB slot.
 *
 * Top-bar slots are forwarded to `<ef-app-top>` on both layouts: project
 * with `breadcrumb`, `search`, `actions` attributes. The `side-footer`
 * slot is forwarded to the bottom of `<ef-module-side>` (desktop only —
 * mobile drops it; surface identity via `[actions]` instead). The `logo`
 * slot is forwarded to the top of `<ef-module-rail>` (desktop/tablet
 * only — mobile uses the bottom tab bar instead).
 */
@Component({
    selector: 'ef-app-shell',
    standalone: true,
    templateUrl: './ef-app-shell.component.html',
    styleUrl: './ef-app-shell.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        EfModuleRailComponent,
        EfModuleSideComponent,
        EfAppTopComponent,
        EfAppMainComponent,
        EfBottomSheetComponent,
        TooltipModule,
        TranslateModule,
        RouterLink,
    ],
    host: {
        '[attr.data-viewport]': 'viewport()',
    },
})
export class EfAppShellComponent {
    private readonly vp = inject(EfViewportService);
    private readonly perms = inject(EfPermissionService);
    private readonly active = inject(EfActiveModuleService);
    private readonly router = inject(Router);

    /** Show the 3px module-color stripe at the top of the content area. */
    @Input() stripe = true;

    readonly viewport = this.vp.current;
    readonly isMobile = this.vp.isMobile;
    readonly showSide = computed(() => !this.vp.isMobile());

    /* ── Side panel toggle ───────────────────────────────────────
         The rail stays; only the 240px module side folds away, for
         the screens that want the width (a wide grid, the order
         builder). The toggle sits at the foot of the rail rather than
         inside the side, so it is still there to bring the side back
         once it is gone, and in the same spot. Remembered per browser:
         it is a reading preference, not something worth a round trip. */

    private readonly prefs = inject(EF_PREFERENCE_STORE);

    /** The viewer's explicit choice ('1' folded, '0' open), or null when they never made one. */
    private readonly storedSide = signal(this.prefs.get(EF_SIDE_COLLAPSED_KEY));

    /**
     * Folded or open. An explicit choice always wins. Without one, a
     * tablet starts folded: at 768-1279px the 240px panel left a
     * phone-width column for a desktop table, so the right-hand columns
     * were cut off. A desktop keeps it open and a phone never renders it.
     *
     * The default is derived, never written: storing it would turn it
     * into a choice the viewer did not make, pin it when they rotate or
     * resize across the breakpoint, and with a server-backed store send
     * a request on every page load.
     */
    readonly sideCollapsed = computed(() => {
        const stored = this.storedSide();
        if (stored !== null) return stored === '1';
        return this.vp.isTablet();
    });

    /** Shown in the toggle's tooltip: the button is far from the content, the shortcut is not. */
    readonly shortcutHint = formatShortcut('mod+b');

    toggleSide(): void {
        const value = this.sideCollapsed() ? '0' : '1';
        this.storedSide.set(value);
        this.prefs.set(EF_SIDE_COLLAPSED_KEY, value);
    }

    constructor() {
        // A store that hydrates after sign in announces the key it filled.
        // A key it removed takes the panel back to the viewport default.
        this.prefs.changes?.pipe(takeUntilDestroyed()).subscribe((key) => {
            if (key === EF_SIDE_COLLAPSED_KEY) {
                this.storedSide.set(this.prefs.get(EF_SIDE_COLLAPSED_KEY));
            }
        });
        inject(EfShortcutService).register({
            id: 'shell.toggle-side',
            keys: 'mod+b',
            labelKey: 'common_sidebar_toggle',
            group: 'shortcut_group_general',
            handler: () => {
                if (!this.isMobile()) this.toggleSide();
            },
        });
    }

    /* ── Mobile chrome ───────────────────────────────────────────
         Tabs and the module sheet live here rather than in a child
         component: content has to be declared once, in one template,
         and a child shell would mean declaring the slots twice. */

    readonly activeId = this.active.activeModuleId;
    readonly switcherOpen = signal(false);

    /** Five tabs is what fits a phone; the rest live in the sheet. */
    readonly tabs = computed<EfModule[]>(() => this.perms.visibleModules().slice(0, 5));
    readonly allVisible = this.perms.visibleModules;

    /**
     * The screens inside the active module, for the mobile sheet.
     *
     * On a phone the side nav is not rendered, and the tab bar switches
     * modules — so without this there was no way to reach any screen except
     * the module's default one. Same filtering as `ef-module-side`, because
     * it answers the same question.
     */
    readonly moduleSections = computed<EfNavSection[]>(() => {
        const m = this.active.activeModule();
        if (!m) return [];
        return m.navSections
            .map(section => ({
                ...section,
                items: section.items.filter(item =>
                    this.perms.can(m.id, item.requiredAction ?? 'read') &&
                    (!item.screenCode || this.perms.canScreen(item.screenCode)),
                ),
            }))
            .filter(section => section.items.length > 0);
    });

    onNavigate(item: EfNavItem): void {
        this.router.navigateByUrl(item.route);
        this.switcherOpen.set(false);
    }

    openSwitcher(): void {
        this.switcherOpen.set(true);
    }

    /**
     * Dismiss the module sheet from outside.
     *
     * Every item the shell itself renders in the sheet navigates, and
     * navigating closes it. An app-level entry in the `[sheet-footer]` slot
     * may do neither — "à propos" opens a dialog — and would otherwise leave
     * the sheet standing behind it. The app owns that button, so the app says
     * when the sheet is done: `<ef-app-shell #shell>` then
     * `(click)="shell.closeSwitcher(); …"`.
     */
    closeSwitcher(): void {
        this.switcherOpen.set(false);
    }

    onSwitcherChange(open: boolean): void {
        this.switcherOpen.set(open);
    }

    onSelect(module: EfModule): void {
        this.router.navigateByUrl(module.defaultRoute);
        this.switcherOpen.set(false);
    }
}
