import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EfTabItem, EfTabsComponent } from './ef-tabs.component';

/**
 * A tab can say something about its panel without being opened: a short
 * translated note ("missing") and a danger tone (a required panel left empty,
 * a panel with server errors). Tabs that pilot a panel the consumer renders
 * also need the ARIA link to it (id / aria-controls).
 */
function render(items: EfTabItem[], inputs: Record<string, unknown> = {}) {
    TestBed.configureTestingModule({ imports: [EfTabsComponent, TranslateModule.forRoot()] });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('fr', { missing: 'manquant', ar: 'Arabe', custom: 'personnalisé' });
    translate.use('fr');
    const fixture = TestBed.createComponent(EfTabsComponent);
    fixture.componentRef.setInput('items', items);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const tabs = () => Array.from(host.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    return { fixture, host, tabs };
}

describe('ef-tabs: note, tone and panel link', () => {
    it('renders a translated note inside the tab, so it joins the accessible name', () => {
        const { tabs } = render([{ value: 'ar', labelKey: 'ar', noteKey: 'missing' }]);
        const note = tabs()[0].querySelector('.ef-tabs__note')!;
        expect(note.textContent?.trim()).toBe('manquant');
        expect(tabs()[0].textContent?.replace(/\s+/g, ' ').trim()).toBe('Arabe manquant');
    });

    it('renders no note by default', () => {
        const { tabs } = render([{ value: 'ar', labelKey: 'ar' }]);
        expect(tabs()[0].querySelector('.ef-tabs__note')).toBeNull();
    });

    it('renders a translated badge inside the tab, after the note, so it joins the accessible name', () => {
        const { tabs } = render([{ value: 'ar', labelKey: 'ar', noteKey: 'missing', badgeKey: 'custom' }]);
        const badge = tabs()[0].querySelector('.ef-tabs__badge')!;
        expect(badge.textContent?.trim()).toBe('personnalisé');
        expect(tabs()[0].textContent?.replace(/\s+/g, ' ').trim()).toBe('Arabe manquant personnalisé');
    });

    it('renders no badge by default', () => {
        const { tabs } = render([{ value: 'ar', labelKey: 'ar' }]);
        expect(tabs()[0].querySelector('.ef-tabs__badge')).toBeNull();
    });

    it('marks a danger tab with a class', () => {
        const { tabs } = render([{ value: 'fr', label: 'FR', tone: 'danger' }, { value: 'ar', label: 'AR' }]);
        expect(tabs()[0].classList).toContain('is-danger');
        expect(tabs()[1].classList).not.toContain('is-danger');
    });

    it('colours a danger tab with the status token', () => {
        const { tabs } = render([{ value: 'fr', label: 'FR', tone: 'danger' }]);
        expect(getComputedStyle(tabs()[0]).color).toBe('var(--st-cancelled-fg)');
    });

    it('links a tab to its panel with id and aria-controls', () => {
        const { tabs } = render([{ value: 'fr', label: 'FR', id: 'x-tab-fr', panelId: 'x-panel' }, { value: 'ar', label: 'AR' }]);
        expect(tabs()[0].id).toBe('x-tab-fr');
        expect(tabs()[0].getAttribute('aria-controls')).toBe('x-panel');
        expect(tabs()[1].hasAttribute('id')).toBe(false);
        expect(tabs()[1].hasAttribute('aria-controls')).toBe(false);
    });

    it('moves backwards on ArrowRight when the tablist is right to left', () => {
        const items: EfTabItem[] = [{ value: 'fr', label: 'FR' }, { value: 'ar', label: 'AR' }, { value: 'en', label: 'EN' }];
        const { fixture, host, tabs } = render(items, { value: 'ar' });
        host.setAttribute('dir', 'rtl');
        const seen: string[] = [];
        fixture.componentInstance.valueChange.subscribe(v => seen.push(v));
        tabs()[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        expect(seen).toEqual(['fr']);
    });

    it('keeps ArrowRight moving forwards left to right', () => {
        const items: EfTabItem[] = [{ value: 'fr', label: 'FR' }, { value: 'ar', label: 'AR' }];
        const { fixture, tabs } = render(items, { value: 'fr' });
        const seen: string[] = [];
        fixture.componentInstance.valueChange.subscribe(v => seen.push(v));
        tabs()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        expect(seen).toEqual(['ar']);
    });
});
