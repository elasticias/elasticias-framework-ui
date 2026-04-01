import {
  booleanAttribute,
  Component,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'ef-dialog',
  standalone: true,
  templateUrl: './ef-dialog.component.html',
  imports: [DialogModule, TranslateModule],
})
export class EfDialogComponent {
  /** Direct header text (not translated) */
  @Input() header?: string;
  /** Translation key — takes priority over header */
  @Input() headerKey?: string;

  @Input({ transform: booleanAttribute }) visible = false;
  @Input({ transform: booleanAttribute }) modal = true;
  @Input({ transform: booleanAttribute }) closable = true;
  @Input({ transform: booleanAttribute }) draggable = false;
  @Input({ transform: booleanAttribute }) resizable = false;
  @Input() style?: { [key: string]: string };
  @Input() styleClass?: string;
  @Input() position: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'topleft' | 'topright' | 'bottomleft' | 'bottomright' = 'center';
  @Input() appendTo?: string;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() showEvent = new EventEmitter<void>();
  @Output() hideEvent = new EventEmitter<void>();

  handleVisibleChange(value: boolean): void {
    this.visible = value;
    this.visibleChange.emit(value);
  }

  handleShow(): void {
    this.showEvent.emit();
  }

  handleHide(): void {
    this.hideEvent.emit();
  }
}
