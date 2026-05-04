import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { EfActiveModuleService } from '@elasticias/core';

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
    imports: [CommonModule, TranslateModule],
})
export class EfAppTopComponent {
    private readonly active = inject(EfActiveModuleService);

    readonly module = this.active.activeModule;
    readonly navItem = this.active.activeNavItem;

    readonly hasBreadcrumb = computed(() => this.module() != null);
}
