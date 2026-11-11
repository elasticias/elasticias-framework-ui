import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    computed,
    inject,
    input,
    model,
    signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { EfDialogAction, EfDialogComponent } from '../ef-dialog/ef-dialog.component';
import { EfSkeletonComponent } from '../../feedback/ef-skeleton/ef-skeleton.component';
import { EfEnvironmentBadgeComponent } from '../ef-environment-badge/ef-environment-badge.component';
import {
    EfVersionInfo,
    efEnvironmentCode,
    efEnvironmentNameKey,
    efVersionLine,
} from './ef-version-info';

type CopyState = 'idle' | 'copied' | 'failed';

/** How long "Copié" stays on the button before it reads "Copier" again. */
const COPIED_FEEDBACK_MS = 2000;

/**
 * "Informations de version": which deployment and which build answer, and a
 * Copy button that puts one plain line on the clipboard for a support ticket
 * (`crescilio-erp develop+15d6d6b DEV`).
 *
 * Shown in every environment, production included: a person calling support
 * needs the line most there. The app fetches the data from its own backend
 * and passes it in; while it is on its way pass `loading`, and when it failed
 * pass neither, and the dialog says the information is unavailable.
 *
 * ```html
 * <ef-version-dialog [(visible)]="versionOpen" [info]="version()" [loading]="versionLoading()" />
 * ```
 */
@Component({
    selector: 'ef-version-dialog',
    standalone: true,
    templateUrl: './ef-version-dialog.component.html',
    styleUrl: './ef-version-dialog.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TranslateModule, DatePipe, EfDialogComponent, EfSkeletonComponent, EfEnvironmentBadgeComponent],
})
export class EfVersionDialogComponent {
    /** Two-way open state. */
    readonly visible = model(false);

    /** What the backend served, or null when it has not (yet). */
    readonly info = input<EfVersionInfo | null | undefined>(null);

    /** True while the app is still asking: the body shows a skeleton. */
    readonly loading = input(false);

    private readonly destroyRef = inject(DestroyRef);
    private resetTimer: ReturnType<typeof setTimeout> | undefined;

    protected readonly copyState = signal<CopyState>('idle');

    protected readonly code = computed(() => efEnvironmentCode(this.info()?.environment));
    protected readonly nameKey = computed(() => efEnvironmentNameKey(this.code()));
    protected readonly line = computed(() => {
        const info = this.info();
        return info ? efVersionLine(info) : '';
    });

    protected readonly rows = computed(() => {
        const info = this.info();
        if (!info) return [];
        return [
            { labelKey: 'version_application', value: info.application },
            { labelKey: 'version_version', value: info.version },
            { labelKey: 'version_commit', value: info.commit },
        ];
    });

    protected readonly actions = computed<EfDialogAction[]>(() => {
        const copied = this.copyState() === 'copied';
        return [
            {
                labelKey: copied ? 'version_copied' : 'version_copy',
                icon: copied ? 'pi pi-check' : 'pi pi-copy',
                severity: 'primary',
                dismiss: false,
                disabled: !this.info(),
                command: () => this.copy(),
            },
            { labelKey: 'common_close', severity: 'ghost' },
        ];
    });

    constructor() {
        this.destroyRef.onDestroy(() => clearTimeout(this.resetTimer));
    }

    /**
     * Copies the support line. Where the clipboard is unavailable (an insecure
     * origin, a refused permission) the dialog says so, and the line itself is
     * selectable with one tap as the fallback.
     */
    protected async copy(): Promise<void> {
        const text = this.line();
        if (!text) return;
        try {
            if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
            await navigator.clipboard.writeText(text);
            this.copyState.set('copied');
        } catch {
            this.copyState.set('failed');
        }
        clearTimeout(this.resetTimer);
        this.resetTimer = setTimeout(() => this.copyState.set('idle'), COPIED_FEEDBACK_MS);
    }
}
