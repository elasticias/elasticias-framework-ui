import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { EfActiveModuleService } from '@elasticias/core';

/**
 * Top chrome bar for the desktop and mobile shells.
 *
 * Layout is three slots: `breadcrumb` (left), `search` (centre), and
 * `actions` (right). Apps project content into each slot. When no
 * breadcrumb is projected, the active module's `labelKey` renders as
 * a fallback.
 *
 * Usage:
 * ```html
 * <ef-app-top>
 *   <ef-breadcrumb breadcrumb [...]/>
 *   <ef-global-search search />
 *   <ef-notifications-bell actions />
 *   <ef-tenant-avatar actions />
 * </ef-app-top>
 * ```
 *
 * The component itself stays content-light — it owns layout, height
 * (`--hit-base` × 1.4), divider, and the active-module fallback only.
 */
@Component({
    selector: 'ef-app-top',
    standalone: true,
    templateUrl: './ef-app-top.component.html',
    styleUrl: './ef-app-top.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, TranslateModule],
})
export class EfAppTopComponent {
    private readonly active = inject(EfActiveModuleService);

    readonly fallbackLabelKey = computed(() => this.active.activeModule()?.labelKey ?? null);
}
