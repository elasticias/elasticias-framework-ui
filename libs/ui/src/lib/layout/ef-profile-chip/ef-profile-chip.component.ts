import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output,
    booleanAttribute,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Compact identity chip — avatar + name + role — designed to sit at the
 * bottom of `ef-module-side` (project via the `side-footer` slot of
 * `ef-app-shell`). On mobile, apps usually surface the same identity in
 * the top bar `[actions]` slot instead.
 *
 * ```html
 * <ef-app-shell>
 *   <ef-profile-chip
 *     side-footer
 *     [name]="user.name"
 *     [role]="user.roleLabel"
 *     (clickEvent)="openUserMenu()"
 *   />
 *   <router-outlet />
 * </ef-app-shell>
 * ```
 *
 * The component is intentionally dumb: apps wire their own identity
 * source. Initials are derived from `name` unless explicitly overridden.
 */
@Component({
    selector: 'ef-profile-chip',
    standalone: true,
    templateUrl: './ef-profile-chip.component.html',
    styleUrl: './ef-profile-chip.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, TranslateModule],
})
export class EfProfileChipComponent {
    /** Direct name text (not translated). */
    @Input() name?: string;

    /** Direct role text (not translated). */
    @Input() role?: string;

    /** Translation key for the role line — takes priority over `role`. */
    @Input() roleKey?: string;

    /** Override the avatar glyph. Defaults to the first letter of `name`. */
    @Input() initial?: string;

    /** Tenant tone uses `--tenant-500`; neutral uses `--ink-active`. */
    @Input() tone: 'tenant' | 'neutral' = 'tenant';

    /** Render as a non-interactive container (no hover/focus, no click). */
    @Input({ transform: booleanAttribute }) readonly = false;

    @Output() readonly clickEvent = new EventEmitter<Event>();

    get computedInitial(): string {
        const source = (this.initial ?? this.name ?? '').trim();
        return source ? source.charAt(0).toUpperCase() : '?';
    }

    handleClick(event: Event): void {
        if (!this.readonly) {
            this.clickEvent.emit(event);
        }
    }
}
