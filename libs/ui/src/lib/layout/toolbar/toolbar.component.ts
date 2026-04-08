import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
} from '@angular/core';
import { EfButtonComponent } from '../ef-button/ef-button.component';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ToolbarModule } from 'primeng/toolbar';
import { ScreenStateEnum, ScreenContext } from '@elasticias/screens';
import { Router } from '@angular/router';
import { PermissionsEnum } from '@elasticias/types';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'ef-toolbar',
  standalone: true,
  templateUrl: 'toolbar.component.html',
  styleUrl: 'toolbar.component.scss',
  imports: [
    CommonModule,
    ToolbarModule,
    EfButtonComponent,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    FormsModule,
    TranslateModule,
  ],
})
export class EfToolbarComponent {
  @Input() context: ScreenContext;

  @Input() state: string;
  @Input() disabled: boolean;

  // Detail Action
  @Output() back = new EventEmitter();
  @Output() save = new EventEmitter();
  @Output() delete = new EventEmitter();
  @Output() duplicate = new EventEmitter();
  @Output() print = new EventEmitter();
  @Output() triggerCustoAction = new EventEmitter<any>();

  // Search Actions
  @Output() add = new EventEmitter();
  @Output() searchAction$ = new EventEmitter();
  @Output() clear = new EventEmitter();

  searchText = '';

  // Flags
  @Input() backButton = false;
  @Input() deleteButton = false;
  @Input() duplicateButton = true;
  @Input() saveButton = true;
  @Input() exportButton = false;
  @Input() printButton = false;
  @Input() addButton = true;
  @Input() clearButton = true;
  @Input() searchButton = true;
  @Input() showFreeSearchInput = false;

  private router = inject(Router);

  get isSearchState(): boolean {
    return this.state === ScreenStateEnum.SEARCH;
  }

  get isDetailState(): boolean {
    return this.state === ScreenStateEnum.DETAIL;
  }

  get hasReadPermission(): boolean {
    return this.context.isGranted(PermissionsEnum.Read);
  }

  get hasWritePermission(): boolean {
    return this.context.isGranted(PermissionsEnum.Write);
  }

  get hasEditPermission(): boolean {
    return this.context.isGranted(PermissionsEnum.Edit);
  }

  get hasDeletePermission(): boolean {
    return this.context.isGranted(PermissionsEnum.Delete);
  }

  get hasDuplicatePermission(): boolean {
    return this.context.isGranted(PermissionsEnum.Duplicate);
  }

  get hasExportPermission(): boolean {
    return this.context.isGranted(PermissionsEnum.Export);
  }

  get isDuplicateMode(): boolean {
    return this.context?.duplicateMode ?? false;
  }

  backAction() {
    this.back.emit();
    this.navigateBack();
  }

  deleteAction() {
    this.delete.emit();
  }

  saveAction() {
    this.save.emit();
  }

  duplicateAction() {
    this.duplicate.emit();
  }

  printAction() {
    this.print.emit();
  }

  exportAction() {
    this.add.emit();
  }

  addAction() {
    this.add.emit();
  }

  searchAction() {
    this.searchAction$.emit();
  }

  clearAction() {
    this.clear.emit();
  }

  navigateBack() {
    const currentUrl = this.router.url;
    const baseUrl = currentUrl.substring(0, currentUrl.indexOf('/details'));
    this.router.navigate([baseUrl]);
  }
}
