import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {
    EfActiveModuleService,
    EfNavItem,
    EfNavSection,
    EfPermissionService,
} from '@elasticias/core';

/**
 * 240px module-specific side panel. Renders the active module's
 * `navSections`, filtered by `EfPermissionService.can()` against
 * each item's `requiredAction` (defaults to `'read'`).
 *
 * When no module is active, or the active module has no sections,
 * the panel collapses (renders nothing) — apps using `ef-app-shell`
 * already handle the layout reflow.
 */
@Component({
    selector: 'ef-module-side',
    standalone: true,
    templateUrl: './ef-module-side.component.html',
    styleUrl: './ef-module-side.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, RouterLink, RouterLinkActive, TranslateModule],
    host: {
        '[attr.data-module]': 'moduleId()',
    },
})
export class EfModuleSideComponent {
    private readonly active = inject(EfActiveModuleService);
    private readonly perms = inject(EfPermissionService);

    readonly module = this.active.activeModule;
    readonly moduleId = this.active.activeModuleId;

    readonly visibleSections = computed<EfNavSection[]>(() => {
        const m = this.module();
        if (!m) return [];

        return m.navSections
            .map(section => ({
                ...section,
                items: section.items.filter(item =>
                    this.perms.can(m.id, item.requiredAction ?? 'read')
                ),
            }))
            .filter(section => section.items.length > 0);
    });

    trackSection(_: number, s: EfNavSection): string {
        return s.id;
    }

    trackItem(_: number, i: EfNavItem): string {
        return i.id;
    }
}
