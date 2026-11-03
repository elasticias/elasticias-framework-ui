/**
 * Where the date picker's panel goes, in viewport (position: fixed) pixels.
 *
 * Pure so the decision can be tested without a layout engine. The rules,
 * in order:
 * - Block axis: open below the trigger when the panel fits there, else
 *   above when it fits there, else on the roomier side with `maxHeight`
 *   capped to that room (the panel then scrolls inside itself). It never
 *   runs past the viewport, which is what grew the page below the shell.
 * - Inline axis: the panel's inline start meets the trigger's inline start
 *   (the physical left in LTR, the right in RTL). If that would cross the
 *   viewport's far edge, it meets the trigger's inline end instead, and in
 *   any case it is shifted back inside the viewport.
 * - Above the trigger the panel is anchored by `bottom`, so a height change
 *   (the month grid is shorter than the day grid) grows it upward, away
 *   from the field, instead of over it.
 */
export interface EfDpRect {
    readonly top: number;
    readonly bottom: number;
    readonly left: number;
    readonly right: number;
}

export interface EfDpPlacementInput {
    /** The trigger's viewport rect. */
    readonly anchor: EfDpRect;
    /** The panel's natural (uncapped) size. */
    readonly panel: { readonly width: number; readonly height: number };
    /** The fixed containing block: the viewport without its scrollbars. */
    readonly viewport: { readonly width: number; readonly height: number };
    readonly rtl: boolean;
    /** Space between trigger and panel. */
    readonly gap?: number;
    /** Space kept between the panel and the viewport edges. */
    readonly margin?: number;
}

export interface EfDpPlacement {
    readonly side: 'below' | 'above';
    /** Set when `side` is `below`, else null. */
    readonly top: number | null;
    /** Set when `side` is `above` (distance from the viewport bottom), else null. */
    readonly bottom: number | null;
    /** Physical left edge, already kept inside the viewport. */
    readonly left: number;
    /** Height cap, so the panel scrolls inside rather than off screen. */
    readonly maxHeight: number;
}

/** Below this the panel is too short to use; it takes the space anyway. */
const MIN_USABLE_HEIGHT = 160;

export function placeDpPanel(input: EfDpPlacementInput): EfDpPlacement {
    const gap = input.gap ?? 8;
    const margin = input.margin ?? 8;
    const { anchor, panel, viewport, rtl } = input;

    // ── Block axis ──
    const roomBelow = viewport.height - anchor.bottom - gap - margin;
    const roomAbove = anchor.top - gap - margin;
    let side: 'below' | 'above';
    if (panel.height <= roomBelow) side = 'below';
    else if (panel.height <= roomAbove) side = 'above';
    else side = roomAbove > roomBelow ? 'above' : 'below';
    const room = side === 'below' ? roomBelow : roomAbove;
    const maxHeight = Math.max(Math.floor(room), MIN_USABLE_HEIGHT);

    // ── Inline axis ──
    const width = Math.min(panel.width, viewport.width - 2 * margin);
    const startAligned = rtl ? anchor.right - width : anchor.left;
    const endAligned = rtl ? anchor.left : anchor.right - width;
    const fits = (left: number) => left >= margin && left + width <= viewport.width - margin;
    let left = fits(startAligned) ? startAligned : endAligned;
    left = Math.min(Math.max(left, margin), Math.max(margin, viewport.width - margin - width));

    return {
        side,
        top: side === 'below' ? Math.round(anchor.bottom + gap) : null,
        bottom: side === 'above' ? Math.round(viewport.height - anchor.top + gap) : null,
        left: Math.round(left),
        maxHeight,
    };
}
