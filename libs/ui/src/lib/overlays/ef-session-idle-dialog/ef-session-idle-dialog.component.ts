import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { EF_SESSION, EfSessionIdleService } from '@elasticias/core';
import { EfDialogAction, EfDialogComponent } from '../../layout/ef-dialog/ef-dialog.component';

/**
 * The last minute before an idle sign-out. Host it once at the app root; it
 * opens only while `EfSessionIdleService` counts down, which only happens
 * for a session the app started.
 *
 * Closing it any way other than "sign out" (the close button, Escape) counts
 * as "still here": whoever closed it is at the screen. "Stay" takes focus on
 * open, so Enter from someone just back at the keyboard keeps the session.
 *
 * Sign-out goes through `EF_SESSION`, like `ef-app-top`'s. Without it the
 * button is not offered, and the countdown still ends the session through
 * the app's idle callback.
 *
 * Translation keys the app provides: `session_idle_warning_title`,
 * `session_idle_warning_body` (with `{{seconds}}`), `session_idle_stay`,
 * `common_logout`.
 */
@Component({
    selector: 'ef-session-idle-dialog',
    standalone: true,
    imports: [EfDialogComponent, TranslateModule],
    template: `
        <ef-dialog
            [visible]="secondsLeft() !== null"
            (visibleChange)="!$event && idle.stayActive()"
            headerKey="session_idle_warning_title"
            severity="warn"
            icon="pi pi-clock"
            size="sm"
            [actions]="actions"
        >
            <p class="ef-session-idle__body" aria-live="polite">
                {{ 'session_idle_warning_body' | translate: { seconds: secondsLeft() } }}
            </p>
        </ef-dialog>
    `,
    styles: `
        .ef-session-idle__body {
            margin: 0;
            font-variant-numeric: tabular-nums;
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfSessionIdleDialogComponent {
    protected readonly idle = inject(EfSessionIdleService);
    private readonly session = inject(EF_SESSION, { optional: true });

    protected readonly secondsLeft = this.idle.secondsLeft;

    protected readonly actions: EfDialogAction[] = [
        ...(this.session
            ? [
                  {
                      labelKey: 'common_logout',
                      severity: 'ghost',
                      // stop() closes the dialog and the countdown with it, so
                      // the idle sign-out cannot fire on top of this one. Not
                      // dismiss: that would read as "stay".
                      dismiss: false,
                      command: () => {
                          this.idle.stop();
                          this.session?.logout();
                      },
                  } satisfies EfDialogAction,
              ]
            : []),
        {
            labelKey: 'session_idle_stay',
            severity: 'tenant',
            autofocus: true,
            command: () => this.idle.stayActive(),
        },
    ];
}
