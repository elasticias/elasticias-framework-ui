import {
  Component,
  inject,
  Injector,
  OnInit,
  signal,
} from '@angular/core';
import { Permissions } from '@elasticias/types';
import { AbstractScreenComponent } from './abstract-screen.component';

/**
 * Signal-first base for SUB-screens — self-contained fragments embedded
 * inside a host screen (dashboard strips, side panels, …) rather than
 * routed on their own. The V2 counterpart to the legacy
 * {@link AbstractSubScreenComponent}.
 *
 * A sub-screen typically borrows ANOTHER screen's identity: its config
 * sets `SCREEN` to the code whose grants gate the data it shows (e.g. a
 * recent-orders strip on the sales dashboard uses `'SalesOrders'`), so
 * `canRead()` and `ScreenContext` permissions line up with the backend
 * seed without any cross-screen plumbing in the component.
 *
 * `ScreenConfig` surface (same fields as list screens, reused here):
 * - `SCREEN` — screen code whose grants apply to this fragment
 * - `SERVICE` — NSwag client resolved into `serviceInstance`
 * - `SEARCH_REFERENTIALS_KEYS` / `SEARCH_STATIC_LISTS` — ref-data the
 *   fragment's columns/labels need; loaded on init, `refDataLoaded$`
 *   fires when ready (reference columns resolve reactively, so data
 *   fetches don't have to wait for it)
 *
 * No criteria caching, no routing, no toolbar — a sub-screen renders one
 * `ef-card` (or similar) and owns only its data + collapse state.
 */
@Component({ template: '', standalone: true })
export abstract class AbstractSubScreenV2
  extends AbstractScreenComponent
  implements OnInit
{
  protected readonly screenState = null;
  protected readonly injector = inject(Injector);

  /** NSwag client resolved from `ScreenConfig.SERVICE` (null-safe: a
   *  sub-screen fed entirely by inputs may omit SERVICE). */
  protected serviceInstance: any;

  /**
   * Collapse state, bound `[(collapsed)]` on the sub-screen's `ef-card`.
   * Starts collapsed: sub-screens are secondary content on their host
   * screen, so they open on demand. Subclasses that must start open set
   * `this.collapsed.set(false)` in their constructor.
   */
  readonly collapsed = signal(true);

  toggleCollapsed(): void {
    this.collapsed.update((c) => !c);
  }

  /** Read grant on the config's `SCREEN` — gate the whole fragment on
   *  this so an unauthorized user gets nothing (not an erroring card). */
  canRead(): boolean {
    return this.context?.isGranted(Permissions.Read) ?? false;
  }

  override ngOnInit(): void {
    super.ngOnInit();
    const cfg = this.getConfig();
    if (cfg?.SERVICE) {
      this.serviceInstance = this.injector.get(cfg.SERVICE as any);
    }

    const hasDynamicRefs = (cfg?.SEARCH_REFERENTIALS_KEYS?.length ?? 0) > 0;
    const hasStaticLists = (cfg?.SEARCH_STATIC_LISTS?.length ?? 0) > 0;
    if (hasDynamicRefs) this.initializeReferenceKeys(cfg.SEARCH_REFERENTIALS_KEYS);
    if (hasStaticLists) this.initializeStaticLists(cfg.SEARCH_STATIC_LISTS);
    // No refs declared → no load, and (matching AbstractSearchScreenV2)
    // no refDataLoaded$ emission — don't wait on it in that case.
    if (hasDynamicRefs || hasStaticLists) {
      this.loadReferenceData(cfg.REF_DATA_OPTIONS);
    }
  }

}
