import { ChangeDetectionStrategy, Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { EfActiveModuleService } from '@elasticias/core';

/**
 * Per-screen page header. Renders the breadcrumb (active module · screen
 * title), a display-sized page title, an optional subtitle line, and
 * an actions slot on the right.
 *
 * Apps mount it at the top of every list/detail screen, just inside
 * the `ef-app-shell`'s main content region:
 *
 * ```html
 * <ef-page-head titleKey="SalesOrders">
 *   <span subtitle>{{ 'sales.subtitle' | translate: { count } }}</span>
 *   <button actions class="action-btn">...</button>
 * </ef-page-head>
 * ```
 *
 * The breadcrumb root is auto-derived from
 * `EfActiveModuleService.activeModule()`. Pass `[breadcrumb]="false"`
 * to suppress.
 */
@Component({
    selector: 'ef-page-head',
    standalone: true,
    templateUrl: './ef-page-head.component.html',
    styleUrl: './ef-page-head.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, TranslateModule],
})
export class EfPageHeadComponent {
    private readonly active = inject(EfActiveModuleService);

    /** i18n key for the page title and the trailing breadcrumb segment. */
    @Input() titleKey?: string;

    /** Hide the breadcrumb row (e.g. for landing pages). */
    @Input() breadcrumb = true;

    readonly module = this.active.activeModule;
}
