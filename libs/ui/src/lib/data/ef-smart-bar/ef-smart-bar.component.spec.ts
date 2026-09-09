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
