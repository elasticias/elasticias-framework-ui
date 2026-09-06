import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { EF_BUILD_INFO } from '@elasticias/core';
import { EfTooltipDirective } from '../../overlays/ef-tooltip.directive';

/**
 * Which build is running, for a footer or an about box.
 *
 * Reads `EF_BUILD_INFO` optionally and renders nothing when the app has not
 * provided it, so a consumer that never wired a build stamp shows no empty
 * line. The commit and branch go in the tooltip rather than the label: the
 * date is what a person recognises, the hash is what you paste into an issue.
 *
 * ```html
 * <ef-build-stamp owner="Elasticias" />
 * ```
 */
@Component({
    selector: 'ef-build-stamp',
    standalone: true,
    imports: [EfTooltipDirective],
    template: `
        @if (info) {
            <span class="ef-build-stamp" [efTooltip]="detail()" efTooltipPosition="bottom">
                @if (owner()) {
                    <span class="ef-build-stamp__owner">© {{ year }} {{ owner() }}</span>
                    <span class="ef-build-stamp__sep" aria-hidden="true">·</span>
                }
                <span class="ef-build-stamp__build">build {{ info.date }}</span>
            </span>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfBuildStampComponent {
    /** Copyright holder shown before the build. Omit for the build alone. */
    readonly owner = input<string>('');

    protected readonly info = inject(EF_BUILD_INFO, { optional: true });

    protected readonly year = new Date().getFullYear();

    protected readonly detail = computed(() =>
        this.info ? `${this.info.commit} · ${this.info.branch} · v${this.info.version}` : '',
    );
}
