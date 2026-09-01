import {
    AfterContentInit,
    booleanAttribute,
    ChangeDetectionStrategy,
    Component,
    ContentChildren,
    ElementRef,
    EventEmitter,
    Input,
    Output,
    QueryList,
    TemplateRef,
    ViewChildren,
    signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { EfTabPanelDirective } from './ef-tab-panel.directive';

/** Visual treatment of the tabset. `'pill'` is the default. */
export type EfTabsVariant = 'pill' | 'underline';

/** Known module slugs whose accent (`var(--m-{slug})`) drives the
 *  active indicator and count tint when `variant === 'underline'`. */
export type EfTabsModule =
    | 'sales'
    | 'purchase'
    | 'stock'
    | 'pos'
    | 'marketing'
    | 'store'
    | 'finance'
    | 'admin';

export interface EfTabItem<T = string> {
    value: T;
    /** Direct label (not translated). */
    label?: string;
    /** Translation key — takes priority over `label`. */
    labelKey?: string;
    /** PrimeIcons class string, e.g. `'pi pi-th-large'`. Rendered
     *  before the label, muted when idle. */
    icon?: string;
    /** Optional count rendered after the label in a mono badge. */
    count?: number;
    /** Show a dirty/unread dot after the label/count. */
    dirty?: boolean;
    disabled?: boolean;
}

/**
 * Comptoir tabset. Pilots the visible *view* on a detail screen
 * (Identité / Médias / Variantes / SEO / Activité…). Defaults to the
 * pill variant — chunky toggle suited for sub-modes (Editor / Preview,
 * Day / Week) — with `'underline'` available for fiche-wide navigation
 * where the active tab adopts the module accent.
 *
 * Two consumer surfaces, mirroring `<ef-data-card>`:
 *
 * 1. **Tablist only** — no panels projected. The component renders
 *    the tab strip and emits `valueChange` ; the consumer owns panel
 *    rendering via `@switch` / `@if`.
 *
 * ```html
 * <ef-tabs [items]="sections" [(value)]="active" />
 * @switch (active) {
 *   @case ('identity') { <product-identity /> }
 *   @case ('media')    { <product-media /> }
 * }
 * ```
 *
 * 2. **Tabs + projected panels** — `<ng-template efTabPanel="…">`
 *    blocks declare the body of each tab. The component shows the one
 *    whose `efTabPanel` matches the active value.
 *
 * ```html
 * <ef-tabs [items]="sections" [(value)]="active" variant="underline" module="store">
 *   <ng-template efTabPanel="identity"><product-identity /></ng-template>
 *   <ng-template efTabPanel="media"><product-media /></ng-template>
 * </ef-tabs>
 * ```
 *
 * For filter toggles over result sets (Toutes / Pending / Shipped),
 * prefer `<ef-pill-group>` — it shares the pill look but stays scoped
 * to filter selection rather than view switching.
 */
@Component({
    selector: 'ef-tabs',
    standalone: true,
    templateUrl: './ef-tabs.component.html',
    styleUrl: './ef-tabs.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, TranslateModule],
    host: {
        '[class.ef-tabs--pill]': "variant === 'pill'",
        '[class.ef-tabs--underline]': "variant === 'underline'",
        '[class.ef-tabs--overflow]': 'overflow',
        '[attr.data-module]': 'module ?? null',
    },
})
export class EfTabsComponent<T = string> implements AfterContentInit {
    @Input({ required: true }) items: ReadonlyArray<EfTabItem<T>> = [];
    /** Currently-selected tab value. When no `*efTabPanel` templates
     *  are projected, panel rendering is the consumer's job (typically
     *  via `@switch (active)` in the template). */
    @Input() value: T | null = null;

    /** Visual variant. `'pill'` (default) is the segmented toggle ;
     *  `'underline'` draws a 2px indicator under the active tab. */
    @Input() variant: EfTabsVariant = 'pill';

    /** Forces the module accent on the active indicator + count tint
     *  (only meaningful for `variant='underline'`). When omitted, the
     *  underline inherits `--module` from the closest `[data-module]`
     *  ancestor (and falls back to `--ink-active`). */
    @Input() module?: EfTabsModule;

    /** Show edge fades when the tablist overflows horizontally. The
     *  list itself always scrolls — tabs are never collapsed into a
     *  menu. */
    @Input({ transform: booleanAttribute }) overflow = false;

    /** Hide count badges even when items provide them. */
    @Input({ transform: booleanAttribute }) hideCounts = false;

    @Input() ariaLabel = 'tabs';

    /** Translation key used as the `aria-label` of the dirty dot.
     *  Defaults to `'common.dirty'` — apps add the matching entry to
     *  `fr.json` / `ar.json`. */
    @Input() dirtyLabelKey = 'common.dirty';

    @Output() readonly valueChange = new EventEmitter<T>();

    @ViewChildren('tabEl') private tabEls?: QueryList<ElementRef<HTMLButtonElement>>;

    /* ── Content children (optional projected panels) ────────────── */

    @ContentChildren(EfTabPanelDirective)
    private readonly panels!: QueryList<EfTabPanelDirective>;

    private readonly panelMap = signal<Map<string, TemplateRef<unknown>>>(new Map());

    /** Active panel template for the current `value`, or `null` when
     *  no template matches (incl. tablist-only mode). Read by the
     *  template via `ngTemplateOutlet`. */
    activePanel(): TemplateRef<unknown> | null {
        const v = this.value;
        if (v === null || v === undefined) return null;
        return this.panelMap().get(String(v)) ?? null;
    }

    /** `true` when at least one `*efTabPanel` template has been
     *  projected — toggles the panel rendering slot in the template. */
    hasPanels(): boolean {
        return this.panelMap().size > 0;
    }

    ngAfterContentInit(): void {
        this.panelMap.set(toPanelMap(this.panels));
        this.panels.changes.subscribe(() => this.panelMap.set(toPanelMap(this.panels)));
    }

    select(item: EfTabItem<T>): void {
        if (item.disabled) return;
        if (this.value !== item.value) {
            this.value = item.value;
            this.valueChange.emit(item.value);
        }
    }

    onKeydown(event: KeyboardEvent, index: number): void {
        const all = this.items;
        if (all.length === 0) return;

        // Build the cyclic list of enabled positions and locate the current one.
        const enabledPositions: number[] = [];
        for (let i = 0; i < all.length; i++) {
            if (!all[i].disabled) enabledPositions.push(i);
        }
        if (enabledPositions.length === 0) return;

        const here = enabledPositions.indexOf(index);
        let nextPos = -1;

        switch (event.key) {
            case 'ArrowRight':
                nextPos = enabledPositions[(here + 1) % enabledPositions.length];
                break;
            case 'ArrowLeft':
                nextPos =
                    enabledPositions[(here - 1 + enabledPositions.length) % enabledPositions.length];
                break;
            case 'Home':
                nextPos = enabledPositions[0];
                break;
            case 'End':
                nextPos = enabledPositions[enabledPositions.length - 1];
                break;
            default:
                return;
        }

        event.preventDefault();
        const target = all[nextPos];
        this.select(target);
        // Focus follows selection — the WAI-ARIA "tabs with automatic
        // activation" pattern, mirrored from the prototype.
        const el = this.tabEls?.toArray()[nextPos]?.nativeElement;
        el?.focus();
    }

    trackValue(_: number, item: EfTabItem<T>): T {
        return item.value;
    }
}

function toPanelMap(
    panels: QueryList<EfTabPanelDirective>,
): Map<string, TemplateRef<unknown>> {
    const map = new Map<string, TemplateRef<unknown>>();
    panels.forEach(p => map.set(p.value, p.templateRef));
    return map;
}
