import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { EfLabelComponent } from '../../layout/ef-label/ef-label.component';
import { EfClearButtonComponent } from '../ef-clear-button/ef-clear-button.component';
import { AbstractEfFormControl } from '../abstract-ef-form-control.component';

/**
 * A text field with a square search button attached to its trailing edge,
 * sharing one border (it reuses the global `.ef-input-group`, so height and
 * the 48px touch tier come from `--hit-field`).
 *
 * `search` emits the trimmed value on Enter and on a button click, never when
 * it is empty and never while `loading` or disabled. `value` is the raw text
 * as typed. `dir` describes the typed value (`'ltr'` for a phone number on an
 * Arabic screen) and applies to the native input only; the button keeps the
 * page direction, so it sits on the leading edge in RTL.
 *
 * Enter while an IME is composing (Arabic, CJK) commits the text and is not a
 * search. `clearable` adds the lib's ✕ (`ef-clear-button`) before the button
 * while there is text; it empties the field and searches nothing. The
 * browser's own clear control of `type="search"` is hidden.
 */
@Component({
  selector: 'ef-search-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ef-search-input.component.html',
  styleUrls: ['./ef-search-input.component.scss'],
  imports: [TranslateModule, EfLabelComponent, EfClearButtonComponent],
  // A static dir="ltr" belongs to the typed value, not to the whole host.
  host: { '[attr.dir]': 'null' },
})
export class EfSearchInputComponent extends AbstractEfFormControl {
  readonly buttonLabelKey = input('ef.search.button');
  readonly loading = input(false);
  /** Both render the same group today; `default` only adds an `is-default` hook. */
  readonly variant = input<'default' | 'comptoir'>('comptoir');
  readonly inputMode = input<'text' | 'tel' | 'email'>('text');
  readonly dir = input<'ltr' | 'auto'>('auto');
  /** Shows the ✕ while the field holds text. Off by default. */
  readonly clearable = input(false);

  readonly value = model<string>('');
  // The name is the contract with ef-recipient-dialog.
  // eslint-disable-next-line @angular-eslint/no-output-native
  readonly search = output<string>();

  protected override get hasValue(): boolean {
    return !!this.value();
  }

  /** The ✕ is drawn: asked for, with text, on an editable field. */
  protected get showsClear(): boolean {
    return this.clearable() && this.canClear;
  }

  override clearValue(): void {
    this.value.set('');
  }

  protected onEnter(event: Event): void {
    // An IME's Enter commits the composed text (keyCode 229 in older WebKit).
    const key = event as KeyboardEvent;
    if (key.isComposing || key.keyCode === 229) return;
    this.submit(event);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.loading() || this.isDisabled()) return;
    const term = this.value().trim();
    if (term) this.search.emit(term);
  }
}
