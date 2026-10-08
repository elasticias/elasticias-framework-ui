import { ChangeDetectionStrategy, Component, computed, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EfViewportService } from '@elasticias/core';
import { EfModuleRailComponent } from '../ef-module-rail/ef-module-rail.component';
import { EfModuleSideComponent } from '../ef-module-side/ef-module-side.component';
import { EfAppTopComponent } from '../ef-app-top/ef-app-top.component';
import { EfAppMainComponent } from '../ef-app-main/ef-app-main.component';
import { EfBottomSheetComponent } from '../ef-bottom-sheet/ef-bottom-sheet.component';
import { TranslateModule } from '@ngx-translate/core';
import { Router, RouterLink } from '@angular/router';
import {
    EfActiveModuleService,
    EfPermissionService,
    EfShortcutService,
    EfModule,
    EfNavItem,
    EfNavSection,
} from '@elasticias/core';
import { signal } from '@angular/core';

const SIDE_COLLAPSED_KEY = 'ef.shell.side-collapsed';

function readSideCollapsed(): boolean {
    try {
        return localStorage.getItem(SIDE_COLLAPSED_KEY) === '1';
    } catch {
        return false;
    }
}

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
 * side folds away from a toggle at the leading edge of the top bar (or
 * mod+B); the rail never does.
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
         builder). The toggle sits at the leading edge of the top bar
         rather than inside the side, so it is still there to bring
         the side back once it is gone. Remembered per browser: it is
         a reading preference, not something worth a round trip. */

    readonly sideCollapsed = signal(readSideCollapsed());

    toggleSide(): void {
        const collapsed = !this.sideCollapsed();
        this.sideCollapsed.set(collapsed);
        try {
            localStorage.setItem(SIDE_COLLAPSED_KEY, collapsed ? '1' : '0');
        } catch {
            /* private window or blocked storage: the toggle still works for this visit */
        }
    }

    constructor() {
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
                    this.perms.can(m.id, item.requiredAction ?? 'read'),
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
