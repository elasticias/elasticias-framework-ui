import { ChangeDetectionStrategy, Component, computed, inject, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { EfShortcutGroup, EfShortcutService, formatShortcut, isMacPlatform } from '@elasticias/core';
import { EfDialogComponent, EfDialogAction } from '../../layout/ef-dialog/ef-dialog.component';

/**
 * The three tiers a shortcut can belong to, outer to inner: a Global
 * shortcut works anywhere in the app, a Screen shortcut works anywhere on
 * the current screen, a Row shortcut only while a row's menu is open.
 * `list()` returns groups in registration order, which is really "whatever
 * happened to construct first." This fixes the section order so it
 * always reads outer to inner regardless of what rendered when.
 */
const GROUP_ORDER: readonly string[] = [
    'shortcut_group_general',
    'shortcut_group_screen',
    'shortcut_group_row_actions',
];

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

    /** `list()`, reordered Global → Screen → Row. An unrecognised group
     *  (a future tier this component doesn't know about yet) sorts last
     *  rather than being dropped. */
    protected readonly groups = computed<EfShortcutGroup[]>(() => {
        const rank = (group: string): number => {
            const index = GROUP_ORDER.indexOf(group);
            return index === -1 ? GROUP_ORDER.length : index;
        };
        return [...this.shortcutService.list()].sort((a, b) => rank(a.group) - rank(b.group));
    });

    /** Only macOS shows every chip already resolved to its own glyphs.
     *  Everyone else gets a line saying the chips already match their
     *  system, since nothing here prints a Mac glyph for them to decode. */
    protected readonly isMacPlatform = isMacPlatform;

    protected readonly closeAction: EfDialogAction[] = [
        { labelKey: 'common_close', severity: 'ghost' },
    ];

    protected formatKeys(keys: string): string {
        return formatShortcut(keys);
    }
}
