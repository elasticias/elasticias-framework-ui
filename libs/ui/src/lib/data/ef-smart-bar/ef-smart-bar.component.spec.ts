import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { formatShortcut } from '@elasticias/core';
import { EfSmartBarComponent } from './ef-smart-bar.component';

describe('EfSmartBarComponent keyboard shortcut', () => {
    let fixture: ComponentFixture<EfSmartBarComponent>;
    let component: EfSmartBarComponent;

    function pressModK(): void {
        document.dispatchEvent(
            new KeyboardEvent('keydown', {
                bubbles: true,
                cancelable: true,
                code: 'KeyK',
                key: 'k',
                metaKey: true,
                ctrlKey: true,
            }),
        );
    }

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [EfSmartBarComponent, TranslateModule.forRoot()],
        }).compileComponents();

        fixture = TestBed.createComponent(EfSmartBarComponent);
        component = fixture.componentInstance;
        document.body.appendChild(fixture.nativeElement);
    });

    afterEach(() => {
        fixture.nativeElement.remove();
    });

    it('focuses the search input on the default mod+k shortcut, without submitting', async () => {
        fixture.detectChanges();
        await fixture.whenStable();

        const searchSpy = vi.fn();
        component.search.subscribe(searchSpy);

        const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
        const focusSpy = vi.spyOn(input, 'focus');

        pressModK();

        expect(focusSpy).toHaveBeenCalledTimes(1);
        expect(searchSpy).not.toHaveBeenCalled();
    });

    it('renders the shortcut hint chip through formatShortcut, matching the registration', async () => {
        fixture.detectChanges();
        await fixture.whenStable();

        const chip: HTMLElement | null = fixture.nativeElement.querySelector('.kbd');
        expect(chip?.textContent).toBe(formatShortcut('mod+k'));
    });

    it('does not register and renders no chip when shortcut is null', async () => {
        fixture.componentRef.setInput('shortcut', null);
        fixture.detectChanges();
        await fixture.whenStable();

        const chip: HTMLElement | null = fixture.nativeElement.querySelector('.kbd');
        expect(chip).toBeNull();

        const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
        const focusSpy = vi.spyOn(input, 'focus');

        pressModK();

        expect(focusSpy).not.toHaveBeenCalled();
    });
});

@Component({
    standalone: true,
    imports: [EfSmartBarComponent],
    template: `<ef-smart-bar [(searchText)]="text" (search)="onSearch($event)" />`,
})
class SmartBarHost {
    text = 'acme';
    readonly received: unknown[] = [];
    onSearch(value: unknown): void {
        this.received.push(value);
    }
}

describe('EfSmartBarComponent (search) output', () => {
    let fixture: ComponentFixture<SmartBarHost>;
    let host: SmartBarHost;
    let input: HTMLInputElement;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [SmartBarHost, TranslateModule.forRoot()],
        }).compileComponents();

        fixture = TestBed.createComponent(SmartBarHost);
        host = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
        input = fixture.nativeElement.querySelector('input');
    });

    // Chromium and WebKit fire a native, bubbling `search` Event from an
    // <input type="search"> on Enter and on its built-in clear button. A
    // host `(search)` binding listens to the DOM event of that name as well
    // as the output, so without a stop at the input the consumer receives
    // the Event object as if it were the search text.
    it('does not hand the native search DOM event to the host binding', () => {
        input.dispatchEvent(new Event('search', { bubbles: true }));

        expect(host.received).toEqual([]);
    });

    // The native "x" clear button empties the field, and with the native
    // event stopped above nothing re-runs the search: the list would stay
    // filtered under an empty box. Effacer is the clear control here, so
    // the browser's own button is hidden by the component's styles (jsdom
    // cannot compute pseudo-element styles, so the rule itself is asserted).
    it('hides the browser\'s native clear button on the search field', () => {
        const css = Array.from(document.head.querySelectorAll('style'))
            .map(style => style.textContent ?? '')
            .join('\n');

        expect(css).toMatch(/::-webkit-search-cancel-button[^{]*\{[^}]*display:\s*none/);
    });

    it('marks the field so a phone keyboard shows a Search key that submits on Enter', () => {
        expect(input.getAttribute('enterkeyhint')).toBe('search');
    });

    it('emits the search text exactly once on Enter', () => {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
        // What the browser does next, as the keydown's default action.
        input.dispatchEvent(new Event('search', { bubbles: true }));

        expect(host.received).toEqual(['acme']);
    });
});
