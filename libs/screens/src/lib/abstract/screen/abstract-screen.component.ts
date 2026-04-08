import { AfterViewInit, ChangeDetectorRef, Component, Inject, Injector, Input, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { AbstractComponent } from '../abstract.component';
import { ScreenContext } from '../../config/screen-context';
import { ScreenConfig, LoadOptions } from '../../config/screen-config';
import { ActivatedRoute, Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { AppUtils, StorageUtils } from '@elasticias/utils';
import { ToastService, ConfirmDialogService, CacheService } from '@elasticias/core';
import { Subject } from 'rxjs';
import { ScreenReferenceDataService, SCREEN_REF_DATA_SERVICE } from '../../services/screen-reference-data.service';

@Component({
  template: ''
})
export abstract class AbstractScreenComponent extends AbstractComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() context!: ScreenContext;
  connectedUser: any;

  @ViewChild('entityForm') entityForm!: NgForm;
  serverErrors = signal<{ [key: string]: string[] }>({});
  protected refDataLoaded$ = new Subject<void>();

  cacheService: CacheService;
  changeDetector: ChangeDetectorRef;
  toastService: ToastService;
  confirmDialogService: ConfirmDialogService;
  router: Router;
  route: ActivatedRoute;
  refDataService: ScreenReferenceDataService;

  currentUrl: string;

  state: string | null;
  screenStateKey = '';

  constructor(injector: Injector, @Inject('STATE_TOKEN') state: string | null) {
    super();
    this.state = state;

    this.cacheService = injector.get(CacheService);
    this.cacheService.configure(true);

    this.changeDetector = injector.get(ChangeDetectorRef);
    this.toastService = injector.get(ToastService);
    this.confirmDialogService = injector.get(ConfirmDialogService);
    this.router = injector.get(Router);
    this.route = injector.get(ActivatedRoute);
    this.refDataService = injector.get(SCREEN_REF_DATA_SERVICE);

    this.currentUrl = this.router.url;

    this.context = new ScreenContext(this.state ?? '', undefined, undefined, this.refDataService);
  }

  ngOnInit(): void {
    this.screenStateKey = `SCREEN_STATE_${this.state}_${this.getBundleName()}`;
    this.context.screenName = this.getBundleName();
    this.processGrants();
  }

  ngAfterViewInit(): void {
    this.changeDetector.detectChanges();
    if (this.context && this.context.isReadOnly()) {
      this.disableAllControls();
    }
  }

  processGrants() {
    const userGrants: any = StorageUtils.getLocal('CURRENT_USER_GRANTS');
    if (userGrants && userGrants[this.context.screenName] && userGrants[this.context.screenName].permissions) {
      this.context.grants = userGrants[this.context.screenName].permissions;
    } else {
      this.context.grants = [];
    }
    this.changeDetector.detectChanges();
  }

  isFormValid(): boolean {
    if (this.context.isReadOnly()) { return true; }
    if (!this.entityForm) {
      return false;
    }
    return this.entityForm.valid ?? false;
  }

  getConfig(): any {
    return null;
  }

  getBundleName(): string {
    const config = this.getConfig();
    if (config) {
      return config.SCREEN;
    } else {
      console.error('getConfig() method should be implemented !!');
    }
    return '';
  }

  setFormErrors(errors: { [key: string]: string[] }) {
    if (!errors || !this.entityForm) { return; }

    Object.keys(errors).forEach((field) => {
      const camelCaseField = AppUtils.toCamelCase(field);
      const control = this.entityForm.controls[camelCaseField];

      if (control) {
        control.setErrors({ serverError: errors[field] });
        control.markAsTouched();
      }
    });
  }

  referentialKeys: any;
  staticListKeys: string[] = [];

  initializeReferenceKeys(keys: string[]): void {
    if (!keys) return;
    const referencialKeys: any = {};

    keys.forEach(p => {
      referencialKeys[p] = {};
    });

    this.referentialKeys = referencialKeys;
  }

  initializeStaticLists(keys: string[]): void {
    if (!keys) return;
    this.staticListKeys = keys;
  }

  async loadReferenceData(options?: LoadOptions) {
    const loadPromises: Promise<void>[] = [];

    if (!AppUtils.isNullOrEmpty(this.referentialKeys)) {
      const dynamicKeys = Object.keys(this.referentialKeys);

      const dynamicPromise = this.refDataService
        .loadReferenceKeys(dynamicKeys, options)
        .catch((error: unknown) => {
          console.error('Failed to load dynamic reference data:', error);
        });

      loadPromises.push(dynamicPromise);
    }

    if (this.staticListKeys && this.staticListKeys.length > 0) {
      const staticPromise = this.refDataService
        .loadStaticRefs(this.staticListKeys)
        .catch((error: unknown) => {
          console.error('Failed to load static lists:', error);
        });

      loadPromises.push(staticPromise);
    }

    if (loadPromises.length === 0) {
      this.refDataLoaded$.next();
      return;
    }

    try {
      await Promise.all(loadPromises);
      this.refDataLoaded$.next();
    } catch (error) {
      console.error('Failed to load reference data:', error);
      this.refDataLoaded$.next();
    }
  }

  async refreshReferenceData(keys?: string[]) {
    const keysToRefresh = keys || Object.keys(this.referentialKeys || {});

    if (keysToRefresh.length === 0) {
      return;
    }

    try {
      await this.refDataService.refreshKeys(keysToRefresh, true);
      this.toastService.showSuccess('Reference data refreshed successfully', 'Success');
    } catch (error) {
      console.error('Failed to refresh reference data:', error);
      this.toastService.showError('Failed to refresh reference data', 'Error');
    }
  }

  async refreshStaticLists() {
    if (!this.staticListKeys || this.staticListKeys.length === 0) {
      return;
    }

    try {
      await this.refDataService.loadStaticRefs(this.staticListKeys, true);
      this.toastService.showSuccess('Static lists refreshed successfully', 'Success');
    } catch (error) {
      console.error('Failed to refresh static lists:', error);
      this.toastService.showError('Failed to refresh static lists', 'Error');
    }
  }

  async invalidateReference(key: string) {
    await this.refDataService.invalidateKeys([key]);
  }

  async invalidateReferences(keys: string[]) {
    await this.refDataService.invalidateKeys(keys);
  }

  handleErrors(errors: string[]) {
    if (errors && errors.length > 0) {
      errors.forEach(error => this.toastService.showError(error, 'Erreur de validation'));
    } else {
      this.toastService.showError('Une erreur inconnue est survenue', 'Erreur');
    }
  }

  setServerErrors(errors: { [key: string]: string[] }) {
    this.serverErrors.set(errors || {});
  }

  clearServerErrors() {
    this.serverErrors.set({});
  }

  disableAllControls() {
    setTimeout(() => {
      if (this.entityForm && Object.keys(this.entityForm.controls).length > 0) {
        const controlNames = Object.keys(this.entityForm.controls);
        controlNames.forEach(controlName => {
          const control = this.entityForm.controls[controlName];
          if (control) {
            control.disable();
          }
        });
      }
    }, 10);
  }
}
