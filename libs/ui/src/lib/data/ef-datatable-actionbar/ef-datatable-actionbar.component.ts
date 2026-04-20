import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ScreenContext } from '@elasticias/screens';
import { PermissionsEnum } from '@elasticias/types';
import { TranslateModule } from '@ngx-translate/core';
import { EfButtonComponent } from '../../layout/ef-button/ef-button.component';

@Component({
  selector: 'ef-datatable-actionbar',
  standalone: true,
  templateUrl: 'ef-datatable-actionbar.component.html',
  imports: [
    EfButtonComponent,
    TranslateModule,
  ],
})
export class EfDatatableActionBarComponent {
  @Input() context?: ScreenContext;

  @Input() state?: string;

  @Output() duplicate = new EventEmitter();
  @Output() edit = new EventEmitter();
  @Output() delete = new EventEmitter();

  // Flags
  @Input() duplicateButton = true;
  @Input() editButton = true;
  @Input() deleteButton = true;

  get hasReadPermission(): boolean {
    return this.context?.isGranted(PermissionsEnum.Read) ?? false;
  }

  get hasEditPermission(): boolean {
    return this.context?.isGranted(PermissionsEnum.Edit) ?? false;
  }

  get hasDeletePermission(): boolean {
    return this.context?.isGranted(PermissionsEnum.Delete) ?? false;
  }

  duplicateAction() {
    this.duplicate.emit();
  }

  editAction() {
    this.edit.emit();
  }

  deleteAction() {
    this.delete.emit();
  }
}
