import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    afterNextRender,
    booleanAttribute,
    computed,
    contentChildren,
    effect,
    inject,
    input,
    output,
    signal,
    untracked,
    viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { EfViewportService } from '@elasticias/core';
import { SCREEN_REF_DATA_SERVICE, ScreenReferenceDataService } from '@elasticias/screens';
import { EfStatusColor, EfStatusReferenceItem, resolveEfStatusColor } from '../../feedback/ef-status-chip/ef-status-chip.types';
import { EfSectionDirective } from './ef-section.directive';

/** How the nav renders: a sticky column beside the content (desktop) or a sticky chip bar above it. */
export type EfSectionNavMode = 'rail' | 'bar';

/** One nav item, as the template renders it. */
export interface EfSectionNavItem {
    id: string;
    domId: string;
    labelKey: string;
    icon: string;
    status: EfSectionNavStatus | null;
}

/** A section's one-line state: a translation key (with params) or an already translated text, and a tone. */
export interface EfSectionNavStatus {
    key?: string;
    params?: Record<string, unknown> | null;
    text?: string;
    color: EfStatusColor;
}

/** How long a click keeps the scrollspy quiet when the browser never fires `scrollend`. */
const CLICK_LOCK_MS = 1000;
/** How long a URL fragment keeps re-aiming at its section while the screen's data loads. */
const HASH_SETTLE_MS = 3000;

/**
 * Section navigation for long configuration screens, with scrollspy.
 *
 * Wrap the screen's sections and mark each one with `efSection`; the nav
 * lists them in document order. Clicking an item scrolls its section under
 * the sticky detail toolbar (smoothly, or instantly under
 * `prefers-reduced-motion`) and moves focus to it; scrolling highlights the
 * section being read.
 *
 * ```html
 * <ef-detail-toolbar …>…</ef-detail-toolbar>
 * <ef-section-nav ariaLabelKey="email_settings_sections" updateUrl>
 *   <div class="settings" [efServerErrors]="serverErrors()" [efReadOnly]="!canWrite()">
 *     <ef-card efSection="delivery" titleKey="email_settings_card_delivery"
 *              sectionStatusReference="email_modes" [sectionStatusCode]="savedMode()">…</ef-card>
 *     <ef-card efSection="sender" titleKey="email_settings_card_sender"
 *              [sectionStatusKey]="'email_settings_source_' + source()">…</ef-card>
 *     <ef-change-history efSection="history" sectionLabelKey="audit_history_title" … />
 *   </div>
 * </ef-section-nav>
 * ```
 *
 * Layout (from `EfViewportService`): desktop (≥1280px) puts the list in a
 * sticky column at the inline end of the content; tablet and phone put it in
 * a sticky, horizontally scrolling chip bar welded under the toolbar, the
 * active chip kept in view. The sections should read as one column: two
 * side by side share a scroll position and the highlight becomes arbitrary.
 *
 * Scroll container: the closest `.ef-app-main__content` (the shell's
 * scroller), else the nearest scrolling ancestor, else the viewport. The
 * offset is measured from the sticky element matching `stickySelector`
 * inside it (the detail toolbar by default), so a title never lands under it.
 */
@Component({
    selector: 'ef-section-nav',
    standalone: true,
    imports: [TranslateModule],
    templateUrl: './ef-section-nav.component.html',
    styleUrl: './ef-section-nav.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'ef-section-nav',
        '[class.ef-section-nav--rail]': "mode() === 'rail'",
        '[class.ef-section-nav--bar]': "mode() === 'bar'",
        '[class.ef-section-nav--phone]': 'viewport.isMobile()',
        '[style.--ef-section-nav-top.px]': 'stickyTop()',
    },
})
export class EfSectionNavComponent {
    protected readonly viewport = inject(EfViewportService);
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private readonly document = inject(DOCUMENT);
    private readonly destroyRef = inject(DestroyRef);
    private readonly refData = inject<ScreenReferenceDataService | null>(SCREEN_REF_DATA_SERVICE, { optional: true });

    /** Translation key of the nav's accessible name (and its heading in the desktop column). */
    readonly ariaLabelKey = input<string>('section_nav_label');
    /** Keep the URL fragment on the active section (`#delivery`), so a link opens on it. */
    readonly updateUrl = input(false, { transform: booleanAttribute });
    /** Breathing room (px) between the sticky chrome and a section scrolled into place. */
    readonly offset = input(12);
    /** The sticky chrome a section must clear, looked up inside the scroll container. */
    readonly stickySelector = input('.detail-toolbar');

    /** Emits the id of the section that became active (by scroll or click). */
    readonly activeChange = output<string>();

    readonly sections = contentChildren(EfSectionDirective, { descendants: true });

    /** Id of the highlighted section. */
    readonly active = signal<string | null>(null);

    readonly mode = computed<EfSectionNavMode>(() => (this.viewport.isDesktop() ? 'rail' : 'bar'));

    readonly items = computed<EfSectionNavItem[]>(() =>
        this.sections().map((s) => ({
            id: s.id(),
            domId: s.domId(),
            labelKey: s.resolvedLabelKey(),
            icon: s.sectionIcon(),
            status: this.statusOf(s),
        })),
    );

    /** CSS `top` (px) that pins the nav right under the sticky chrome. */
    protected readonly stickyTop = signal(0);

    private readonly list = viewChild<ElementRef<HTMLElement>>('list');
    private readonly bar = viewChild<ElementRef<HTMLElement>>('nav');
    private readonly end = viewChild<ElementRef<HTMLElement>>('end');

    private root: HTMLElement | null = null;
    private chrome: HTMLElement | null = null;
    private spy: IntersectionObserver | null = null;
    private endSpy: IntersectionObserver | null = null;
    private resize: ResizeObserver | null = null;
    private ready = false;

    /** True while a click-driven scroll runs: passing sections must not take the highlight. */
    private locked = false;
    private unlock: (() => void) | null = null;
    /** Section id from the URL fragment, re-aimed at while the content still moves. */
    private pendingHash: string | null = null;

    constructor() {
        afterNextRender(() => this.setup());

        // New or removed sections (an @if, a @for) are observed as they come.
        effect(() => {
            const list = this.sections();
            untracked(() => {
                if (!this.ready) return;
                this.observeAll(list);
                if (!this.applyPendingHash()) this.recompute();
            });
        });

        // On the chip bar, the active chip stays in view.
        effect(() => {
            const id = this.active();
            const mode = this.mode();
            if (id && mode === 'bar') untracked(() => this.revealChip(id));
        });

        this.destroyRef.onDestroy(() => this.teardown());
    }

    /** Scrolls to a section and highlights it at once; the scrollspy waits until the scroll ends. */
    go(id: string): void {
        const section = this.sections().find((s) => s.id() === id);
        if (!section) return;
        this.pendingHash = null;
        this.setActive(id);
        this.lock();
        this.scrollTo(section.element, this.reducedMotion() ? 'auto' : 'smooth');
        section.element.focus({ preventScroll: true });
    }

    /** Re-reads which section is being read. Called by the observers. */
    recompute(): void {
        if (this.locked) return;
        const list = this.sections();
        if (!list.length) return;
        const m = this.metrics();

        // A short last section never reaches the reading line: at the bottom it is the one read.
        if (m.scrollTop > 0 && m.scrollTop + m.clientHeight >= m.scrollHeight - 2) {
            this.setActive(list[list.length - 1].id());
            return;
        }

        const line = m.top + this.headOffset() + Math.min(120, Math.max(0, m.clientHeight - this.headOffset()) * 0.25);
        let current = list[0].id();
        for (const s of list) {
            if (s.element.getBoundingClientRect().top <= line) current = s.id();
        }
        this.setActive(current);
    }

    protected isActive(id: string): boolean {
        return this.active() === id;
    }

    /** Status tone as a colour: the status-chip foreground, so chips and nav tell one story. */
    protected colorVar(color: EfStatusColor): string {
        switch (color) {
            case 'neutral':
                return 'var(--text-mute)';
            case 'tenant':
                return 'var(--tenant-500)';
            case 'module':
                return 'var(--module, var(--ink-active))';
            default:
                return `var(--st-${color}-fg)`;
        }
    }

    /* ── Setup ─────────────────────────────────────────────────── */

    private setup(): void {
        const win = this.document.defaultView;
        this.root = this.findRoot();
        this.chrome = (this.root ?? this.document.body).querySelector<HTMLElement>(this.stickySelector());
        this.measureChrome();

        if (win && 'ResizeObserver' in win) {
            this.resize = new ResizeObserver(() => {
                this.measureChrome();
                this.createSpy();
                this.applyPendingHash();
            });
            if (this.chrome) this.resize.observe(this.chrome);
            if (this.root) this.resize.observe(this.root);
            this.resize.observe(this.host);
        }

        this.ready = true;
        this.createSpy();
        this.createEndSpy();

        const target = this.root ?? win;
        const release = () => {
            this.pendingHash = null;
        };
        // A user scroll ends a pending click lock and stops re-aiming at the fragment.
        for (const type of ['wheel', 'touchstart', 'keydown'] as const) {
            target?.addEventListener(type, release, { passive: true });
            this.destroyRef.onDestroy(() => target?.removeEventListener(type, release));
        }

        // A section behind an @if (the history, once data loads) may not exist
        // yet: the fragment waits, and the sections effect aims at it when it comes.
        const hash = win?.location.hash.replace(/^#/, '');
        if (hash) {
            this.pendingHash = hash;
            win?.setTimeout(() => (this.pendingHash = null), HASH_SETTLE_MS);
        }
        if (!this.applyPendingHash()) this.recompute();
    }

    private findRoot(): HTMLElement | null {
        const shell = this.host.closest<HTMLElement>('.ef-app-main__content');
        if (shell) return shell;
        const win = this.document.defaultView;
        for (let el = this.host.parentElement; el && el !== this.document.body; el = el.parentElement) {
            const overflowY = win?.getComputedStyle(el).overflowY;
            if (overflowY === 'auto' || overflowY === 'scroll') return el;
        }
        return null;
    }

    /** The reading band: a one-pixel line under the sticky chrome; a section crossing it fires. */
    private createSpy(): void {
        const win = this.document.defaultView;
        if (!this.ready || !win || !('IntersectionObserver' in win)) return;
        this.spy?.disconnect();
        const m = this.metrics();
        const head = this.headOffset();
        const below = Math.max(0, m.clientHeight - head - 1);
        this.spy = new IntersectionObserver(() => this.recompute(), {
            root: this.root,
            rootMargin: `-${Math.round(head)}px 0px -${Math.round(below)}px 0px`,
            threshold: [0, 1],
        });
        this.observeAll(this.sections());
    }

    /** The end of the content entering view means the bottom is reached. */
    private createEndSpy(): void {
        const win = this.document.defaultView;
        const end = this.end()?.nativeElement;
        if (!win || !end || !('IntersectionObserver' in win)) return;
        this.endSpy = new IntersectionObserver(() => this.recompute(), { root: this.root, threshold: [0, 1] });
        this.endSpy.observe(end);
    }

    private observeAll(list: readonly EfSectionDirective[]): void {
        if (!this.spy) return;
        this.spy.disconnect();
        for (const s of list) this.spy.observe(s.element);
    }

    private teardown(): void {
        this.spy?.disconnect();
        this.endSpy?.disconnect();
        this.resize?.disconnect();
        this.unlock?.();
    }

    /* ── Geometry ──────────────────────────────────────────────── */

    private metrics() {
        const win = this.document.defaultView;
        if (this.root) {
            return {
                top: this.root.getBoundingClientRect().top,
                scrollTop: this.root.scrollTop,
                clientHeight: this.root.clientHeight,
                scrollHeight: this.root.scrollHeight,
            };
        }
        const doc = this.document.documentElement;
        return { top: 0, scrollTop: win?.scrollY ?? 0, clientHeight: win?.innerHeight ?? 0, scrollHeight: doc.scrollHeight };
    }

    /** Height the sticky chrome covers at the top of the scrollport, plus the chip bar and the gap. */
    private headOffset(): number {
        const chrome = this.chrome?.offsetHeight ?? 0;
        const bar = this.mode() === 'bar' ? (this.bar()?.nativeElement.offsetHeight ?? 0) : 0;
        return chrome + bar + this.offset();
    }

    /** The toolbar pins flush at the scrollport top by cancelling the padding (see `.detail-toolbar`); the nav pins under it. */
    private measureChrome(): void {
        const win = this.document.defaultView;
        const padTop = this.root && win ? parseFloat(win.getComputedStyle(this.root).paddingTop) || 0 : 0;
        const height = this.chrome?.offsetHeight ?? 0;
        this.stickyTop.set(Math.max(0, height) - (height ? padTop : 0));
    }

    private scrollTo(el: HTMLElement, behavior: ScrollBehavior): void {
        const m = this.metrics();
        const top = Math.max(0, el.getBoundingClientRect().top - m.top + m.scrollTop - this.headOffset());
        const target = this.root ?? this.document.defaultView;
        if (target && typeof target.scrollTo === 'function') target.scrollTo({ top, behavior });
    }

    /** Aims at the fragment's section if it exists; true when it did. */
    private applyPendingHash(): boolean {
        const id = this.pendingHash;
        if (!id) return false;
        const section = this.sections().find((s) => s.id() === id);
        if (!section) return false;
        this.setActive(id);
        this.scrollTo(section.element, 'auto');
        return true;
    }

    /** Keeps the active chip inside the strip, by scrolling the strip only (never the page). */
    private revealChip(id: string): void {
        const strip = this.list()?.nativeElement;
        const chip = Array.from(strip?.querySelectorAll<HTMLElement>('[data-section]') ?? []).find((c) => c.dataset['section'] === id);
        if (!strip || !chip || typeof strip.scrollBy !== 'function') return;
        const s = strip.getBoundingClientRect();
        const c = chip.getBoundingClientRect();
        const pad = 16;
        const behavior: ScrollBehavior = this.reducedMotion() ? 'auto' : 'smooth';
        // Rect deltas are direction-agnostic, so this holds in RTL whatever scrollLeft's sign.
        if (c.left < s.left + pad) strip.scrollBy({ left: c.left - s.left - pad, behavior });
        else if (c.right > s.right - pad) strip.scrollBy({ left: c.right - s.right + pad, behavior });
    }

    /* ── State ─────────────────────────────────────────────────── */

    private setActive(id: string): void {
        if (this.active() === id) return;
        this.active.set(id);
        this.activeChange.emit(id);
        if (this.updateUrl() && !this.locked) this.writeHash(id);
    }

    /** Freezes the scrollspy until the click's scroll ends (or the user takes over). */
    private lock(): void {
        this.unlock?.();
        this.locked = true;
        const win = this.document.defaultView;
        const target: EventTarget | null = this.root ?? win;
        const release = () => {
            this.locked = false;
            win?.clearTimeout(timer);
            for (const type of ['scrollend', 'wheel', 'touchstart'] as const) target?.removeEventListener(type, release);
            this.unlock = null;
            // No recompute here: at the bottom of the page, the clicked section would lose to the last one.
        };
        const timer = win?.setTimeout(release, CLICK_LOCK_MS);
        for (const type of ['scrollend', 'wheel', 'touchstart'] as const) target?.addEventListener(type, release, { passive: true });
        this.unlock = release;
    }

    private writeHash(id: string): void {
        const win = this.document.defaultView;
        if (!win) return;
        const { pathname, search } = win.location;
        win.history.replaceState(win.history.state, '', `${pathname}${search}#${id}`);
    }

    private reducedMotion(): boolean {
        const win = this.document.defaultView;
        return !!win && typeof win.matchMedia === 'function' && win.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    private statusOf(s: EfSectionDirective): EfSectionNavStatus | null {
        const forced = resolveEfStatusColor(s.sectionStatusColor() ?? '');
        const reference = s.sectionStatusReference();
        const code = s.sectionStatusCode();
        if (reference && code) {
            const entry = this.refData
                ?.getReference(reference)()
                .find((item: EfStatusReferenceItem) => item?.code === code);
            return {
                key: entry?.labelKey || undefined,
                text: entry?.label || (entry?.labelKey ? undefined : code),
                color: forced ?? resolveEfStatusColor(entry?.metadata?.color) ?? resolveEfStatusColor(code) ?? 'neutral',
            };
        }
        const key = s.sectionStatusKey();
        if (key) return { key, params: s.sectionStatusParams(), color: forced ?? 'neutral' };
        return null;
    }
}
