import { TestBed } from '@angular/core/testing';
import { EfIdentityThumbComponent } from './ef-identity-thumb.component';

/**
 * The square that stands for a record (a collection in its toolbar, a
 * product in a picker row): its image when there is one, two initials when
 * there is not. Sized by a class, never by an inline style.
 */
describe('EfIdentityThumbComponent', () => {
    function render(inputs: Record<string, unknown>) {
        TestBed.configureTestingModule({ imports: [EfIdentityThumbComponent] });
        const fixture = TestBed.createComponent(EfIdentityThumbComponent);
        for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
        fixture.detectChanges();
        return { fixture, host: fixture.nativeElement as HTMLElement };
    }

    it('renders initials when no image', () => {
        const { host } = render({ name: 'Escada collection' });
        expect(host.querySelector('img')).toBeNull();
        expect(host.textContent?.trim()).toBe('EC');
    });

    it('takes the first two letters of a single word', () => {
        const { host } = render({ name: 'exclusifs' });
        expect(host.textContent?.trim()).toBe('EX');
    });

    it('keeps Arabic initials whole', () => {
        const { host } = render({ name: 'عطور شرقية' });
        expect(host.textContent?.trim()).toBe('عش');
    });

    it('renders the image when there is one', () => {
        const { host } = render({ name: 'Escada', imageUrl: 'https://cdn.example/escada.webp' });
        const img = host.querySelector('img')!;
        expect(img.getAttribute('src')).toBe('https://cdn.example/escada.webp');
        expect(img.getAttribute('alt')).toBe('');
        expect(host.textContent?.trim()).toBe('');
    });

    it('falls back to initials when the image fails to load', () => {
        const { fixture, host } = render({ name: 'Escada', imageUrl: 'https://cdn.example/missing.webp' });
        host.querySelector('img')!.dispatchEvent(new Event('error'));
        fixture.detectChanges();
        expect(host.querySelector('img')).toBeNull();
        expect(host.textContent?.trim()).toBe('ES');
    });

    it('sizes through a host class, with no inline style', () => {
        const { host } = render({ name: 'Escada', size: 'sm' });
        expect(host.classList).toContain('thumb');
        expect(host.classList).toContain('ef-identity-thumb--sm');
        expect(host.getAttribute('style')).toBeNull();
    });

    it('is medium by default', () => {
        const { host } = render({ name: 'Escada' });
        expect(host.classList).toContain('ef-identity-thumb--md');
    });
});
