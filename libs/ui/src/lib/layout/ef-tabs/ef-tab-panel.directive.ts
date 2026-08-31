import { Directive, Input, TemplateRef, inject } from '@angular/core';

/**
 * Marks an `<ng-template>` as the panel renderer for a tab value on
 * `<ef-tabs>`. When at least one panel template is projected,
 * `ef-tabs` renders the matching one below the tablist. When none is
 * projected, the component stays a tablist only — the consumer owns
 * panel rendering via `@switch` / `@if` on the active value.
 *
 * ```html
 * <ef-tabs [items]="sections" [(value)]="active">
 *   <ng-template efTabPanel="identity">
 *     <product-identity />
 *   </ng-template>
 *   <ng-template efTabPanel="media">
 *     <product-media />
 *   </ng-template>
 * </ef-tabs>
 * ```
 *
 * The input value must match one of the `EfTabItem.value` entries the
 * tabset is driven by.
 */
@Directive({
    selector: '[efTabPanel]',
    standalone: true,
})
export class EfTabPanelDirective {
    readonly templateRef = inject<TemplateRef<unknown>>(TemplateRef);

    @Input({ alias: 'efTabPanel', required: true })
    value!: string;
}
