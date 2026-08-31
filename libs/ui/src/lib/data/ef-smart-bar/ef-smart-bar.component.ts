import {
    ChangeDetectionStrategy,
    Component,
    booleanAttribute,
    input,
    model,
    output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Comptoir smart bar — the search/filter card every list screen
 * starts with. Composes:
 *   1. Search input (with `⌘K` kbd hint) + Effacer / Rechercher
 *      action buttons.
 *   2. A filter-row slot for `[filters]` (pill-group + filter-pill +
 *      preset-pill + "+ Plus de filtres").
 *   3. A drawer slot for `[drawer]` (advanced filters via
 *      `ef-filter-drawer`).
 *
 * The `searchText` is a `model()` so consumers can `[(searchText)]`
 * for two-way binding, or watch the (search) output for explicit
 * Rechercher clicks.
 *
 * ```html
 * <ef-smart-bar
 *   [(searchText)]="searchQuery"
 *   placeholderKey="sales_orders_search_placeholder"
 *   (search)="setSearchText($event)"
 *   (clear)="clearAll()"
 * >
 *   <ng-container filters>
 *     <ef-pill-group …/>
 *     <ef-filter-pill …/>
 *     <ef-preset-pill …/>
 *   </ng-container>
 *   <ng-container drawer>
 *     <ef-filter-drawer …/>
 *   </ng-container>
 * </ef-smart-bar>
 * ```
 */
@Component({
    selector: 'ef-smart-bar',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule],
    template: `
        <div class="screen-search">
            <div class="smart-bar">
                <label class="search">
                    <input
                        type="text"
                        [placeholder]="(placeholderKey() ? (placeholderKey() | translate) : placeholder())"
                        [ngModel]="searchText()"
                        (ngModelChange)="searchText.set($event)"
                        (keydown.enter)="onSubmit()"
                    />
                    @if (showKbdHint()) {
                        <span class="kbd">⌘K</span>
                    }
                </label>
                <div class="actions">
                    @if (!hideClear()) {
                        <button
                            class="btn btn-ghost btn-sm"
                            type="button"
                            [attr.title]="clearTitleKey() | translate"
                            (click)="onClear()"
                        >
                            {{ clearLabelKey() | translate }}
                        </button>
                    }
                    @if (!hideSearch()) {
                        <button
                            class="btn btn-primary btn-sm"
                            type="button"
                            [disabled]="loading()"
                            (click)="onSubmit()"
                        >
                            {{ searchLabelKey() | translate }}
                        </button>
                    }
                </div>
            </div>

            <div class="filter-row">
                <ng-content select="[filters]"></ng-content>
            </div>

            <ng-content select="[drawer]"></ng-content>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfSmartBarComponent {
    /** Two-way bound search input. */
    readonly searchText = model<string>('');

    readonly placeholderKey = input<string>('');
    readonly placeholder = input<string>('');

    readonly clearLabelKey = input<string>('common_clear');
    readonly clearTitleKey = input<string>('common_clear');
    readonly searchLabelKey = input<string>('common_search');

    readonly showKbdHint = input(true, { transform: booleanAttribute });
    readonly hideClear = input(false, { transform: booleanAttribute });
    readonly hideSearch = input(false, { transform: booleanAttribute });
    readonly loading = input(false, { transform: booleanAttribute });

    // `search` shadows a native DOM event name. Renaming this output would
    // churn every consumer template, so the name stays and the rule is
    // suppressed here deliberately.
    // eslint-disable-next-line @angular-eslint/no-output-native
    readonly search = output<string>();
    readonly clear = output<void>();

    onSubmit(): void {
        this.search.emit(this.searchText());
    }

    onClear(): void {
        this.searchText.set('');
        this.clear.emit();
    }
}
