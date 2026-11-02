import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EfBadgeComponent } from './ef-badge.component';

describe('ef-badge', () => {
    async function make() {
        TestBed.resetTestingModule();
        await TestBed.configureTestingModule({
            imports: [EfBadgeComponent, TranslateModule.forRoot()],
        }).compileComponents();
        const translate = TestBed.inject(TranslateService);
        translate.setTranslation('fr', { badge_key: 'Traduit' });
        translate.use('fr');
        return TestBed.createComponent(EfBadgeComponent);
    }

    it('translates labelKey', async () => {
        const fixture = await make();
        fixture.componentRef.setInput('labelKey', 'badge_key');
        fixture.detectChanges();
        expect((fixture.nativeElement as HTMLElement).textContent).toContain('Traduit');
    });

    it('prefers labelKey over label', async () => {
        const fixture = await make();
        fixture.componentRef.setInput('label', 'Raw');
        fixture.componentRef.setInput('labelKey', 'badge_key');
        fixture.detectChanges();
        const text = (fixture.nativeElement as HTMLElement).textContent;
        expect(text).toContain('Traduit');
        expect(text).not.toContain('Raw');
    });

    it('does not look interactive by default', async () => {
        const fixture = await make();
        fixture.componentRef.setInput('label', 'A');
        fixture.detectChanges();
        const el = (fixture.nativeElement as HTMLElement).querySelector('.ef-badge') as HTMLElement;
        expect(getComputedStyle(el).cursor).not.toBe('pointer');
    });

    it('looks interactive when clickable', async () => {
        const fixture = await make();
        fixture.componentRef.setInput('label', 'A');
        fixture.componentRef.setInput('clickable', true);
        fixture.detectChanges();
        const el = (fixture.nativeElement as HTMLElement).querySelector('.ef-badge') as HTMLElement;
        expect(getComputedStyle(el).cursor).toBe('pointer');
    });
});
