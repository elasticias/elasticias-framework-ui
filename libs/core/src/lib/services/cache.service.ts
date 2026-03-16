import { Injectable } from '@angular/core';
import { StorageUtils } from '@elasticias/utils';

@Injectable({ providedIn: 'root' })
export class CacheService {
  private cache: Record<string, unknown> = {};
  private useLocalStorage = false;

  configure(useLocalStorage = false): void {
    this.useLocalStorage = useLocalStorage;
  }

  getCache<T>(key: string): T | null {
    return this.useLocalStorage ? StorageUtils.getLocal<T>(key) : (this.cache[key] as T) ?? null;
  }

  setCache(key: string, value: unknown): void {
    this.useLocalStorage ? StorageUtils.setLocal(key, value) : (this.cache[key] = value);
  }

  updateCache(key: string, newValue: unknown): void {
    if (this.useLocalStorage) {
      const current = StorageUtils.getLocal(key);
      if (current && typeof current === 'object' && typeof newValue === 'object') {
        StorageUtils.setLocal(key, { ...(current as object), ...(newValue as object) });
      } else {
        StorageUtils.setLocal(key, newValue);
      }
    } else {
      const current = this.cache[key];
      if (current && typeof current === 'object' && typeof newValue === 'object') {
        this.cache[key] = { ...(current as object), ...(newValue as object) };
      } else {
        this.cache[key] = newValue;
      }
    }
  }

  removeCache(key: string): void {
    this.useLocalStorage ? StorageUtils.removeLocal(key) : delete this.cache[key];
  }

  clearAllCache(): void {
    this.useLocalStorage ? StorageUtils.clearLocal() : (this.cache = {});
  }

  hasCache(key: string): boolean {
    return this.useLocalStorage ? StorageUtils.existsLocal(key) : key in this.cache;
  }
}
