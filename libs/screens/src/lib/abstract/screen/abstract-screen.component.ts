import { AfterViewInit, ChangeDetectorRef, Component, inject, Input, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { AbstractComponent } from '../abstract.component';
import { ScreenContext } from '../../config/screen-context';
import { ScreenConfig, LoadOptions } from '../../config/screen-config';
import { ActivatedRoute, Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { AppUtils, PersistedState, StorageUtils } from '@elasticias/utils';
import { EfDatePresetKey, EfDateRange } from '../../entities/date-range.entity';
import { Permissions } from '@elasticias/types';
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

  cacheService = inject(CacheService);
  changeDetector = inject(ChangeDetectorRef);
  toastService = inject(ToastService);
  confirmDialogService = inject(ConfirmDialogService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  refDataService = inject(SCREEN_REF_DATA_SERVICE);

  currentUrl = '';

  protected abstract readonly screenState: string | null;
  get state(): string | null { return this.screenState; }
  screenStateKey = '';

  ngOnInit(): void {
    this.cacheService.configure(true);
    this.currentUrl = this.router.url;
    this.context = new ScreenContext(this.screenState ?? '', undefined, undefined, this.refDataService);

    this.screenStateKey = `SCREEN_STATE_${this.screenState}_${this.getBundleName()}`;
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
    const userGrants: any = AbstractScreenComponent.readGrants();
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

  /**
   * Read a query param from the activated route's snapshot. Shared
   * accessor for deep-links on both search and detail screens (e.g.
   * `?status=PendingApproval`, `?mode=duplicate`) so screens don't
   * reach into `route.snapshot.queryParamMap` themselves.
   */
  protected queryParam(name: string): string | null {
    return this.route.snapshot.queryParamMap.get(name);
  }

  /**
   * Grant check for ANY screen (not just this one's `SCREEN` code) —
   * e.g. an operational strip or report widget calling a
   * differently-gated endpoint. For this screen's own grants prefer
   * `context.isGranted(...)`.
   */
  protected hasGrant(screen: string, permission: Permissions): boolean {
    const grants = AbstractScreenComponent.readGrants();
    return !!grants?.[screen]?.permissions?.includes(permission);
  }

  /**
   * Screen grants, read from wherever the host app put them.
   *
   * Apps store these per tab in sessionStorage (they are refetched on a timer
   * and must not outlive the tab), so sessionStorage is checked first. The
   * localStorage fallback keeps apps working that persist them there instead.
   *
   * Reading only localStorage silently yielded `null` for every screen, which
   * left `context.grants` empty and hid every permission-gated control -- the
   * New and Export buttons and the row actions -- on every screen at once.
   */
  protected static readGrants(): Record<
    string,
    { permissions?: string[] }
  > | null {
    return (
      StorageUtils.getSession<Record<string, { permissions?: string[] }>>(
        'CURRENT_USER_GRANTS',
      ) ??
      StorageUtils.getLocal<Record<string, { permissions?: string[] }>>(
        'CURRENT_USER_GRANTS',
      )
    );
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
    // Backend (FluentValidation) keys are PascalCase (e.g. `ClientType`);
    // template field bindings and the camelCased `setFormErrors` path use
    // camelCase. Normalize here so screens can read `serverErrors()['clientType']`
    // and pass it straight to an `ef-*` control's `[errors]` input.
    const normalized: { [key: string]: string[] } = {};
    if (errors) {
      Object.keys(errors).forEach((key) => {
        normalized[AppUtils.toCamelCase(key)] = errors[key];
      });
    }
    this.serverErrors.set(normalized);
  }

  /* ── Persisted date range ───────────────────────────────────────
       Opt-in. A screen that wants its period to survive a refresh
       calls `restorePersistedDateRange()` once, before its first
       load, and `persistDateRange()` from `onDateRangeChange()`.
       `AbstractReportScreenV2` already does both; list screens can
       opt in the same way. */

  private _dateRangeState?: PersistedState<EfDateRange>;

  /** Storage key for the persisted period. Namespaced by the screen
   *  code so two dashboards never share a period. */
  protected dateRangeStateKey(): string {
    return `SCREEN_DATE_RANGE_${this.getConfig()?.SCREEN ?? 'UNKNOWN'}`;
  }

  protected dateRangeState(): PersistedState<EfDateRange> {
    return (this._dateRangeState ??= this.persisted<EfDateRange>(this.dateRangeStateKey(), {
      revive: raw => AbstractScreenComponent.reviveDateRange(raw),
    }));
  }

  /**
   * The period to open on: the one the user last chose, or `fallback`
   * when there is nothing stored.
   *
   * A relative preset is recomputed rather than replayed — someone who
   * picked "This month" in September and comes back in October means
   * October, not a frozen September window. Only `'custom'` restores
   * the literal dates, which is the case that has no other meaning.
   * Pass `fromPreset` (a screen's own preset resolver) to get that;
   * without it, a stored preset falls back to the default.
   */
  protected restorePersistedDateRange(
    fallback: EfDateRange,
    fromPreset?: (key: EfDatePresetKey) => EfDateRange,
  ): EfDateRange {
    const stored = this.dateRangeState().read();
    if (!stored) return fallback;
    if (stored.presetKey === 'custom') return stored;
    return fromPreset ? fromPreset(stored.presetKey) : fallback;
  }

  protected persistDateRange(range: EfDateRange): void {
    this.dateRangeState().write(range);
  }

  protected clearPersistedDateRange(): void {
    this.dateRangeState().clear();
  }

  /** JSON gives back ISO strings; hand back real `Date`s or nothing. */
  private static reviveDateRange(raw: unknown): EfDateRange | null {
    const v = raw as Partial<EfDateRange> | null;
    if (!v || typeof v !== 'object' || !v.presetKey) return null;
    const start = new Date(v.start as unknown as string);
    const end = new Date(v.end as unknown as string);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    return {
      start,
      end,
      presetKey: v.presetKey,
      label: v.label ?? '',
      labelKey: v.labelKey,
    };
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
