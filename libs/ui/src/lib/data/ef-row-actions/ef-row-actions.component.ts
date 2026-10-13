import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    HostListener,
    booleanAttribute,
    computed,
    inject,
    input,
    output,
    signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ScreenContext } from '@elasticias/screens';
import { Permissions } from '@elasticias/types';
import { EfShortcutService } from '@elasticias/core';
import { EfRowAction } from './ef-row-actions.types';

/** Row-scoped shortcuts, wired once per instance and gated on `open()` so
 *  they're inert until this row's menu is on screen. The action `id` is a
 *  convention shared with `ef-data-card.defaultRowActions()`: an instance
 *  with no matching item is simply a no-op for that key. */
const ROW_SHORTCUTS: ReadonlyArray<{ actionId: string; keys: string; labelKey: string }> = [
    { actionId: 'view', keys: 'enter', labelKey: 'common_view' },
    { actionId: 'edit', keys: 'e', labelKey: 'common_edit' },
    { actionId: 'duplicate', keys: 'mod+d', labelKey: 'common_duplicate' },
];

/**
 * Row-actions dropdown — V2 successor to `ef-datatable-actionbar`.
 *
 * Renders a discreet trailing-cell ⋯ trigger (34×28 pill) that opens
 * a small Comptoir-styled menu with the items declared in TS:
 *
 * ```ts
 * actions: ReadonlyArray<EfRowAction> = [
 *   { id: 'view',      labelKey: 'common_view',      icon: 'pi pi-eye',    kbd: formatShortcut('enter'),
 *     permission: Permissions.Read,   command: () => view(row) },
 *   { id: 'edit',      labelKey: 'common_edit',      icon: 'pi pi-pencil', kbd: formatShortcut('e'),
 *     permission: Permissions.Edit,   command: () => edit(row) },
 *   { id: 'duplicate', labelKey: 'common_duplicate', icon: 'pi pi-copy',   kbd: formatShortcut('mod+d'),
 *                                         command: () => duplicate(row) },
 *   { separator: true },
 *   { id: 'delete',    labelKey: 'common_delete',    icon: 'pi pi-trash',  severity: 'danger',
 *     permission: Permissions.Delete, command: () => delete(row) },
 * ];
 * ```
 *
 * ```html
 * <ng-template efColumnTemplate="actions" let-row>
 *   <ef-row-actions [items]="rowActions(row)" [context]="context" />
 * </ng-template>
 * ```
 *
 * Behaviour:
 * - Click the trigger to toggle. Trigger gets `.open` (ink-active) while the menu is open.
 * - Only one row menu is open at a time — opening one closes the last.
 * - The menu flips above the trigger when there isn't room below it.
 * - The menu is fixed to the viewport, placed from the trigger's rect, so a
 *   table's horizontal scroller cannot clip it. Scrolling any ancestor or
 *   resizing the window closes it, rather than leaving it behind its row.
 * - Click outside or press `Escape` to close.
 * - Clicking an item runs its `command` then closes the menu.
 * - dblclick on the trigger or menu does NOT propagate, so the data-card's
 *   `rowDoubleClickable` won't fire from this column.
 *
 * Permission filtering: pass `[context]="..."` (a `ScreenContext`); items
 * declaring a `permission` are hidden unless that permission is granted.
 * Items with no `permission` always show.
 *
 * The `kbd` hint is decorative unless it's one of `view` / `edit` /
 * `duplicate`: this component registers Enter, `E` and `mod+D` against
 * `EfShortcutService`, gated on `open()`, so they only fire while this
 * row's menu is on screen. Render `kbd` through `formatShortcut()` (as
 * above): a hardcoded `'⌘D'` is wrong for a Windows user, which is
 * exactly the bug this wiring fixes.
 */
@Component({
    selector: 'ef-row-actions',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    templateUrl: './ef-row-actions.component.html',
    styleUrl: './ef-row-actions.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfRowActionsComponent {
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly shortcuts = inject(EfShortcutService);

    /** Distinguishes this instance's registrations from every other row's:
     *  each row on screen constructs its own component, and ids must not
     *  collide or one row's disposer (and its `when`) would clobber
     *  another's still-live registration. */
    private static nextInstanceId = 0;
    private readonly instanceId = EfRowActionsComponent.nextInstanceId++;

    constructor() {
        // A row can go while its menu is open (a refresh, paging, a filter).
        // Close it properly so the listeners go and anything counting open
        // menus through the toggle event hears about it.
        // (Not close(): an output must not emit from a destroyed component.)
        inject(DestroyRef).onDestroy(() => {
            this.stopListeningForDisplacement();
            if (EfRowActionsComponent.openInstance === this) EfRowActionsComponent.openInstance = null;
            if (this.open()) this.dispatchToggle(false);
        });
        for (const { actionId, keys, labelKey } of ROW_SHORTCUTS) {
            this.shortcuts.register({
                id: `row-actions.${this.instanceId}.${actionId}`,
                keys,
                labelKey,
                group: 'shortcut_group_row_actions',
                // Gated on the trigger, not merely on `open()`: once a
                // keyboard user tabs from the trigger into the menu itself,
                // Enter is the button's own native activation key for
                // whichever item has focus. Without this, the `enter`
                // registration would run "view" from underneath the
                // focused "delete" button and swallow its click.
                when: () => this.open() && !this.isFocusInsideMenu(),
                handler: () => {
                    const action = this.visibleItems().find(a => a.id === actionId);
                    if (!action || action.disabled) return;
                    action.command?.();
                    this.close();
                },
            });
        }
    }

    private isFocusInsideMenu(): boolean {
        return !!document.activeElement?.closest('.row-actions__menu');
    }

    /** Action descriptors. */
    readonly items = input<ReadonlyArray<EfRowAction>>([]);

    /** Optional context — when present, items with a `permission` are
     *  filtered against `context.isGranted(permission)`. */
    readonly context = input<ScreenContext | undefined>(undefined);

    /** Override the trigger icon (default ellipsis). */
    readonly triggerIcon = input<string>('pi pi-ellipsis-h');

    /** Override the trigger aria-label translation key. */
    readonly triggerAriaKey = input<string>('common_actions');

    /** Disable the entire trigger (e.g., row not actionable). */
    readonly disabled = input(false, { transform: booleanAttribute });

    /**
     * Pin the menu to the inline-start edge of the trigger instead of
     * inline-end. Use when the actions cell sits at the start of the row.
     */
    readonly menuLeft = input(false, { transform: booleanAttribute });

    /** Forwarded when the menu opens (e.g., for a data-card to lift overflow). */
    readonly opened = output<void>();
    /** Forwarded when the menu closes. */
    readonly closed = output<void>();

    /** Visible items (after permission + visible filtering). */
    readonly visibleItems = computed<ReadonlyArray<EfRowAction>>(() => {
        const ctx = this.context();
        return this.items().filter(a => this.isVisible(a, ctx));
    });

    /** Open state. */
    readonly open = signal(false);

    /** Menu renders above the trigger instead of below it. */
    readonly dropUp = signal(false);

    /**
     * The one menu currently open, app-wide.
     *
     * The trigger click is stopped from reaching `document` so it can't
     * select or open the row, which also means no other instance's
     * outside-click listener ever sees it. Without an explicit hand-off
     * every menu clicked stays open and they stack up on screen.
     */
    private static openInstance: EfRowActionsComponent | null = null;

    toggle(event: MouseEvent): void {
        event.stopPropagation();
        if (this.disabled() || this.visibleItems().length === 0) return;
        this.open.update(v => !v);
        const isOpen = this.open();

        if (isOpen) {
            EfRowActionsComponent.openInstance?.close();
            EfRowActionsComponent.openInstance = this;
            // Place it from an estimate first so it never renders in the
            // wrong direction, then correct against the real height once
            // the menu is in the DOM.
            this.dropUp.set(this.shouldDropUp(this.estimateMenuHeight()));
            this.place();
            this.listenForDisplacement();
            this.correctPlacementAfterRender();
        } else {
            this.stopListeningForDisplacement();
        }

        this.dispatchToggle(isOpen);
        if (isOpen) this.opened.emit();
        else this.closed.emit();
    }

    runCommand(action: EfRowAction, event: MouseEvent): void {
        event.stopPropagation();
        if (action.disabled || action.separator) return;
        action.command?.();
        this.close();
    }

    close(): void {
        if (!this.open()) return;
        this.stopListeningForDisplacement();
        this.open.set(false);
        if (EfRowActionsComponent.openInstance === this) {
            EfRowActionsComponent.openInstance = null;
        }
        this.dispatchToggle(false);
        this.closed.emit();
    }

    /* ── Placement ──────────────────────────────────────────────── */

    /** Gap between the trigger and the menu, plus a little breathing room
     *  against the viewport edge. Matches `top: calc(100% + 8px)`. */
    private static readonly EDGE_GAP = 16;

    /**
     * Drop upward when the menu would not fit below the trigger and there
     * is more room above. On a short viewport where it fits neither way,
     * below wins, which is where it has always been.
     */
    private shouldDropUp(menuHeight: number): boolean {
        const rect = this.triggerRect();
        const below = EfRowActionsComponent.viewportHeight() - rect.bottom;
        const above = rect.top;
        return below < menuHeight + EfRowActionsComponent.EDGE_GAP && above > below;
    }

    /** Gap between the trigger and the menu. Matches the CSS `calc(100% + 8px)`. */
    private static readonly MENU_GAP = 8;

    /**
     * Where the fixed menu sits, as physical offsets from the viewport
     * edges. The four values are always set, so they override the CSS
     * `top` / `bottom` / `inset-inline-*` an absolute menu uses.
     */
    readonly menuPosition = signal<{
        top: string;
        right: string;
        bottom: string;
        left: string;
        maxHeight: string;
    } | null>(null);

    /**
     * Fixed rather than absolute: inside ef-data-card the table sits in a
     * horizontal scroller, and `overflow-x: auto` makes the block axis clip
     * too, so an absolute menu was cut off at the scroller's edge. Lifting
     * the scroller's overflow while a menu is open would reset its
     * scrollLeft and spill the table across the page, exactly when the
     * reader has scrolled across to reach the actions column.
     */
    private place(): void {
        const rect = this.triggerRect();
        const vw = EfRowActionsComponent.viewportWidth();
        const vh = EfRowActionsComponent.viewportHeight();
        const gap = EfRowActionsComponent.MENU_GAP;
        const px = (n: number) => `${Math.round(n)}px`;

        // The menu's inline end meets the trigger's inline end (or its
        // inline start with menuLeft); in a right-to-left page those are
        // the physical left and right edges respectively.
        const rtl = this.isRtl();
        const alignRight = rtl === this.menuLeft();

        // A fixed menu cannot be scrolled into view (a scroll closes it), so
        // one taller than the room on its side scrolls inside itself instead.
        const room = this.dropUp() ? rect.top - gap - gap : vh - (rect.bottom + gap) - gap;

        this.menuPosition.set({
            top: this.dropUp() ? 'auto' : px(rect.bottom + gap),
            bottom: this.dropUp() ? px(vh - rect.top + gap) : 'auto',
            right: alignRight ? px(vw - rect.right) : 'auto',
            left: alignRight ? 'auto' : px(rect.left),
            maxHeight: px(Math.max(room, 120)),
        });
    }

    /**
     * An ancestor with a transform, filter or containment becomes the fixed
     * menu's containing block (a dialog mid-animation, for one), and the
     * viewport offsets land in the wrong place. Measure where the menu
     * actually is against where the trigger says it should be, and shift
     * by the difference. Also nudges it back inside the viewport.
     */
    private correctOffset(menu: HTMLElement): void {
        const pos = this.menuPosition();
        if (!pos) return;
        const rect = this.triggerRect();
        const m = menu.getBoundingClientRect();
        if (!m.width && !m.height) return;
        const gap = EfRowActionsComponent.MENU_GAP;
        const vw = EfRowActionsComponent.viewportWidth();

        const wantTop = this.dropUp() ? rect.top - gap - m.height : rect.bottom + gap;
        // Only meaningful once the entry animation (a translate and scale)
        // is over; see correctPlacementAfterRender.
        const alignRight = pos.right !== 'auto';
        let wantLeft = alignRight ? rect.right - m.width : rect.left;
        // Keep the whole menu on screen when the trigger hugs an edge.
        wantLeft = Math.min(Math.max(wantLeft, gap), Math.max(gap, vw - gap - m.width));

        const dx = wantLeft - m.left;
        const dy = wantTop - m.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

        const shift = (value: string, by: number) =>
            value === 'auto' ? value : `${Math.round(parseFloat(value) + by)}px`;
        this.menuPosition.set({
            ...pos,
            top: shift(pos.top, dy),
            bottom: shift(pos.bottom, -dy),
            left: shift(pos.left, dx),
            right: shift(pos.right, -dx),
        });
    }

    /** The nearest `dir` wins (the app sets it on <html>); computed style covers a page without one. */
    private isRtl(): boolean {
        const el = this.host.nativeElement;
        const dir = el.closest('[dir]')?.getAttribute('dir');
        if (dir) return dir.toLowerCase() === 'rtl';
        return getComputedStyle(el).direction === 'rtl';
    }

    private triggerRect(): DOMRect {
        const trigger = this.host.nativeElement.querySelector<HTMLElement>('.row-actions__trigger');
        return (trigger ?? this.host.nativeElement).getBoundingClientRect();
    }

    /** The fixed containing block: the viewport without its scrollbars. */
    private static viewportWidth(): number {
        return document.documentElement.clientWidth || window.innerWidth;
    }

    private static viewportHeight(): number {
        return document.documentElement.clientHeight || window.innerHeight;
    }

    /* ── Displacement ───────────────────────────────────────────────
       A fixed menu does not move with its row. Any scroll (the table's own
       horizontal scroller, the page, a dialog body) or a resize would leave
       it floating over the wrong row, so either one closes it. Scrolls
       inside the menu itself are not displacement. */

    private displacementListener: ((event: Event) => void) | null = null;

    private listenForDisplacement(): void {
        if (this.displacementListener) return;
        // Width only: an on-screen keyboard closing (a focused cell input
        // blurs when the trigger is tapped) or a browser toolbar sliding
        // changes the height alone, and would close the menu as it opens.
        const openWidth = EfRowActionsComponent.viewportWidth();
        const listener = (event: Event) => {
            if (event.type === 'resize') {
                if (EfRowActionsComponent.viewportWidth() !== openWidth) this.close();
                return;
            }
            const target = event.target;
            if (target instanceof Node && this.host.nativeElement.querySelector('.row-actions__menu')?.contains(target)) {
                return;
            }
            this.close();
        };
        this.displacementListener = listener;
        document.addEventListener('scroll', listener, { capture: true, passive: true });
        window.addEventListener('resize', listener, { passive: true });
    }

    private stopListeningForDisplacement(): void {
        const listener = this.displacementListener;
        if (!listener) return;
        this.displacementListener = null;
        document.removeEventListener('scroll', listener, { capture: true });
        window.removeEventListener('resize', listener);
    }

    /** Rough height before the menu exists: item padding + line box, with
     *  dividers and the menu's own padding and border. */
    private estimateMenuHeight(): number {
        const items = this.visibleItems();
        const separators = items.filter(a => a.separator).length;
        return 14 + (items.length - separators) * 39 + separators * 10;
    }

    /** Re-decide against the rendered height — item labels wrap, and the
     *  estimate can't know that. */
    private correctPlacementAfterRender(): void {
        requestAnimationFrame(() => {
            if (!this.open()) return;
            const menu = this.host.nativeElement.querySelector<HTMLElement>('.row-actions__menu');
            if (!menu) return;
            this.dropUp.set(this.shouldDropUp(menu.offsetHeight));
            this.place();
            // The new offsets reach the DOM on the next change detection.
            // Measure only after the entry animation: its translate and
            // scale are in getBoundingClientRect, and correcting mid-flight
            // would lock a few pixels of the animation into the offsets.
            requestAnimationFrame(() => {
                if (!this.open()) return;
                const running = menu.getAnimations?.() ?? [];
                if (!running.length) {
                    this.correctOffset(menu);
                    return;
                }
                Promise.all(running.map(a => a.finished))
                    .then(() => {
                        if (this.open()) this.correctOffset(menu);
                    })
                    .catch(() => undefined);
            });
        });
    }

    /** Bubbling DOM event so ancestors can react to a row menu opening or
     *  closing. ef-data-card no longer needs it (the menu is fixed). */
    private dispatchToggle(open: boolean): void {
        this.host.nativeElement.dispatchEvent(
            new CustomEvent('ef-row-actions-toggle', {
                bubbles: true,
                composed: true,
                detail: { open },
            }),
        );
    }

    /** Outside click — closes the menu. */
    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        if (!this.open()) return;
        const target = event.target as Node | null;
        if (target && this.host.nativeElement.contains(target)) return;
        this.close();
    }

    /** Escape closes the menu. */
    @HostListener('document:keydown.escape')
    onEscape(): void {
        this.close();
    }

    /** Swallow dblclick so row-double-click doesn't fire from this column. */
    onDblClick(event: MouseEvent): void {
        event.stopPropagation();
    }

    private isVisible(action: EfRowAction, ctx: ScreenContext | undefined): boolean {
        if (action.separator) return true;
        if (action.visible === false) return false;
        if (action.permission && ctx) {
            // Array.isArray does not narrow a ReadonlyArray out of the union.
            const required: ReadonlyArray<Permissions> =
                typeof action.permission === 'string' ? [action.permission] : action.permission;
            if (!required.every(p => ctx.isGranted(p))) return false;
        }
        return true;
    }

    /** Stable trackBy across renders. */
    trackByItem = (i: number, action: EfRowAction): unknown =>
        action.id ?? (action.separator ? `__sep_${i}` : action.label ?? action.labelKey ?? i);
}
