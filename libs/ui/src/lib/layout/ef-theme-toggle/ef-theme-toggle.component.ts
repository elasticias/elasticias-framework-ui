import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { EfThemeConfigService } from '@elasticias/core';

/**
 * Light / dark switch.
 *
 * All of the machinery already exists in `EfThemeConfigService`: it holds
 * `darkTheme` in the persisted app state, puts `.p-dark` on `<html>`, and
 * runs the swap through a view transition where the browser supports one.
 * This is the control that was missing, so the preference had no way to be
 * expressed.
 *
 * The icon shows the theme you would move to, not the one you are in, which
 * is what makes a single-button toggle readable: a moon means "go dark".
 *
 * ```html
 * <ef-theme-toggle />
 * ```
 */
@Component({
    selector: 'ef-theme-toggle',
    standalone: true,
    imports: [TranslateModule],
    template: `
        <button
            type="button"
            class="ef-theme-toggle"
            [class.is-dark]="isDark()"
            [attr.aria-label]="labelKey() | translate"
            [attr.title]="labelKey() | translate"
            [attr.aria-pressed]="isDark()"
            (click)="toggle()"
        >
            <i [class]="isDark() ? lightIcon() : darkIcon()" aria-hidden="true"></i>
        </button>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfThemeToggleComponent {
    private readonly themeConfig = inject(EfThemeConfigService);

    /** Icon shown while light is active (i.e. "switch to dark"). */
    readonly darkIcon = input<string>('pi pi-moon');

    /** Icon shown while dark is active (i.e. "switch to light"). */
    readonly lightIcon = input<string>('pi pi-sun');

    /** Translation key for the accessible name. */
    readonly ariaLabelKey = input<string>('');

    readonly isDark = computed(() => !!this.themeConfig.appState()?.darkTheme);

    protected readonly labelKey = computed(
        () =>
            this.ariaLabelKey() ||
            (this.isDark() ? 'common_theme_switch_light' : 'common_theme_switch_dark'),
    );

    toggle(): void {
        this.themeConfig.appState.update(state => ({ ...state, darkTheme: !state.darkTheme }));
    }
}
