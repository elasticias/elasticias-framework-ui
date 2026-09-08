import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { EfPasswordComponent } from '../ef-password/ef-password.component';
import { EfFormGridComponent } from '../../layout/ef-form-grid/ef-form-grid.component';

/** What the form hands back. `currentPassword` is absent when the host
 *  did not ask for one (an administrator resetting someone else's). */
export interface EfChangePasswordSubmit {
  currentPassword?: string;
  newPassword: string;
}

/**
 * Password form, deliberately without an API client.
 *
 * `@elasticias/ui` cannot import an app's generated HTTP client, and that
 * limitation is what makes one component serve two different endpoints: a
 * user changing their own password proves the old one, an administrator
 * resetting someone else's does not. The host reads `canSubmit()`, calls
 * `submit()` from its dialog footer, and listens to `submitted`.
 *
 * ```html
 * <ef-change-password
 *   #form
 *   [requireCurrent]="!userId()"
 *   [busy]="saving()"
 *   [errors]="serverErrors()"
 *   (submitted)="save($event)"
 * />
 * ```
 *
 * There is no `reset()`: hosts mount it under `@if`, so every open is a
 * fresh instance.
 */
@Component({
  selector: 'ef-change-password',
  standalone: true,
  imports: [CommonModule, TranslateModule, EfPasswordComponent, EfFormGridComponent],
  templateUrl: './ef-change-password.component.html',
  styleUrl: './ef-change-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfChangePasswordComponent {
  /** Ask for the existing password. False for an administrator reset. */
  readonly requireCurrent = input(true, { transform: booleanAttribute });

  /** A request is in flight: the form refuses to submit again. */
  readonly busy = input(false, { transform: booleanAttribute });

  /** Already-translated server messages, rendered under the fields. */
  readonly errors = input<ReadonlyArray<string>>([]);

  /** Minimum length. Kept in step with the backend validator's 8. */
  readonly minLength = input(8);

  readonly submitted = output<EfChangePasswordSubmit>();

  /* The template writes these directly; they are public so a host can
     drive the component in a test without touching the DOM. */
  readonly currentPassword = signal('');
  readonly newPassword = signal('');
  readonly confirmation = signal('');

  /**
   * Translation keys for every rule the current input breaks. Empty while
   * the user has typed nothing, so the form does not scold on open.
   */
  readonly validationKeys = computed<string[]>(() => {
    const next = this.newPassword();
    const confirmation = this.confirmation();
    const keys: string[] = [];

    if (next && next.length < this.minLength()) {
      keys.push('ef_change_password_too_short');
    }
    if (next && !/[A-Z]/.test(next)) {
      keys.push('ef_change_password_uppercase');
    }
    if (next && !/[0-9]/.test(next)) {
      keys.push('ef_change_password_digit');
    }
    if (next && confirmation && next !== confirmation) {
      keys.push('ef_change_password_mismatch');
    }
    return keys;
  });

  readonly canSubmit = computed<boolean>(() => {
    if (this.busy()) return false;
    if (this.requireCurrent() && !this.currentPassword()) return false;
    if (!this.newPassword() || !this.confirmation()) return false;
    return this.validationKeys().length === 0;
  });

  submit(): void {
    if (!this.canSubmit()) return;
    this.submitted.emit({
      currentPassword: this.requireCurrent() ? this.currentPassword() : undefined,
      newPassword: this.newPassword(),
    });
  }
}
