import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { PopoverModule } from 'primeng/popover';
import { EfProfileChipComponent } from '../ef-profile-chip/ef-profile-chip.component';
import { EfProfileMenuItem } from './ef-profile-menu.types';

/** The slice of PrimeNG's Popover this component actually calls. Typing it
 *  structurally keeps the template ref usable and the tests free of PrimeNG. */
interface Dismissible {
  hide: () => void;
  /** PrimeNG positions a popover once, when it opens. Expanding a group
   *  changes the panel's height afterwards, so the host has to ask for a
   *  reposition or the panel grows past the edge it was anchored to. */
  align?: () => void;
}

/**
 * The signed-in user's menu.
 *
 * Two renderings of one `items` array. `variant="chip"` (the default) shows
 * an `ef-profile-chip` that opens a popover, for the side footer on a
 * desktop. `variant="list"` renders the same rows flat, with no popover,
 * for the mobile sheet: `ef-app-shell` does not render the side footer on a
 * phone, and this menu is the only way to sign out, so it cannot live only
 * there.
 *
 * ```html
 * <ef-profile-menu
 *   side-footer
 *   [name]="userName()"
 *   [secondary]="userEmail()"
 *   [initial]="userInitial()"
 *   [items]="menuItems()"
 * />
 * ```
 */
@Component({
  selector: 'ef-profile-menu',
  standalone: true,
  imports: [CommonModule, TranslateModule, PopoverModule, EfProfileChipComponent],
  templateUrl: './ef-profile-menu.component.html',
  styleUrl: './ef-profile-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfProfileMenuComponent {
  /** Display name, shown on the chip and in the panel header. */
  readonly name = input<string>('');

  /** Second header line. The email, usually. */
  readonly secondary = input<string>('');

  /** Chip subtitle. Falls back to `secondary` when empty. */
  readonly role = input<string>('');

  /** Avatar glyph. Up to two characters; falls back to the first of `name`. */
  readonly initial = input<string>('');

  readonly tone = input<'tenant' | 'neutral'>('tenant');

  readonly items = input<ReadonlyArray<EfProfileMenuItem>>([]);

  readonly variant = input<'chip' | 'list'>('chip');

  readonly itemSelected = output<EfProfileMenuItem>();

  /** Id of the one expanded group, or null. One at a time: a menu that
   *  grows in two directions at once stops being scannable. */
  private readonly expandedId = signal<string | null>(null);

  readonly chipRole = computed(() => this.role() || this.secondary());

  isExpanded(id: string): boolean {
    return this.expandedId() === id;
  }

  /**
   * Choose a row. A row with children toggles its group and leaves the
   * popover open; a leaf runs its command, reports it, and dismisses.
   */
  select(item: EfProfileMenuItem, popover?: Dismissible): void {
    if (item.children?.length) {
      this.expandedId.update((current) => (current === item.id ? null : item.id));
      // Reposition once the taller panel has actually rendered. Without this
      // the panel keeps the top it was placed at and grows downward, which
      // runs it off the bottom of the screen when the trigger sits in the
      // side footer. Realigning lets it grow upward from the trigger instead.
      setTimeout(() => popover?.align?.(), 0);
      return;
    }
    item.command?.();
    this.itemSelected.emit(item);
    popover?.hide();
  }
}
