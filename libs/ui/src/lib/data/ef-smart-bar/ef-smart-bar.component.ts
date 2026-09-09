import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    booleanAttribute,
    computed,
    effect,
    inject,
    input,
    model,
    output,
    viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { EfShortcutService, formatShortcut } from '@elasticias/core';

/**
 * Comptoir smart bar — the search/filter card every list screen
 * starts with. Composes:
 *   1. Search input (with an optional keyboard-shortcut hint chip) +
 *      Effacer / Rechercher action buttons.
 *   2. A filter-row slot for `[filters]` (pill-group + filter-pill +
 *      preset-pill + "+ Plus de filtres").
 *   3. A drawer slot for `[drawer]` (advanced filters via
 *      `ef-filter-drawer`).
 *
 * The `searchText` is a `model()` so consumers can `[(searchText)]`
 * for two-way binding, or watch the (search) output for explicit
 * Rechercher clicks.
 *
 * `shortcut` defaults to `'mod+k'`: this component registers it with
 * `EfShortcutService` and focuses the search input when it fires (the
 * user still has to type and submit; the shortcut only gets them into
 * the field). Pass `[shortcut]="null"` on a screen with a second smart
 * bar so only one of them claims the binding.
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
                        #searchInput
                        type="text"
                        [placeholder]="(placeholderKey() ? (placeholderKey() | translate) : placeholder())"
                        [ngModel]="searchText()"
                        (ngModelChange)="searchText.set($event)"
                        (keydown.enter)="onSubmit()"
                    />
                    @if (showKbdHint() && kbdLabel()) {
                        <span class="kbd">{{ kbdLabel() }}</span>
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
    private readonly shortcuts = inject(EfShortcutService);

    /** Distinguishes this instance's registration from any other
     *  ef-smart-bar on screen, the same convention ef-row-actions uses. */
    private static nextInstanceId = 0;
    private readonly instanceId = EfSmartBarComponent.nextInstanceId++;

    private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

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

    /** Keyboard shortcut that focuses the search input. `null` opts out
     *  (a screen with two smart bars registers the binding on only one
     *  of them). Defaults to `'mod+k'`. */
    readonly shortcut = input<string | null>('mod+k');

    protected readonly kbdLabel = computed(() => {
        const keys = this.shortcut();
        return keys ? formatShortcut(keys) : '';
    });

    // `search` shadows a native DOM event name. Renaming this output would
    // churn every consumer template, so the name stays and the rule is
    // suppressed here deliberately.
    // eslint-disable-next-line @angular-eslint/no-output-native
    readonly search = output<string>();
    readonly clear = output<void>();

    constructor() {
        // An effect, not a constructor-time register(): `shortcut` is an
        // input, so its bound value isn't readable until after Angular has
        // finished construction. The effect also re-registers cleanly if a
        // caller ever changes `shortcut` at runtime, and its `onCleanup`
        // covers disposal since `EfShortcutService.register()` cannot pick
        // up a DestroyRef from inside an effect callback.
        effect(onCleanup => {
            const keys = this.shortcut();
            if (!keys) return;
            const dispose = this.shortcuts.register({
                id: `smart-bar.${this.instanceId}.focus`,
                keys,
                // Not 'common_search': this shortcut focuses the field, it
                // never submits, and the dialog is where a user learns
                // what a key actually does.
                labelKey: 'shortcut_focus_search',
                group: 'shortcut_group_screen',
                handler: () => this.searchInput()?.nativeElement.focus(),
            });
            onCleanup(dispose);
        });
    }

    onSubmit(): void {
        this.search.emit(this.searchText());
    }

    onClear(): void {
        this.searchText.set('');
        this.clear.emit();
    }
}
