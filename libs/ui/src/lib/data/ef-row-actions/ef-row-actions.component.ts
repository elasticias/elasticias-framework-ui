import {
    ChangeDetectionStrategy,
    Component,
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
import { EfRowAction } from './ef-row-actions.types';

/**
 * Row-actions dropdown — V2 successor to `ef-datatable-actionbar`.
 *
 * Renders a discreet trailing-cell ⋯ trigger (34×28 pill) that opens
 * a small Comptoir-styled menu with the items declared in TS:
 *
 * ```ts
 * actions: ReadonlyArray<EfRowAction> = [
 *   { id: 'view',      labelKey: 'common_view',      icon: 'pi pi-eye',    kbd: '↵',
 *     permission: PermissionsEnum.Read,   command: () => view(row) },
 *   { id: 'edit',      labelKey: 'common_edit',      icon: 'pi pi-pencil', kbd: 'E',
 *     permission: PermissionsEnum.Edit,   command: () => edit(row) },
 *   { id: 'duplicate', labelKey: 'common_duplicate', icon: 'pi pi-copy',
 *                                         command: () => duplicate(row) },
 *   { separator: true },
 *   { id: 'delete',    labelKey: 'common_delete',    icon: 'pi pi-trash',  severity: 'danger',
 *     permission: PermissionsEnum.Delete, command: () => delete(row) },
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
 * - Click outside or press `Escape` to close.
 * - Clicking an item runs its `command` then closes the menu.
 * - dblclick on the trigger or menu does NOT propagate, so the data-card's
 *   `rowDoubleClickable` won't fire from this column.
 *
 * Permission filtering: pass `[context]="..."` (a `ScreenContext`); items
 * declaring a `permission` are hidden unless that permission is granted.
 * Items with no `permission` always show.
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

    toggle(event: MouseEvent): void {
        event.stopPropagation();
        if (this.disabled() || this.visibleItems().length === 0) return;
        this.open.update(v => !v);
        const isOpen = this.open();
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
        this.open.set(false);
        this.dispatchToggle(false);
        this.closed.emit();
    }

    /** Bubbling DOM event so ancestors (e.g. ef-data-card) can react —
     *  see `.tbl-wrap.has-open-menu { overflow: visible }`. */
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
        if (action.permission && ctx && !ctx.isGranted(action.permission)) return false;
        return true;
    }

    /** Stable trackBy across renders. */
    trackByItem = (i: number, action: EfRowAction): unknown =>
        action.id ?? (action.separator ? `__sep_${i}` : action.label ?? action.labelKey ?? i);
}
