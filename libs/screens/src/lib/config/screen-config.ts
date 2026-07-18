import { SortDirectionEnum } from '../entities/search.entity';
import type { EfDatePresetKey } from '../entities/date-range.entity';

export interface DefaultSort {
  field: string;
  direction: SortDirectionEnum;
}

export interface LoadOptions {
  bypassCache?: boolean;
  ttl?: number;
  forceRefresh?: boolean;
  useSql?: boolean;
}

export abstract class ScreenConfig {
  SCREEN!: string;
  SERVICE!: unknown;

  SEARCH_REFERENTIALS_KEYS!: string[];
  DETAILS_REFERENTIALS_KEYS!: string[];

  SEARCH_STATIC_LISTS: string[] = [];
  DETAILS_STATIC_LISTS: string[] = [];

  INVALIDATE_KEYS_ON_SAVE?: string[];
  REFRESH_ON_SAVE?: boolean;
  REF_DATA_OPTIONS?: LoadOptions;
  DEFAULT_SORT?: DefaultSort;

  /**
   * Backend entity type for the standardized change-history box. When set,
   * AbstractDetailScreenV2 auto-loads the record's audit trail (via the
   * AUDIT_HISTORY_SERVICE token) into its `auditEntries` signal — the screen
   * only needs `<ef-change-history [entries]="auditEntries()" />`. Leave unset
   * to opt out. Must match the backend IAuditable.AuditEntityType (e.g. 'Client').
   */
  AUDIT_ENTITY_TYPE?: string;

  /**
   * Report screens (AbstractReportScreenV2): starting period preset for the
   * screen's ef-datepicker-advanced. Unset → 'last_30_days'.
   */
  DEFAULT_PERIOD?: EfDatePresetKey;

  /**
   * Report screens: translatable static lists preloaded before the first
   * loadAll() — same mechanism as SEARCH_STATIC_LISTS on list screens.
   */
  REPORT_STATIC_LISTS?: string[];
}
