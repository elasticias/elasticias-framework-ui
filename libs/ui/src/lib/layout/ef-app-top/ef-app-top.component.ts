import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Top chrome bar for the desktop and mobile shells.
 *
 * Layout is three slots: `breadcrumb` (left), `search` (centre), and
 * `actions` (right). Apps project content into each slot.
 *
 * Usage:
 * ```html
 * <ef-app-top>
 *   <ef-breadcrumb breadcrumb [...]/>
 *   <ef-global-search search />
 *   <ef-notifications-bell actions />
 *   <ef-tenant-avatar actions />
 * </ef-app-top>
 * ```
 *
 * The component itself stays content-light — it owns layout, height
 * (`--hit-base` × 1.4), and the divider only. Per-screen breadcrumb
 * lives in `ef-page-head` below the top bar.
 */
@Component({
    selector: 'ef-app-top',
    standalone: true,
    templateUrl: './ef-app-top.component.html',
    styleUrl: './ef-app-top.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule],
})
export class EfAppTopComponent {}
