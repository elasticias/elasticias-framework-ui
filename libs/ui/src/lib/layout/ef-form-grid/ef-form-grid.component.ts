import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * 12-column form-grid primitive. Children use `.col-1` through
 * `.col-12` to claim spans; at 767px and below (the shell's own
 * mobile breakpoint) every span collapses to the full 12, so a
 * field never carries a per-breakpoint span of its own.
 *
 * ```html
 * <ef-form-grid>
 *   <div class="col-6 ef-field">
 *     <label>Client</label>
 *     <ef-select … />
 *   </div>
 *   <div class="col-3 ef-field">
 *     <label>Date</label>
 *     <ef-datepicker … />
 *   </div>
 *   <div class="col-3 ef-field">
 *     <label>Total</label>
 *     <span class="read strong">12 350,00 MAD</span>
 *   </div>
 * </ef-form-grid>
 * ```
 */
@Component({
    selector: 'ef-form-grid',
    standalone: true,
    template: '<ng-content></ng-content>',
    host: { class: 'ef-form-grid' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfFormGridComponent {}
