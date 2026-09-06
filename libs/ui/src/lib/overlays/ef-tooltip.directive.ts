import { Directive } from '@angular/core';
import { Tooltip } from 'primeng/tooltip';

/**
 * Comptoir-skinned tooltip.
 *
 * `ef-button` already drives PrimeNG's tooltip through its `tooltipKey`
 * input, so this composes the same directive rather than introducing a
 * second tooltip with its own positioning and its own bugs. It contributes
 * the `ef-*` name the house style asks for and nothing else; the look comes
 * from the `.p-tooltip` rules in `_patterns.scss`, which means every tooltip
 * in the app — this one and `ef-button`'s — reads the same.
 *
 * Text is a plain input, so translate at the call site:
 *
 * ```html
 * <span [efTooltip]="'module_sales_hint' | translate" efTooltipPosition="top"></span>
 * ```
 */
@Directive({
    selector: '[efTooltip]',
    standalone: true,
    hostDirectives: [
        {
            directive: Tooltip,
            inputs: [
                'pTooltip: efTooltip',
                'tooltipPosition: efTooltipPosition',
                'tooltipDisabled: efTooltipDisabled',
                'tooltipStyleClass: efTooltipStyleClass',
                'tooltipEvent: efTooltipEvent',
                'showDelay: efTooltipShowDelay',
                'hideDelay: efTooltipHideDelay',
                'appendTo: efTooltipAppendTo',
                'autoHide: efTooltipAutoHide',
                'escape: efTooltipEscape',
                'life: efTooltipLife',
            ],
        },
    ],
})
export class EfTooltipDirective {}
