import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

/**
 * The app-wide confirmation modal, wearing the same skin as `ef-dialog`.
 *
 * PrimeNG's `<p-confirmdialog>` renders an ordinary `<p-dialog>` inside
 * itself and forwards `styleClass` to its root, so handing it the
 * `es-dialog` classes makes every rule that dresses `ef-dialog` — the
 * paper-alt panel, the rule-separated header and footer, the Bricolage
 * title, the ghost close — apply here too. Only the confirm-specific
 * internals (the icon tile, the message, the two action buttons) need
 * their own rules, and those live beside the rest in `_patterns.scss`.
 *
 * Drop one instance at the application root; the content is driven by
 * `ConfirmDialogService.confirm()`, not by inputs.
 *
 * ```html
 * <ef-confirm-dialog />
 * ```
 */
@Component({
    selector: 'ef-confirm-dialog',
    standalone: true,
    imports: [ConfirmDialogModule],
    template: `<p-confirmdialog [styleClass]="effectiveStyleClass()" />`,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfConfirmDialogComponent {
    /** Panel width preset, mirroring `ef-dialog`'s `size`. */
    readonly size = input<'sm' | 'md' | 'lg'>('sm');

    /** Extra classes appended to the panel. */
    readonly styleClass = input<string>('');

    protected readonly effectiveStyleClass = () =>
        ['es-dialog', `es-dialog--${this.size()}`, 'es-confirm', this.styleClass()]
            .filter(Boolean)
            .join(' ');
}
