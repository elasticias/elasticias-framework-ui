import { ChangeDetectionStrategy, Component, inject, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { EfShortcutService, formatShortcut, isMacPlatform } from '@elasticias/core';
import { EfDialogComponent, EfDialogAction } from '../../layout/ef-dialog/ef-dialog.component';

/**
 * The keyboard-shortcuts reference: every registration currently sitting
 * in `EfShortcutService`, grouped and rendered with the same `.kbd` chip
 * `ef-row-actions` and `ef-menu` already use, so a chip means one thing
 * everywhere it appears.
 *
 * Reads `EfShortcutService.list()` directly, so it stays live: open it
 * while a row menu is on screen and its row-scoped shortcuts are already
 * listed under "Row actions". Close the row menu and, since a row's
 * shortcuts unregister with it, they're gone from here too.
 *
 * ```html
 * <ef-shortcuts-dialog [(visible)]="shortcutsOpen" />
 * ```
 */
@Component({
    selector: 'ef-shortcuts-dialog',
    standalone: true,
    imports: [CommonModule, TranslateModule, EfDialogComponent],
    templateUrl: './ef-shortcuts-dialog.component.html',
    styleUrl: './ef-shortcuts-dialog.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfShortcutsDialogComponent {
    private readonly shortcutService = inject(EfShortcutService);

    /** Two-way open state. */
    readonly visible = model(false);

    protected readonly groups = this.shortcutService.list;

    /** Only macOS reads `⌘` at a glance. Everyone else needs the line
     *  spelling out that it means Ctrl. */
    protected readonly isMacPlatform = isMacPlatform;

    protected readonly closeAction: EfDialogAction[] = [
        { labelKey: 'common_close', severity: 'ghost' },
    ];

    protected formatKeys(keys: string): string {
        return formatShortcut(keys);
    }
}
