import {
  AfterViewInit,
  Component,
  Injector,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ScreenStateEnum } from '../../config/screen-state.enum';
import { ViewModelEntity } from '../../entities/view-model.entity';
import { AbstractScreenComponent } from './abstract-screen.component';
import { Location } from '@angular/common';
import { combineLatest } from 'rxjs';

@Component({
  template: '',
})
export abstract class AbstractDetailScreenComponent
  extends AbstractScreenComponent
  implements AfterViewInit, OnInit, OnDestroy
{
  entity: any = {};
  entityId: any;
  override route: ActivatedRoute;
  editionState: boolean = false;
  duplicateMode: boolean = false;

  private location: Location;
  private serviceInstance: any;

  protected constructor(injector: Injector) {
    super(injector, ScreenStateEnum.DETAIL);

    this.route = injector.get(ActivatedRoute);
    this.location = injector.get(Location);
    this.serviceInstance = injector.get(this.getConfig()!.SERVICE as any);
  }

  override ngOnInit(): void {
    super.ngOnInit();

    const screenConfig = this.getConfig();
    if (screenConfig) {
      this.initializeReferenceKeys(screenConfig.DETAILS_REFERENTIALS_KEYS);
      this.loadReferenceData();
    }
  }

  override ngAfterViewInit(): void {
    super.ngAfterViewInit();
    combineLatest([this.route.paramMap, this.route.queryParamMap]).subscribe(
      ([params, queryParams]) => {
        this.entityId = params.get('id');
        this.duplicateMode = queryParams.get('mode') === 'duplicate';
        this.context.duplicateMode = this.duplicateMode;

        if (this.entityId) {
          this.editionState = !this.duplicateMode;
          this.loadData();
        } else {
          this.editionState = false;
          this.duplicateMode = false;
          this.context.duplicateMode = false;
        }
      },
    );
  }

  public loadData(): void {
    try {
      this.serviceInstance.get(this.entityId).subscribe({
        next: (result: any) => {
          this.entity = new ViewModelEntity(result);
          this.entity.id = this.entityId;
          this.afterLoad();
        },
        error: (_error: any) => {},
      });
    } catch (error) {
      console.error(error);
    }
  }

  protected afterLoad() {
    this.changeDetector.detectChanges();
  }

  abstract beforeSave(): void;

  save() {
    try {
      this.beforeSave();
      this.clearServerErrors();

      const isCreateOperation = !this.editionState || this.duplicateMode;
      const entityToSave = this.duplicateMode
        ? this.prepareEntityForDuplication()
        : this.entity;

      const saveOperation = isCreateOperation
        ? this.serviceInstance.create(entityToSave)
        : this.serviceInstance.update(this.entityId, this.entity);

      saveOperation.subscribe({
        next: (response: any) => {
          if (response && response.errors && response.errors.length > 0) {
            this.handleErrors(response.errors);
          } else {
            this.toastService.showSuccess();
            this.afterSave(response);
          }
        },
        error: (response: any) => {
          console.log(response);
          if (response.errors) {
            this.setServerErrors(response.errors);
            this.setFormErrors(response.errors);
            this.onSaveError(response.errors);
          }
        },
      });
    } catch (error: any) {
      this.toastService.showError(
        error?.message || "Une erreur est survenue lors de l'enregistrement",
      );
    }
  }

  protected onSaveError(_errors: { [key: string]: string[] }) {
    // Override in subclass to handle validation errors
  }

  protected afterSave(result: any) {
    const screenConfig = this.getConfig();
    if (screenConfig?.INVALIDATE_KEYS_ON_SAVE) {
      this.invalidateReferences(screenConfig.INVALIDATE_KEYS_ON_SAVE);

      if (screenConfig.REFRESH_ON_SAVE) {
        this.refreshReferenceData(screenConfig.INVALIDATE_KEYS_ON_SAVE);
      }
    }

    if (!this.editionState || this.duplicateMode) {
      const baseUrl = this.currentUrl.split('?')[0];
      const detailsIndex = baseUrl.indexOf('/details');
      const cleanBaseUrl =
        detailsIndex !== -1
          ? baseUrl.substring(0, detailsIndex + '/details'.length)
          : baseUrl;
      this.router.navigate([cleanBaseUrl, result]);
      return;
    }
  }

  protected prepareEntityForDuplication(): any {
    const duplicatedEntity = { ...this.entity };
    delete duplicatedEntity.id;
    delete duplicatedEntity.Id;
    return this.customizeDuplicatedEntity(duplicatedEntity);
  }

  protected customizeDuplicatedEntity(entity: any): any {
    return entity;
  }

  duplicate() {
    const baseUrl = this.currentUrl.split('?')[0];
    this.router.navigate([baseUrl], {
      queryParams: { mode: 'duplicate' },
    });
  }

  print() {}

  delete(): void {
    if (!this.entityId)
      return this.toastService.showError('Item [id] is undefined!');

    this.confirmDialogService.confirm(
      'Êtes-vous sûr de vouloir supprimer ?',
      () =>
        this.serviceInstance.delete(this.entityId).subscribe({
          next: (result: any) => {
            if (result && result.errors && result.errors.length > 0) {
              this.handleErrors(result.errors);
            } else {
              this.toastService.showSuccess();
              this.navigateBack();
            }
          },
          error: () => {},
        }),
      () => {},
    );
  }

  navigateBack() {
    const currentUrl = this.router.url.split('?')[0];
    const detailsIndex = currentUrl.indexOf('/details');
    if (detailsIndex !== -1) {
      this.router.navigate([currentUrl.substring(0, detailsIndex)]);
    } else {
      this.location.back();
    }
  }
}
