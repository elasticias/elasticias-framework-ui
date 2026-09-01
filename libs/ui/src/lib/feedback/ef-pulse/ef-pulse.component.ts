import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Live-indicator dot with a soft breath animation.
 *
 * Used for "Live", presence indicators, anything that says "this is
 * happening right now." Defaults to the Comptoir `--st-delivered-fg`
 * green; pass `[severity]="'warn' | 'danger' | 'mute'"` for amber, red,
 * or grey variants.
 *
 * ```html
 * <ef-pulse labelKey="status.live" />
 * <ef-pulse label="Offline" severity="mute" />
 * ```
 */
@Component({
    selector: 'ef-pulse',
    standalone: true,
    templateUrl: './ef-pulse.component.html',
    styleUrl: './ef-pulse.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, TranslateModule],
})
export class EfPulseComponent {
    /** Direct label text (no translation). */
    @Input() label?: string;
    /** Translation key — takes priority over label. */
    @Input() labelKey?: string;
    /** Visual tone of the dot. */
    @Input() severity: 'success' | 'warn' | 'danger' | 'mute' = 'success';
    /** Set false to freeze the breath animation. */
    @Input() active = true;
}
