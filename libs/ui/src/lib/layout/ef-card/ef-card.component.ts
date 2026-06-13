import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Comptoir card primitive — `.card` shell with optional `.card-head`,
 * `.card-body`, `.card-foot`. Phase 7's most reused container.
 *
 * Three projection slots:
 *   `head-extra`  — projected on the right of the head row, after the
 *                   built-in title/meta. Use for a status chip,
 *                   action button, kbd hint, etc.
 *   default       — body content (always rendered).
 *   `foot`        — bottom strip with rule-soft separator + paper bg.
 *
 * ```html
 * <ef-card titleKey="orders_status" [tone]="'module'">
 *   <ng-container head-extra>
 *     <ef-status-chip referenceKey="sales_order_status" [code]="status" />
 *   </ng-container>
 *   <div>… body content …</div>
 *   <div foot>
 *     <span class="small text-mute">Modifié il y a 2 min</span>
 *   </div>
 * </ef-card>
 * ```
 */
@Component({
    selector: 'ef-card',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    template: `
        @if (showHead()) {
            <div
                class="card-head"
                [class.tone-module]="tone() === 'module'"
                [class.is-collapsible]="collapsible()"
                (click)="onHeadClick()"
            >
                <div>
                    @if (titleKey() || title()) {
                        <div class="title">
                            {{ titleKey() ? (titleKey() | translate) : title() }}
                        </div>
                    }
                    @if (metaKey() || meta()) {
                        <div class="meta">
                            {{ metaKey() ? (metaKey() | translate) : meta() }}
                        </div>
                    }
                </div>
                <div class="card-head-actions" (click)="$event.stopPropagation()">
                    <ng-content select="[head-extra]"></ng-content>
                    @if (collapsible()) {
                        <button
                            type="button"
                            class="card-collapse-btn"
                            (click)="toggle()"
                            [attr.aria-expanded]="!collapsed()"
                        >
                            <i
                                class="pi"
                                [class.pi-chevron-down]="collapsed()"
                                [class.pi-chevron-up]="!collapsed()"
                                aria-hidden="true"
                            ></i>
                        </button>
                    }
                </div>
            </div>
        }

        @if (!collapsed()) {
            <div class="card-body">
                <ng-content></ng-content>
            </div>
        }

        @if (showFoot() && !collapsed()) {
            <div class="card-foot">
                <ng-content select="[foot]"></ng-content>
            </div>
        }
    `,
    styleUrl: './ef-card.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfCardComponent {
    /** Translation key for the head title — preferred. */
    readonly titleKey = input<string>('');
    /** Direct title fallback when `titleKey` is empty. */
    readonly title = input<string>('');

    /** Translation key for the head's small meta line. */
    readonly metaKey = input<string>('');
    readonly meta = input<string>('');

    /** Module-tinted head — uses `var(--module)` for the head bg. */
    readonly tone = input<'default' | 'module'>('default');

    /** Force the head to render even when no title/meta (e.g. when
     *  using only the head-extra slot). Defaults to auto-detect. */
    readonly forceHead = input(false, { transform: booleanAttribute });

    /** Render the foot strip — set when projecting `[foot]` content. */
    readonly hasFoot = input(false, { transform: booleanAttribute });

    /** When true, the head shows a chevron toggle and the body/foot collapse. */
    readonly collapsible = input(false, { transform: booleanAttribute });

    /** Collapsed state (two-way). Bind `[collapsed]="true"` to start collapsed. */
    readonly collapsed = model(false);

    readonly showHead = computed(
        () =>
            this.forceHead() ||
            this.collapsible() ||
            !!this.titleKey() ||
            !!this.title() ||
            !!this.metaKey() ||
            !!this.meta(),
    );

    readonly showFoot = computed(() => this.hasFoot());

    /** Toggle collapsed state (no-op when not collapsible). */
    toggle(): void {
        if (this.collapsible()) this.collapsed.set(!this.collapsed());
    }

    /** Clicking anywhere on a collapsible head (except the actions area, which
     *  stops propagation) toggles the card. */
    onHeadClick(): void {
        this.toggle();
    }
}
