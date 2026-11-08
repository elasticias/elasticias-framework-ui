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
   * Bind `[entityType]="auditEntityType()"` too for the entity's own
   * `audit_field_<entity>_<field>` labels (`EmailTemplate` gives `email_template`).
   */
  AUDIT_ENTITY_TYPE?: string;

  /**
   * Detail screens: translate raw values in the change-history box. Maps an
   * audited field path to the static reference list holding its codes, e.g.
   * `{ status: 'boutique_order_status' }` (key `status` also covers the
   * from/to of status-change entries). The lists are loaded with the screen
   * (no need to repeat them in DETAILS_STATIC_LISTS); bind
   * `<ef-change-history [entries]="auditEntries()" [valueLists]="auditValueLists()" />`.
   * Unset keeps raw values.
   */
  AUDIT_VALUE_LISTS?: Record<string, string>;

  /**
   * Detail screens: business-rule codes (422 `ruleCode`) meaning "the record
   * changed since you loaded it", e.g. ERP `['BR_SO_0123']`. A failed update
   * with one of them offers a "reload" confirm; accepting
   * reloads the record and drops the unsaved edits. The app must define the
   * i18n keys `ef_stale_reload` (button), `ef_stale_reload_confirm` (message,
   * say that unsaved edits are lost) and `ef_stale_reload_header`.
   */
  STALE_RULE_CODES?: string[];

  /**
   * Detail screens: after a successful in-place update (not a create or
   * duplicate) refresh the record, so server-owned fields such as a
   * concurrency revision are current for the next save. Uses the update
   * response when it is the saved record (an object whose `id` is the
   * screen's entity id), otherwise one `get(id)`. Change history reloads
   * either way. Default false: the record is left as edited.
   */
  RELOAD_AFTER_SAVE?: boolean;

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
