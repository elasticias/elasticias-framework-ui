import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * Abstract contract for the change-history (audit trail) backend client used by
 * {@link AbstractDetailScreenV2}. Apps provide their NSwag-generated `AuditClient`
 * via the {@link AUDIT_HISTORY_SERVICE} token — kept abstract so `@elasticias/screens`
 * stays decoupled from any app's generated API client.
 */
export interface AuditHistoryService {
  /**
   * Fetch the change-history for a single record, newest first.
   * @param entityType Stable backend entity type discriminator (e.g. `'Client'`).
   * @param id Record identifier.
   */
  get(entityType: string, id: string): Observable<any[]>;
}

/**
 * Injection token for the change-history client. Provide it once at app root:
 *
 * @example
 * { provide: AUDIT_HISTORY_SERVICE, useExisting: AuditClient }
 *
 * Detail screens then only declare `static AUDIT_ENTITY_TYPE = 'Client'` on
 * their config — {@link AbstractDetailScreenV2} loads the history automatically
 * into its `auditEntries` signal.
 */
export const AUDIT_HISTORY_SERVICE = new InjectionToken<AuditHistoryService>(
  'AUDIT_HISTORY_SERVICE'
);
