import { ChangeDetectionStrategy, Component, computed, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EfViewportService } from '@elasticias/core';
import { EfModuleRailComponent } from '../ef-module-rail/ef-module-rail.component';
import { EfModuleSideComponent } from '../ef-module-side/ef-module-side.component';
import { EfAppTopComponent } from '../ef-app-top/ef-app-top.component';
import { EfAppMainComponent } from '../ef-app-main/ef-app-main.component';
import { EfBottomSheetComponent } from '../ef-bottom-sheet/ef-bottom-sheet.component';
import { TranslateModule } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { EfActiveModuleService, EfPermissionService, EfModule } from '@elasticias/core';
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
 * **Desktop / tablet:** rail (64px) + side (240px) + (top + main).
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

    /* ── Mobile chrome ───────────────────────────────────────────
         Tabs and the module sheet live here rather than in a child
         component: content has to be declared once, in one template,
         and a child shell would mean declaring the slots twice. */

    readonly activeId = this.active.activeModuleId;
    readonly switcherOpen = signal(false);

    /** Five tabs is what fits a phone; the rest live in the sheet. */
    readonly tabs = computed<EfModule[]>(() => this.perms.visibleModules().slice(0, 5));
    readonly allVisible = this.perms.visibleModules;

    openSwitcher(): void {
        this.switcherOpen.set(true);
    }

    onSwitcherChange(open: boolean): void {
        this.switcherOpen.set(open);
    }

    onSelect(module: EfModule): void {
        this.router.navigateByUrl(module.defaultRoute);
        this.switcherOpen.set(false);
    }
}
