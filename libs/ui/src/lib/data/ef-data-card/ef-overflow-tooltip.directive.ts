import { Directive, ElementRef, inject } from '@angular/core';
import { Tooltip } from 'primeng/tooltip';

/**
 * Feeds a cell's full text to the `ef-tooltip` sitting on the same element,
 * but only when that text is actually clipped.
 *
 * A column wide enough for the longest product description would starve every
 * other column, so the description ellipsises. The operator is then left with
 * a row they cannot read and nothing telling them the rest exists. This gives
 * it back on hover, through the same comptoir-skinned tooltip the rest of the
 * product uses rather than the browser's unstyled `title` bubble.
 *
 * The directive is always attached; what varies is whether it has anything to
 * say. A cell whose text fits gets its tooltip disabled, so hovering a number
 * that is fully visible does not pop a bubble repeating it.
 *
 * Measuring happens on `mouseenter`/`focusin` rather than from a ResizeObserver
 * per cell: a 150-line table is a thousand observers for information nobody
 * needs until a pointer is over one of them, and the tooltip's own show delay
 * leaves ample time to measure.
 *
 * Truncation can happen on the cell or on an element inside it (the order
 * builder ellipsises an inner `.nm` span, not the `td`), so both are checked.
 */
@Directive({
    selector: '[efOverflowTooltip]',
    standalone: true,
    host: {
        '(mouseenter)': 'sync()',
        '(focusin)': 'sync()',
    },
})
export class EfOverflowTooltipDirective {
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    /** Provided by the `efTooltip` host directive on the same element. */
    private readonly tooltip = inject(Tooltip, { self: true, optional: true });

    /** 1px of slack: sub-pixel layout rounding otherwise reads as clipped. */
    private static readonly SLACK = 1;

    protected sync(): void {
        if (!this.tooltip) return;

        const clipped = this.findClipped(this.host.nativeElement);
        const text = clipped ? (clipped.textContent ?? '').trim() : '';

        this.tooltip.disabled = !text;
        if (!text) return;

        this.tooltip.content = text;
        this.tooltip.setOption({ tooltipLabel: text });
    }

    /** The cell itself, or the first descendant whose text is cut off. */
    private findClipped(el: HTMLElement): HTMLElement | null {
        if (this.isClipped(el)) return el;
        for (const child of Array.from(el.querySelectorAll<HTMLElement>('*'))) {
            // A control holds its own value and scrolls by design; a tooltip
            // mirroring it would fight the input rather than help.
            if (child instanceof HTMLInputElement || child instanceof HTMLTextAreaElement) continue;
            if (this.isClipped(child)) return child;
        }
        return null;
    }

    private isClipped(el: HTMLElement): boolean {
        return el.scrollWidth - el.clientWidth > EfOverflowTooltipDirective.SLACK;
    }
}
