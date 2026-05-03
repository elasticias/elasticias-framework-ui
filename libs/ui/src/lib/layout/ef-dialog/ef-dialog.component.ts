import {
  booleanAttribute,
  Component,
  Input,
  Output,
  EventEmitter,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { EfButtonComponent } from '../ef-button/ef-button.component';

@Component({
  selector: 'ef-dialog',
  standalone: true,
  templateUrl: './ef-dialog.component.html',
  imports: [DialogModule, TranslateModule, EfButtonComponent],
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
  @Input() position:
    | 'center'
    | 'top'
    | 'bottom'
    | 'left'
    | 'right'
    | 'topleft'
    | 'topright'
    | 'bottomleft'
    | 'bottomright' = 'center';
  @Input() appendTo?: string;

  // ── Default action footer (opt-in) ────────────────────────────────────────
  /**
   * Render a standard cancel + save action footer. Caller wires (saveAction)
   * and (cancelAction). When false (default), the footer falls back to the
   * `[dialogFooter]` projection slot for fully custom footers.
   */
  @Input({ transform: booleanAttribute }) defaultActions = true;
  @Input() saveLabelKey = 'button.save';
  @Input() cancelLabelKey = 'button.cancel';
  @Input() saveLabel?: string;
  @Input() cancelLabel?: string;
  @Input() saveIcon = 'pi pi-check';
  @Input({ transform: booleanAttribute }) saveDisabled = false;
  @Input() saveStyleClass = 'p-button-sm';
  @Input() cancelStyleClass = 'p-button-sm p-button-text';

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() showEvent = new EventEmitter<void>();
  @Output() hideEvent = new EventEmitter<void>();
  @Output() saveAction = new EventEmitter<void>();
  @Output() cancelAction = new EventEmitter<void>();

  // Captured here so we can pipe it directly into <p-dialog>'s [footerTemplate]
  // input. Templates declared inside this component's view are NOT content
  // children of <p-dialog>, so its @ContentChild('footer') lookup never finds
  // them — the input is the only reliable wiring.
  @ViewChild('defaultFooter', { static: true }) defaultFooterTpl?: TemplateRef<void>;

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

  /**
   * Default cancel handler — emits and also closes the dialog. Callers can
   * override behavior via (cancelAction) (close still happens).
   */
  onDefaultCancel(): void {
    this.cancelAction.emit();
    this.handleVisibleChange(false);
  }

  onDefaultSave(): void {
    if (this.saveDisabled) return;
    this.saveAction.emit();
  }
}
