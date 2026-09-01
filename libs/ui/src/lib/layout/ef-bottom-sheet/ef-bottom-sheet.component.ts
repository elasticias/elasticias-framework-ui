import {
    booleanAttribute,
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    HostListener,
    Input,
    Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Slide-up overlay with a grabber. Replaces dropdowns and dialogs on
 * mobile per the Comptoir plan. Controlled component — apps drive
 * `[open]` and listen to `(openChange)`.
 *
 * Tapping the backdrop or pressing Escape emits `openChange.emit(false)`.
 *
 * Usage:
 * ```html
 * <ef-bottom-sheet [open]="filtersOpen()" (openChange)="filtersOpen.set($event)">
 *   <ng-template>...filters body...</ng-template>
 * </ef-bottom-sheet>
 * ```
 */
@Component({
    selector: 'ef-bottom-sheet',
    standalone: true,
    templateUrl: './ef-bottom-sheet.component.html',
    styleUrl: './ef-bottom-sheet.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule],
    host: {
        '[class.is-open]': 'open',
        '[attr.aria-hidden]': '!open',
    },
})
export class EfBottomSheetComponent {
    @Input({ transform: booleanAttribute }) open = false;
    @Input({ transform: booleanAttribute }) dismissOnBackdrop = true;

    @Output() openChange = new EventEmitter<boolean>();

    onBackdropClick(): void {
        if (this.dismissOnBackdrop) this.close();
    }

    @HostListener('document:keydown.escape')
    onEscape(): void {
        if (this.open) this.close();
    }

    close(): void {
        this.open = false;
        this.openChange.emit(false);
    }
}
