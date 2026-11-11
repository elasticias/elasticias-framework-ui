import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { EfTooltipDirective } from '../../overlays/ef-tooltip.directive';
import {
    efEnvironmentCode,
    efEnvironmentIsFlagged,
    efEnvironmentNameKey,
} from '../ef-version-dialog/ef-version-info';

/**
 * Which deployment this is, at a glance: a short `DEV` or `STAGING` pill for
 * the top bar, so nobody files a bug against the wrong tier or tests on a copy
 * of production data believing it is a sandbox.
 *
 * Renders nothing in production, nothing for an unknown or missing
 * environment, and nothing while the app is still asking. The app passes the
 * code its backend served; the library never fetches it.
 *
 * The visible text is the code, in Latin letters in every language, because
 * it is what `/version` and the copied support line say. Screen readers get
 * the full translated name instead (`env_badge_label`, "Environnement :
 * Préproduction"). STAGING is the louder of the two (filled, not tinted): it
 * runs on a restored copy of production's data, which is the case where
 * mistaking the tier costs most.
 *
 * ```html
 * <ef-environment-badge [environment]="version()?.environment" />
 * ```
 */
@Component({
    selector: 'ef-environment-badge',
    standalone: true,
    imports: [TranslateModule, EfTooltipDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrl: './ef-environment-badge.component.scss',
    template: `
        @if (flagged()) {
            @let name = nameKey() | translate;
            <span
                class="ef-env-badge"
                [attr.data-env]="code()"
                [efTooltip]="'env_badge_label' | translate: { name }"
                efTooltipPosition="bottom"
            >
                <span class="ef-env-badge__code" aria-hidden="true" dir="ltr">{{ code() }}</span>
                <span class="ef-env-badge__name">{{ 'env_badge_label' | translate: { name } }}</span>
            </span>
        }
    `,
})
export class EfEnvironmentBadgeComponent {
    /** The environment as served (`DEV`, `STAGING`, `PROD`, `unknown`), any case. */
    readonly environment = input<string | null | undefined>(undefined);

    protected readonly code = computed(() => efEnvironmentCode(this.environment()));
    protected readonly flagged = computed(() => efEnvironmentIsFlagged(this.code()));
    protected readonly nameKey = computed(() => efEnvironmentNameKey(this.code()));
}
