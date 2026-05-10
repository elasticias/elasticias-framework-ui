import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Sticky detail-screen toolbar. Two slots:
 *
 * - default — the entity identity (ref / name / status chip / meta).
 * - `actions` — the right-aligned contextual actions row.
 *
 * Anchors below the 48px top-bar (`top: 48px` baked into
 * `_patterns.scss`).
 *
 * ```html
 * <ef-detail-toolbar>
 *   <span class="ref">SO-2026-198</span>
 *   <span class="sep">·</span>
 *   <ef-status-chip referenceKey="sales_order_status" code="processing" />
 *   <span class="small text-mute">Mis à jour il y a 2 min</span>
 *
 *   <ng-container actions>
 *     <ef-button labelKey="common_export" severity="ghost" size="small" />
 *     <ef-button labelKey="common_save" severity="primary" size="small" />
 *   </ng-container>
 * </ef-detail-toolbar>
 * ```
 */
@Component({
    selector: 'ef-detail-toolbar',
    standalone: true,
    template: `
        <div class="left">
            <ng-content></ng-content>
        </div>
        <div class="right">
            <ng-content select="[actions]"></ng-content>
        </div>
    `,
    host: { class: 'detail-toolbar' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfDetailToolbarComponent {}
