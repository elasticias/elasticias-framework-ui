import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { TooltipModule } from 'primeng/tooltip';
import {
    EfActiveModuleService,
    EfModule,
    EfPermissionService,
} from '@elasticias/core';
import { EfAppTopComponent } from '../ef-app-top/ef-app-top.component';
import { EfAppMainComponent } from '../ef-app-main/ef-app-main.component';
import { EfBottomSheetComponent } from '../ef-bottom-sheet/ef-bottom-sheet.component';

/**
 * Mobile-only shell. Picks up when `ef-app-shell` detects a mobile
 * viewport. Composition:
 *
 * - Top bar (`ef-app-top`) with a menu trigger that opens the module
 *   switcher in a bottom sheet.
 * - Scrollable content (`ef-app-main`) — projects `<router-outlet />`.
 * - 5-tab bottom bar — first 5 visible modules from
 *   `EfPermissionService.visibleModules()`. Apps that want a usage-
 *   ranked tab order can replace the registry via `EF_MODULES_TOKEN`.
 * - FAB slot (`[fab]`) — apps project a `<ef-fab />` here.
 *
 * The module switcher (bottom sheet) lists all visible modules so
 * users can reach modules outside the top-5 tabs.
 */
@Component({
    selector: 'ef-app-shell-mobile',
    standalone: true,
    templateUrl: './ef-app-shell-mobile.component.html',
    styleUrl: './ef-app-shell-mobile.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        TranslateModule,
        TooltipModule,
        EfAppTopComponent,
        EfAppMainComponent,
        EfBottomSheetComponent,
    ],
})
export class EfAppShellMobileComponent {
    private readonly perms = inject(EfPermissionService);
    private readonly active = inject(EfActiveModuleService);
    private readonly router = inject(Router);

    readonly activeId = this.active.activeModuleId;
    readonly switcherOpen = signal(false);

    readonly tabs = computed<EfModule[]>(() => this.perms.visibleModules().slice(0, 5));
    readonly allVisible = this.perms.visibleModules;

    openSwitcher(): void { this.switcherOpen.set(true); }
    onSwitcherChange(open: boolean): void { this.switcherOpen.set(open); }

    onSelect(module: EfModule): void {
        this.router.navigateByUrl(module.defaultRoute);
        this.switcherOpen.set(false);
    }
}
