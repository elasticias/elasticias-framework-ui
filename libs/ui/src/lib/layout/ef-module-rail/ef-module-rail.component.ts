import { ChangeDetectionStrategy, Component, computed, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import {
    EfActiveModuleService,
    EfModule,
    EfModuleId,
    EfPermissionService,
} from '@elasticias/core';

/**
 * 64px vertical module switcher rendered at the left of `ef-app-shell`
 * on desktop and tablet. Shows one icon per module the user can read,
 * highlights the active module with its `--m-{id}` accent, and
 * navigates to `module.defaultRoute` on click.
 *
 * Reads from `EfPermissionService.visibleModules()` and
 * `EfActiveModuleService.activeModule()`. No per-app wiring needed.
 *
 * Apps can supply per-module badge content (e.g., notification counts)
 * via the `[badges]` input keyed by module id.
 */
@Component({
    selector: 'ef-module-rail',
    standalone: true,
    templateUrl: './ef-module-rail.component.html',
    styleUrl: './ef-module-rail.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, TooltipModule, TranslateModule],
})
export class EfModuleRailComponent {
    private readonly perms = inject(EfPermissionService);
    private readonly active = inject(EfActiveModuleService);
    private readonly router = inject(Router);

    /** Optional notification badges per module id. */
    @Input() badges: Partial<Record<EfModuleId, string | number>> = {};

    readonly visibleModules = this.perms.visibleModules;
    readonly activeId = this.active.activeModuleId;

    readonly hasBadges = computed(() => {
        const b = this.badges;
        return Object.keys(b).length > 0;
    });

    onSelect(module: EfModule): void {
        this.router.navigateByUrl(module.defaultRoute);
    }

    badgeFor(id: EfModuleId): string | number | undefined {
        return this.badges[id];
    }
}
