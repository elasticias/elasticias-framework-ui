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
 * Rail row — either a module button (with the metadata needed by the
 * template) or a divider rendered between two modules whose `group`
 * differs.
 */
type RailRow =
    | { kind: 'module'; module: EfModule }
    | { kind: 'divider' };

/**
 * 64px vertical module switcher rendered at the left of `ef-app-shell`
 * on desktop and tablet. Black (`--ink-active`) background with
 * white-alpha icons, 44×44px buttons, and a 3px module-color accent
 * strip on the inside edge of the active button.
 *
 * Reads from `EfPermissionService.visibleModules()` and
 * `EfActiveModuleService.activeModule()`. No per-app wiring needed.
 *
 * Apps can supply per-module badge content (e.g., notification counts)
 * via the `[badges]` input keyed by module id, and project a logo into
 * the `[logo]` content slot — typical content is the tenant initial,
 * an avatar, or a small SVG. When a logo is projected, a hairline
 * divider is rendered between the logo and the first module group.
 *
 * Dividers also appear automatically between consecutive modules whose
 * `EfModule.group` differs (e.g. Sales/operations followed by
 * Admin/admin).
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

    /** Visible modules interleaved with dividers at group boundaries. */
    readonly rows = computed<RailRow[]>(() => {
        const rows: RailRow[] = [];
        let prevGroup: string | undefined;
        for (const module of this.visibleModules()) {
            if (rows.length > 0 && module.group !== prevGroup) {
                rows.push({ kind: 'divider' });
            }
            rows.push({ kind: 'module', module });
            prevGroup = module.group;
        }
        return rows;
    });

    readonly hasBadges = computed(() => Object.keys(this.badges).length > 0);

    onSelect(module: EfModule): void {
        this.router.navigateByUrl(module.defaultRoute);
    }

    badgeFor(id: EfModuleId): string | number | undefined {
        return this.badges[id];
    }

    trackRow(index: number, row: RailRow): string {
        return row.kind === 'module' ? `m:${row.module.id}` : `d:${index}`;
    }
}
