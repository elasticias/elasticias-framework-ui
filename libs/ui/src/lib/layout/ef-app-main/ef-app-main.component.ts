import { booleanAttribute, ChangeDetectionStrategy, Component, computed, inject, Input } from '@angular/core';
import { EfActiveModuleService } from '@elasticias/core';

/**
 * Content scroll container. Lives at the right of the rail+side
 * on desktop, full-width on mobile. Sets `data-module` so the
 * Comptoir SCSS layer's `[data-module="..."]` rules apply the
 * active module's `--module` accent inside this region.
 *
 * Usage:
 * ```html
 * <ef-app-main [stripe]="true">
 *   <router-outlet />
 * </ef-app-main>
 * ```
 *
 * Reads the active module from `EfActiveModuleService` — no per-app
 * wiring required.
 */
@Component({
    selector: 'ef-app-main',
    standalone: true,
    templateUrl: './ef-app-main.component.html',
    styleUrl: './ef-app-main.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[attr.data-module]': 'moduleId()',
    },
})
export class EfAppMainComponent {
    private readonly activeModule = inject(EfActiveModuleService);

    /** Render the 3px module-color stripe at the top of the content area. */
    @Input({ transform: booleanAttribute }) stripe = false;

    /** `data-module` value bound to the host. Null when no module is active. */
    readonly moduleId = computed(() => this.activeModule.activeModuleId());
}
