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

  @Input({ transform: booleanAttribute }) visible: boolean = false;
  @Input({ transform: booleanAttribute }) modal: boolean = true;
  @Input({ transform: booleanAttribute }) closable: boolean = true;
  @Input({ transform: booleanAttribute }) draggable: boolean = false;
  @Input({ transform: booleanAttribute }) resizable: boolean = false;
  @Input() style?: { [key: string]: string };
  @Input() styleClass?: string;
  @Input() position: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'topleft' | 'topright' | 'bottomleft' | 'bottomright' = 'center';
  @Input() appendTo?: string;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() onShow = new EventEmitter<void>();
  @Output() onHide = new EventEmitter<void>();

  handleVisibleChange(value: boolean): void {
    this.visible = value;
    this.visibleChange.emit(value);
  }

  handleShow(): void {
    this.onShow.emit();
  }

  handleHide(): void {
    this.onHide.emit();
  }
}
