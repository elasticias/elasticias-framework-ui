import { Signal, signal } from '@angular/core';
import { AbstractEntity } from '../abstract/abstract.entity';
import { PermissionsEnum } from '@elasticias/types';

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

  isGranted(permission: PermissionsEnum): boolean {
    return this.grants?.some((value) => value === permission) ?? false;
  }

  isReadOnly(): boolean {
    return (
      this.isGranted(PermissionsEnum.Read) &&
      !this.isGranted(PermissionsEnum.Write) &&
      !this.isGranted(PermissionsEnum.Edit) &&
      !this.isGranted(PermissionsEnum.Delete)
    );
  }
}
