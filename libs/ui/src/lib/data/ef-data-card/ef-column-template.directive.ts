import { Directive, Input, TemplateRef, inject } from '@angular/core';

/**
 * Marks an `<ng-template>` as the body cell renderer for a given
 * column id on `<ef-data-card>`.
 *
 * ```html
 * <ng-template efColumnTemplate="status" let-row let-col="col">
 *   <span class="chip" [class]="'chip chip-' + row.status">…</span>
 * </ng-template>
 * ```
 *
 * Context:
 *   - `$implicit` — the row data
 *   - `col` — the column config (`EfDataCardColumn`)
 *   - `index` — the row index in the current page
 */
@Directive({
    selector: '[efColumnTemplate]',
    standalone: true,
})
export class EfColumnTemplateDirective {
    readonly templateRef = inject<TemplateRef<unknown>>(TemplateRef);

    @Input({ alias: 'efColumnTemplate', required: true })
    columnId!: string;
}

/**
 * Marks an `<ng-template>` as the **header** cell renderer for a
 * given column id. Use this when the header needs richer markup
 * than a translated string (e.g. a select-all checkbox).
 *
 * ```html
 * <ng-template efColumnHeaderTemplate="select">
 *   <input type="checkbox" class="cb"
 *     [checked]="allSelected()" (change)="toggleAll()" />
 * </ng-template>
 * ```
 */
@Directive({
    selector: '[efColumnHeaderTemplate]',
    standalone: true,
})
export class EfColumnHeaderTemplateDirective {
    readonly templateRef = inject<TemplateRef<unknown>>(TemplateRef);

    @Input({ alias: 'efColumnHeaderTemplate', required: true })
    columnId!: string;
}
