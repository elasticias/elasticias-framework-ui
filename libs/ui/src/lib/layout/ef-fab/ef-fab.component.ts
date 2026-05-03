import {
    booleanAttribute,
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

export type EfFabPosition = 'bottom-right' | 'bottom-center' | 'bottom-left';

/**
 * Floating action button — mobile primary action surface.
 *
 * Lives at the bottom of the mobile viewport, carrying the screen's
 * principal action (e.g. Nouvelle commande). Reads `--tenant-500`
 * for its background; foreground is `--tenant-contrast` (defaults
 * to white). When `label` / `labelKey` is provided, renders as an
 * extended FAB with the label inline.
 *
 * Usage:
 * ```html
 * <ef-fab icon="pi pi-plus" labelKey="orders.new" (press)="onNew()" />
 * ```
 */
@Component({
    selector: 'ef-fab',
    standalone: true,
    templateUrl: './ef-fab.component.html',
    styleUrl: './ef-fab.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, TranslateModule],
    host: {
        '[attr.data-position]': 'position',
        '[class.is-extended]': 'isExtended',
    },
})
export class EfFabComponent {
    @Input() icon = 'pi pi-plus';
    @Input() label?: string;
    /** Translation key — takes priority over `label`. */
    @Input() labelKey?: string;

    @Input() position: EfFabPosition = 'bottom-right';

    @Input({ transform: booleanAttribute }) disabled = false;

    @Output() press = new EventEmitter<MouseEvent>();

    get isExtended(): boolean {
        return !!(this.label || this.labelKey);
    }

    onClick(e: MouseEvent): void {
        if (!this.disabled) this.press.emit(e);
    }
}
