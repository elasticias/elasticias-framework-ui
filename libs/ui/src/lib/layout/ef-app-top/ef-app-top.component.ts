import { booleanAttribute, ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { EfActiveModuleService } from '@elasticias/core';
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
    imports: [CommonModule, TranslateModule, EfThemeToggleComponent],
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

    private readonly active = inject(EfActiveModuleService);

    readonly module = this.active.activeModule;
    readonly navItem = this.active.activeNavItem;

    readonly hasBreadcrumb = computed(() => this.module() != null);
}
