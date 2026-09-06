import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { PersistedState, PersistedStateOptions } from '@elasticias/utils';
import { Subject } from 'rxjs';

@Component({ template: '' })
export abstract class AbstractComponent implements OnInit, OnDestroy {
  @Input() readOnly = false;
  protected destroyed$ = new Subject<void>();

  abstract ngOnInit(): void;
  abstract ngOnDestroy(): void;

  /**
   * Declare a piece of this component's state that should survive a page
   * refresh — an active period, a chosen tab, a collapsed rail.
   *
   * Nothing is read or written until the returned handle is used, so
   * calling this costs nothing and adds no storage dependency to
   * components that never touch it. Keep the key stable across releases
   * and namespaced to the screen, and pass `revive` for any shape holding
   * a `Date`: JSON hands those back as strings.
   *
   * ```ts
   * private readonly rail = this.persisted<boolean>('SALES_RAIL_OPEN');
   * ngOnInit() { this.open.set(this.rail.read() ?? true); }
   * ```
   */
  protected persisted<T>(key: string, options?: PersistedStateOptions<T>): PersistedState<T> {
    return new PersistedState<T>(key, options);
  }
}
