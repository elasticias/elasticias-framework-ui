import { Signal, signal } from '@angular/core';
import { AbstractEntity } from '../abstract/abstract.entity';
import { Permissions } from '@elasticias/types';

/**
 * Abstract interface for reference data providers.
 * Apps must implement this and provide it to ScreenContext.
 */
export interface ReferenceDataProvider {
  getReference(key: string): Signal<any[]>;
  hasReference(key: string): boolean;
}

export class ScreenContext extends AbstractEntity {
  state: string;
  screenName!: string;
  language: string;
  group: unknown;
  private _refDataProvider?: ReferenceDataProvider;
  bundles: Map<string, Map<string, Map<string, string>>>;
  entity: unknown;
  grants: string[];
  duplicateMode = false;

  constructor(
    state: string,
    group?: unknown,
    entity?: unknown,
    refDataProvider?: ReferenceDataProvider,
    bundles?: Map<string, Map<string, Map<string, string>>>,
    grants?: string[],
    screenName = '',
    language = 'fr'
  ) {
    super();
    this.state = state;
    this.group = group;
    this.entity = entity;
    this.screenName = screenName;
    this.language = language;
    this._refDataProvider = refDataProvider;
    this.bundles = bundles ?? new Map();
    this.grants = grants ?? [];
  }

  setReferenceDataProvider(provider: ReferenceDataProvider): void {
    this._refDataProvider = provider;
  }

  get ref() {
    return {
      get: (key: string): Signal<any[]> => {
        if (!this._refDataProvider) {
          console.warn('ReferenceDataProvider not set in ScreenContext. Returning empty signal.');
          return signal([]);
        }
        return this._refDataProvider.getReference(key);
      },
      has: (key: string): boolean => {
        return this._refDataProvider?.hasReference(key) ?? false;
      },
    };
  }

  getLabel(key: string): string {
    try {
      return this.bundles.get(this.language)!.get(this.screenName)!.get(key) ?? key;
    } catch {
      return key;
    }
  }

  isGranted(permission: Permissions): boolean {
    return this.grants?.some((value) => value === permission) ?? false;
  }

  /* ── Permission convenience getters ───────────────────────────────
     Shared components (ef-row-actions, ef-data-card auto actions cell,
     toolbars) read these to default-show / default-hide CRUD buttons
     against the current user's grants without re-importing
     Permissions at every call site. */

  get hasReadPermission(): boolean {
    return this.isGranted(Permissions.Read);
  }

  get hasCreatePermission(): boolean {
    return this.isGranted(Permissions.Create);
  }

  get hasEditPermission(): boolean {
    return this.isGranted(Permissions.Edit);
  }

  get hasDeletePermission(): boolean {
    return this.isGranted(Permissions.Delete);
  }

  get hasDuplicatePermission(): boolean {
    return this.isGranted(Permissions.Duplicate);
  }

  get hasPrintPermission(): boolean {
    return this.isGranted(Permissions.Print);
  }

  get hasExportPermission(): boolean {
    return this.isGranted(Permissions.Export);
  }

  get hasImportPermission(): boolean {
    return this.isGranted(Permissions.Import);
  }

  isReadOnly(): boolean {
    return (
      this.isGranted(Permissions.Read) &&
      !this.isGranted(Permissions.Create) &&
      !this.isGranted(Permissions.Edit) &&
      !this.isGranted(Permissions.Delete)
    );
  }
}
