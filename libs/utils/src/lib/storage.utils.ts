/**
 * Configurable prefix-based wrapper for localStorage and sessionStorage.
 * Default prefix is 'Elasticias_'. Override via `StorageUtils.configure()`.
 */
export class StorageUtils {
  private static _prefix = 'Elasticias_';

  static configure(prefix: string): void {
    StorageUtils._prefix = prefix;
  }

  static get prefix(): string {
    return StorageUtils._prefix;
  }

  private static getPrefixedKey(key: string): string {
    return `${StorageUtils._prefix}${key}`;
  }

  static setLocal(key: string, value: unknown): void {
    try {
      const localKey = this.getPrefixedKey(key);
      localStorage.setItem(localKey, JSON.stringify(value));
    } catch (error) {
      console.error('Error storing data in localStorage: ', key, error);
    }
  }

  static getLocal<T>(key: string, usePrefix = true): T | null {
    const localKey = usePrefix ? this.getPrefixedKey(key) : key;
    const item = localStorage.getItem(localKey);
    try {
      if (item) {
        return JSON.parse(item) as T;
      }
    } catch (error) {
      console.error('Error parsing JSON from localStorage: ', key, error);
    }
    return null;
  }

  static removeLocal(key: string): void {
    localStorage.removeItem(this.getPrefixedKey(key));
  }

  static clearLocal(): void {
    localStorage.clear();
  }

  static setSession(key: string, value: unknown): void {
    const sessionKey = this.getPrefixedKey(key);
    sessionStorage.setItem(sessionKey, JSON.stringify(value));
  }

  static getSession<T>(key: string): T | null {
    const sessionKey = this.getPrefixedKey(key);
    const item = sessionStorage.getItem(sessionKey);
    return item ? (JSON.parse(item) as T) : null;
  }

  static removeSession(key: string): void {
    sessionStorage.removeItem(this.getPrefixedKey(key));
  }

  static clearSession(): void {
    sessionStorage.clear();
  }

  static existsLocal(key: string): boolean {
    return localStorage.getItem(this.getPrefixedKey(key)) !== null;
  }

  static existsSession(key: string): boolean {
    return sessionStorage.getItem(this.getPrefixedKey(key)) !== null;
  }
}
