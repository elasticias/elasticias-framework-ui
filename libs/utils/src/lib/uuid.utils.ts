export class UuidUtils {
  static randomUUID(): string {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
    return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
}
