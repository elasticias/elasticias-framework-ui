import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SCREEN_REF_DATA_SERVICE } from '@elasticias/screens';
import { EfCardComponent } from '../ef-card/ef-card.component';
import { EfSectionNavComponent } from './ef-section-nav.component';
import { EfSectionDirective } from './ef-section.directive';

/**
 * jsdom has no IntersectionObserver, lays nothing out and has no scrollTo,
 * so the observer is a recorder whose callback the test fires, the section
 * tops are stubbed rects, and the scroller's scrollTo is a spy.
 */
class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  readonly targets: Element[] = [];
  constructor(
    readonly callback: IntersectionObserverCallback,
    readonly options?: IntersectionObserverInit,
  ) {
    FakeIntersectionObserver.instances.push(this);
  }
  observe(el: Element) { this.targets.push(el); }
  unobserve() { /* unused */ }
  disconnect() { this.targets.length = 0; }
  takeRecords() { return []; }
  fire() { this.callback([], this as unknown as IntersectionObserver); }
}

@Component({
  standalone: true,
  imports: [EfSectionNavComponent, EfSectionDirective, EfCardComponent],
  template: `
    <div class="ef-app-main__content" [attr.dir]="dir()">
      <div class="detail-toolbar">toolbar</div>
      <ef-section-nav ariaLabelKey="nav_label" [updateUrl]="updateUrl()">
        <ef-card efSection="delivery" titleKey="card_delivery"
                 sectionStatusReference="email_modes" [sectionStatusCode]="mode()"></ef-card>
        <section efSection="sender" sectionLabelKey="card_sender" sectionIcon="pi pi-user"
                 [sectionStatusKey]="senderKey()"></section>
        @if (withHistory()) {
          <section efSection="history" sectionLabelKey="card_history"></section>
        }
      </ef-section-nav>
    </div>
  `,
})
class Host {
  readonly dir = signal<'ltr' | 'rtl'>('ltr');
  readonly mode = signal('Send');
  readonly senderKey = signal('source_admin');
  readonly withHistory = signal(true);
  readonly updateUrl = signal(false);
}

const MODES = [
  { code: 'Disabled', label: 'Désactivé', metadata: { color: 'secondary' } },
  { code: 'Send', label: 'Envoi réel', metadata: { color: 'success' } },
];

function setViewport(width: 'phone' | 'tablet' | 'desktop') {
  const matches = (q: string) =>
    (width === 'phone' && q === '(max-width: 767px)') ||
    (width === 'tablet' && q.includes('min-width: 768px')) ||
    (width === 'desktop' && q === '(min-width: 1280px)');
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: matches(q),
    media: q,
    addEventListener() { /* static */ },
    removeEventListener() { /* static */ },
  }));
}

function setup(viewport: 'phone' | 'tablet' | 'desktop' = 'desktop') {
  setViewport(viewport);
  TestBed.configureTestingModule({
    imports: [Host, TranslateModule.forRoot()],
    providers: [
      { provide: SCREEN_REF_DATA_SERVICE, useValue: { getReference: () => signal(MODES) } },
    ],
  });
  const translate = TestBed.inject(TranslateService);
  translate.setTranslation('fr', {
    nav_label: 'Sections',
    card_delivery: 'Envoi',
    card_sender: 'Expéditeur',
    card_history: 'Historique',
    source_admin: 'Défini ici',
    source_none: 'Non configuré',
  });
  translate.use('fr');

  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const root = el.querySelector('.ef-app-main__content') as HTMLElement;
  // A 600px scrollport scrolled a little way into 3000px of content.
  Object.defineProperty(root, 'scrollTop', { value: 100, configurable: true });
  Object.defineProperty(root, 'clientHeight', { value: 600, configurable: true });
  Object.defineProperty(root, 'scrollHeight', { value: 3000, configurable: true });
  const scrollTo = vi.fn();
  root.scrollTo = scrollTo as unknown as typeof root.scrollTo;
  const nav = fixture.debugElement.children[0].children[1].componentInstance as EfSectionNavComponent;

  /** Section tops relative to the viewport; the scroller's top is 0. */
  const place = (tops: Record<string, number>) => {
    for (const [id, top] of Object.entries(tops)) {
      const section = el.querySelector(`[data-ef-section="${id}"]`) as HTMLElement;
      section.getBoundingClientRect = () => ({ top, bottom: top + 300, left: 0, right: 800, width: 800, height: 300, x: 0, y: top, toJSON() { return {}; } });
    }
  };
  const spy = () => FakeIntersectionObserver.instances.find((o) => o.targets.some((t) => t.hasAttribute('data-ef-section'))) as FakeIntersectionObserver;
  const item = (id: string) => el.querySelector(`button[data-section="${id}"]`) as HTMLButtonElement;
  return { fixture, el, root, scrollTo, nav, place, spy, item };
}

/** A host whose given section is absent at first render, as a section behind @if (entity().id) is. */
function setupWithoutHistory() {
  setViewport('desktop');
  TestBed.configureTestingModule({
    imports: [Host, TranslateModule.forRoot()],
    providers: [{ provide: SCREEN_REF_DATA_SERVICE, useValue: { getReference: () => signal(MODES) } }],
  });
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.withHistory.set(false);
  fixture.detectChanges();
  return { fixture };
}

beforeEach(() => {
  FakeIntersectionObserver.instances = [];
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  history.replaceState(null, '', '/');
});

describe('ef-section-nav: items', () => {
  it('lists the sections in document order, labelled by key or by the host card title', () => {
    const { el } = setup();
    const labels = Array.from(el.querySelectorAll('.ef-section-nav__label')).map((n) => n.textContent?.trim());
    expect(labels).toEqual(['Envoi', 'Expéditeur', 'Historique']);
  });

  it('names the nav from its aria-label key', () => {
    const { el } = setup();
    expect(el.querySelector('nav')?.getAttribute('aria-label')).toBe('Sections');
  });

  it('gives each section a prefixed id the item controls', () => {
    const { el, item } = setup();
    expect(el.querySelector('#ef-section-sender')).not.toBeNull();
    expect(item('sender').getAttribute('aria-controls')).toBe('ef-section-sender');
  });

  it('reads a reference status like the status chip: label and metadata colour', () => {
    const { el, item } = setup();
    const status = item('delivery').querySelector('.ef-section-nav__status') as HTMLElement;
    expect(status.textContent?.trim()).toBe('Envoi réel');
    expect(status.getAttribute('data-color')).toBe('delivered');
    expect(el.querySelector('[data-section="sender"] .ef-section-nav__status-text')?.textContent?.trim()).toBe('Défini ici');
  });

  it('keeps the state in the button, so it is part of the accessible name', () => {
    const { item } = setup();
    expect(item('sender').textContent?.replace(/\s+/g, ' ').trim()).toBe('Expéditeur Défini ici');
  });

  it('follows a status that changes', () => {
    const { fixture, item } = setup();
    fixture.componentInstance.senderKey.set('source_none');
    fixture.detectChanges();
    expect(item('sender').textContent).toContain('Non configuré');
  });

  it('drops the item of a section that leaves the DOM', () => {
    const { fixture, item } = setup();
    fixture.componentInstance.withHistory.set(false);
    fixture.detectChanges();
    expect(item('history')).toBeNull();
  });
});

describe('ef-section-nav: scrollspy', () => {
  it('observes every section inside the shell scroller', () => {
    const { spy, root } = setup();
    expect(spy().targets.map((t) => t.getAttribute('data-ef-section'))).toEqual(['delivery', 'sender', 'history']);
    expect(spy().options?.root).toBe(root);
  });

  it('highlights the last section whose top passed the reading line', () => {
    const { fixture, place, spy, item } = setup();
    place({ delivery: -400, sender: 30, history: 600 });
    spy().fire();
    fixture.detectChanges();
    expect(item('sender').getAttribute('aria-current')).toBe('true');
    expect(item('delivery').getAttribute('aria-current')).toBeNull();
  });

  it('moves the highlight back up when scrolling up', () => {
    const { fixture, place, spy, item } = setup();
    place({ delivery: -400, sender: 30, history: 600 });
    spy().fire();
    place({ delivery: 10, sender: 400, history: 900 });
    spy().fire();
    fixture.detectChanges();
    expect(item('delivery').getAttribute('aria-current')).toBe('true');
  });

  it('gives the bottom of the page to the last section, short as it may be', () => {
    const { fixture, root, place, spy, item } = setup();
    Object.defineProperty(root, 'scrollTop', { value: 500, configurable: true });
    Object.defineProperty(root, 'clientHeight', { value: 600, configurable: true });
    Object.defineProperty(root, 'scrollHeight', { value: 1100, configurable: true });
    place({ delivery: -500, sender: -100, history: 400 });
    spy().fire();
    fixture.detectChanges();
    expect(item('history').getAttribute('aria-current')).toBe('true');
  });

  it('emits activeChange', () => {
    const { nav, place, spy } = setup();
    const seen: string[] = [];
    nav.activeChange.subscribe((id) => seen.push(id));
    place({ delivery: -400, sender: 30, history: 600 });
    spy().fire();
    expect(seen).toEqual(['sender']);
  });
});

describe('ef-section-nav: click', () => {
  it('scrolls the section under the toolbar and highlights it at once', () => {
    const { fixture, place, scrollTo, item, el } = setup();
    place({ delivery: 0, sender: 500, history: 900 });
    item('history').click();
    fixture.detectChanges();
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo.mock.calls[0][0]).toMatchObject({ top: 900 + 100 - 12, behavior: 'smooth' });
    expect(item('history').getAttribute('aria-current')).toBe('true');
    expect(document.activeElement).toBe(el.querySelector('[data-ef-section="history"]'));
  });

  it('does not let the sections the scroll passes take the highlight', () => {
    const { fixture, place, spy, item } = setup();
    place({ delivery: 0, sender: 500, history: 900 });
    item('history').click();
    place({ delivery: -300, sender: 20, history: 400 });
    spy().fire();
    fixture.detectChanges();
    expect(item('history').getAttribute('aria-current')).toBe('true');
  });

  it('hands the highlight back to the scrollspy when the scroll ends', () => {
    const { fixture, root, place, spy, item } = setup();
    place({ delivery: 0, sender: 500, history: 900 });
    item('history').click();
    root.dispatchEvent(new Event('scrollend'));
    place({ delivery: -300, sender: 20, history: 400 });
    spy().fire();
    fixture.detectChanges();
    expect(item('sender').getAttribute('aria-current')).toBe('true');
  });

  it('jumps without animation under prefers-reduced-motion', () => {
    const { place, scrollTo, item } = setup();
    const desktop = window.matchMedia;
    vi.stubGlobal('matchMedia', (q: string) => ({ ...desktop(q), matches: q === '(prefers-reduced-motion: reduce)' || desktop(q).matches }));
    place({ delivery: 0, sender: 500, history: 900 });
    item('sender').click();
    expect(scrollTo.mock.calls[0][0]).toMatchObject({ behavior: 'auto' });
  });

  it('writes the fragment when updateUrl is on', () => {
    const { fixture, place, item } = setup();
    fixture.componentInstance.updateUrl.set(true);
    fixture.detectChanges();
    place({ delivery: 0, sender: 500, history: 900 });
    item('sender').click();
    expect(location.hash).toBe('#sender');
  });

  it('opens on the fragment section, even one that renders after the data loads', () => {
    history.replaceState(null, '', '/#history');
    TestBed.resetTestingModule();
    const { fixture } = setupWithoutHistory();
    const root = (fixture.nativeElement as HTMLElement).querySelector('.ef-app-main__content') as HTMLElement;
    const scrollTo = vi.fn();
    root.scrollTo = scrollTo as unknown as typeof root.scrollTo;
    fixture.componentInstance.withHistory.set(true);
    fixture.detectChanges();
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'auto' }));
    const item = (fixture.nativeElement as HTMLElement).querySelector('button[data-section="history"]') as HTMLButtonElement;
    expect(item.getAttribute('aria-current')).toBe('true');
  });

  it('is a native button, reachable and usable by keyboard', () => {
    const { item } = setup();
    expect(item('sender').tagName).toBe('BUTTON');
    expect(item('sender').getAttribute('type')).toBe('button');
  });
});

describe('ef-section-nav: layout', () => {
  it('is a column beside the content on desktop', () => {
    const { el } = setup('desktop');
    const host = el.querySelector('ef-section-nav') as HTMLElement;
    expect(host.classList).toContain('ef-section-nav--rail');
    expect(el.querySelector('.ef-section-nav__heading')?.textContent?.trim()).toBe('Sections');
  });

  it('is a chip bar on a tablet', () => {
    const { el } = setup('tablet');
    const host = el.querySelector('ef-section-nav') as HTMLElement;
    expect(host.classList).toContain('ef-section-nav--bar');
    expect(host.classList).not.toContain('ef-section-nav--phone');
    expect(el.querySelector('.ef-section-nav__heading')).toBeNull();
  });

  it('is a phone chip bar on a phone', () => {
    const { el } = setup('phone');
    const host = el.querySelector('ef-section-nav') as HTMLElement;
    expect(host.classList).toContain('ef-section-nav--bar');
    expect(host.classList).toContain('ef-section-nav--phone');
  });

  it('keeps the active chip in view by scrolling the strip only', () => {
    const { fixture, el, place, spy, scrollTo, item } = setup('phone');
    const strip = el.querySelector('.ef-section-nav__list') as HTMLElement;
    const scrollBy = vi.fn();
    strip.scrollBy = scrollBy as unknown as typeof strip.scrollBy;
    strip.getBoundingClientRect = () => ({ left: 0, right: 390, top: 0, bottom: 48, width: 390, height: 48, x: 0, y: 0, toJSON() { return {}; } });
    item('history').getBoundingClientRect = () => ({ left: 380, right: 520, top: 0, bottom: 48, width: 140, height: 48, x: 380, y: 0, toJSON() { return {}; } });
    place({ delivery: 0, sender: 500, history: 900 });
    spy().fire();
    fixture.detectChanges();
    item('history').click();
    fixture.detectChanges();
    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: 520 - 390 + 16 }));
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it('scrolls the strip towards the inline start in RTL', () => {
    const { fixture, el, place, spy, item } = setup('phone');
    fixture.componentInstance.dir.set('rtl');
    fixture.detectChanges();
    const strip = el.querySelector('.ef-section-nav__list') as HTMLElement;
    const scrollBy = vi.fn();
    strip.scrollBy = scrollBy as unknown as typeof strip.scrollBy;
    strip.getBoundingClientRect = () => ({ left: 0, right: 390, top: 0, bottom: 48, width: 390, height: 48, x: 0, y: 0, toJSON() { return {}; } });
    // In RTL the later chips run off the left edge.
    item('history').getBoundingClientRect = () => ({ left: -120, right: 10, top: 0, bottom: 48, width: 130, height: 48, x: -120, y: 0, toJSON() { return {}; } });
    place({ delivery: 0, sender: 500, history: 900 });
    spy().fire();
    fixture.detectChanges();
    item('history').click();
    fixture.detectChanges();
    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: -120 - 16 }));
  });
});
