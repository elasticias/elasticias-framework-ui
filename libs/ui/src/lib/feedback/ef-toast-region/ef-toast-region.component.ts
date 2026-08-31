import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  booleanAttribute,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { EfToast, EfToastAction, EfToastService } from '@elasticias/core';

/**
 * Available anchor positions for the toast region.
 */
export type EfToastRegionPosition =
  | 'top-right'
  | 'top-left'
  | 'top-center'
  | 'bottom-right'
  | 'bottom-left'
  | 'bottom-center';

/**
 * Comptoir toast region — V2 successor to PrimeNG `<p-toast>`.
 *
 * Mounts once at the app root (or any layout shell) and renders the
 * live `EfToastService.toasts` queue. Auto-dismiss timers + manual
 * close button + optional inline action buttons. Severity styling
 * comes from the `.toast.<severity>` rules in `_patterns.scss`,
 * mapped 1:1 to the Comptoir status spectrum.
 *
 * ```html
 * <!-- App root -->
 * <ef-toast-region position="bottom-right" />
 * ```
 */
@Component({
  selector: 'ef-toast-region',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './ef-toast-region.component.html',
  styleUrl: './ef-toast-region.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfToastRegionComponent {
  private readonly toastService = inject(EfToastService);
  private readonly destroyRef = inject(DestroyRef);

  /** Anchor position. Default: bottom-right. */
  readonly position = input<EfToastRegionPosition>('bottom-right');

  /** Cap the visible stack — older toasts get auto-dismissed. */
  readonly maxStack = input<number>(5);

  /** Hide the bottom progress bar across all toasts. */
  readonly hideProgress = input(false, { transform: booleanAttribute });

  /** Toasts currently mid-exit-animation (kept around for the
   *  duration of the CSS transition before being removed from DOM). */
  readonly exiting = signal<ReadonlySet<number>>(new Set());

  /** Live queue from the service — direct read so the template
   *  re-renders when a toast is pushed or dismissed. */
  readonly toasts = this.toastService.toasts;

  /** Per-toast lifespan timers (manual setTimeout — robust against
   *  Angular zoneless mode and visible across HMR reloads). */
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  constructor() {
    // Whenever the queue changes, schedule auto-dismiss timers for
    // newly added toasts and trim the stack to maxStack.
    effect(() => {
      const list = this.toasts();
      untracked(() => this.syncTimers(list));
      untracked(() => this.enforceMaxStack(list));
    });

    this.destroyRef.onDestroy(() => {
      for (const t of this.timers.values()) clearTimeout(t);
      this.timers.clear();
    });
  }

  /* ── Class plumbing ────────────────────────────────────────── */

  severityClass(t: EfToast): string {
    return `toast ${t.severity}` + (this.exiting().has(t.id) ? ' out' : '');
  }

  iconClass(t: EfToast): string {
    switch (t.severity) {
      case 'success':
        return 'pi pi-check';
      case 'warn':
        return 'pi pi-exclamation-triangle';
      case 'error':
        return 'pi pi-times';
      case 'info':
      default:
        return 'pi pi-info-circle';
    }
  }

  progressStyle(t: EfToast): { [k: string]: string } | null {
    if (t.life <= 0) return null;
    return { '--toast-life': `${t.life}ms` };
  }

  /* ── Interactions ──────────────────────────────────────────── */

  onClose(t: EfToast): void {
    this.beginExit(t.id);
  }

  onActionClick(t: EfToast, action: EfToastAction): void {
    action.command?.();
    if (action.dismissOnClick !== false) this.beginExit(t.id);
  }

  trackById = (_: number, t: EfToast): number => t.id;

  /* ── Internals ─────────────────────────────────────────────── */

  private syncTimers(list: ReadonlyArray<EfToast>): void {
    const visibleIds = new Set(list.map((t) => t.id));

    // Drop timers for toasts no longer in the queue.
    for (const [id, handle] of this.timers) {
      if (!visibleIds.has(id)) {
        clearTimeout(handle);
        this.timers.delete(id);
      }
    }

    // Schedule timers for new toasts (skip sticky `life: 0`).
    for (const t of list) {
      if (this.timers.has(t.id) || t.life <= 0) continue;
      const handle = setTimeout(() => this.beginExit(t.id), t.life);
      this.timers.set(t.id, handle);
    }
  }

  private enforceMaxStack(list: ReadonlyArray<EfToast>): void {
    const cap = this.maxStack();
    if (cap <= 0) return;
    const overflow = list.length - cap;
    if (overflow <= 0) return;
    // Drop oldest entries first.
    for (let i = 0; i < overflow; i++) {
      this.beginExit(list[i].id);
    }
  }

  /** Mark the toast as exiting → wait for the CSS animation → tell
   *  the service to remove it. Keeps the DOM around for the
   *  out-animation duration. */
  private beginExit(id: number): void {
    if (this.exiting().has(id)) return;
    this.exiting.update((set) => {
      const next = new Set(set);
      next.add(id);
      return next;
    });
    const handle = this.timers.get(id);
    if (handle) {
      clearTimeout(handle);
      this.timers.delete(id);
    }
    // 260ms matches `--t-base`; wait one frame longer to be safe.
    setTimeout(() => {
      this.exiting.update((set) => {
        const next = new Set(set);
        next.delete(id);
        return next;
      });
      this.toastService.dismiss(id);
    }, 280);
  }
}
