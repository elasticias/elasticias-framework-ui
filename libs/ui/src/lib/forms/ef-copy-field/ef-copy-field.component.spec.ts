import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EfCopyFieldComponent } from './ef-copy-field.component';
import { copyToClipboard } from './copy-to-clipboard';

const URI = 'https://shop.example.com/api/auth/callback/google?x=1';

function stubClipboard(impl: ReturnType<typeof vi.fn>) {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: impl }, configurable: true });
}

describe('EfCopyFieldComponent', () => {
    function setup(value = URI, labelKey: string | null = 'redirect_uri') {
        TestBed.configureTestingModule({ imports: [EfCopyFieldComponent, TranslateModule.forRoot()] });
        const fixture = TestBed.createComponent(EfCopyFieldComponent);
        fixture.componentRef.setInput('value', value);
        fixture.componentRef.setInput('labelKey', labelKey);
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        return {
            fixture,
            el,
            input: () => el.querySelector<HTMLInputElement>('input.ef-copy__value')!,
            button: () => el.querySelector<HTMLButtonElement>('button.ef-copy__btn')!,
            status: () => el.querySelector<HTMLElement>('[aria-live]')!,
        };
    }

    afterEach(() => vi.restoreAllMocks());

    it('renders the value read only, labelled', () => {
        const { input, el } = setup();
        expect(input().value).toBe(URI);
        expect(input().readOnly).toBe(true);
        const label = el.querySelector('label')!;
        expect(label.textContent).toContain('redirect_uri');
        expect(label.htmlFor).toBe(input().id);
    });

    it('has no label when none is given', () => {
        const { el } = setup(URI, null);
        expect(el.querySelector('label')).toBeNull();
    });

    it('names the button through copyLabelKey', () => {
        const { button } = setup();
        expect(button().getAttribute('aria-label')).toBe('ef_copy_action');
        expect(button().type).toBe('button');
    });

    it('copies the exact value, announces once, and emits copied', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        stubClipboard(writeText);
        const { fixture, button, status } = setup();
        const emitted = vi.fn();
        fixture.componentInstance.copied.subscribe(emitted);
        expect(status().textContent!.trim()).toBe('');

        button().click();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(writeText).toHaveBeenCalledTimes(1);
        expect(writeText).toHaveBeenCalledWith(URI);
        expect(status().textContent!.trim()).toBe('ef_copy_copied');
        expect(status().getAttribute('aria-live')).toBe('polite');
        expect(emitted).toHaveBeenCalledTimes(1);
    });

    it('selects the text and announces nothing when the clipboard refuses', async () => {
        stubClipboard(vi.fn().mockRejectedValue(new Error('denied')));
        const { fixture, input, button, status } = setup();
        const emitted = vi.fn();
        fixture.componentInstance.copied.subscribe(emitted);
        const select = vi.spyOn(input(), 'select');

        button().click();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(select).toHaveBeenCalled();
        expect(status().textContent!.trim()).toBe('');
        expect(emitted).not.toHaveBeenCalled();
    });

    it('keeps the value left-to-right inside a right-to-left page', () => {
        const { el, input } = setup();
        const page = document.createElement('div');
        page.dir = 'rtl';
        document.body.appendChild(page);
        page.appendChild(el);
        expect(input().getAttribute('dir')).toBe('ltr');
        expect(getComputedStyle(input()).direction).toBe('ltr');
        page.remove();
    });

    it('gives two fields distinct ids', () => {
        const first = setup();
        const second = TestBed.createComponent(EfCopyFieldComponent);
        second.componentRef.setInput('value', URI);
        second.detectChanges();
        const b = second.nativeElement.querySelector('input').id;
        expect(first.input().id).not.toBe(b);
    });
});

describe('copyToClipboard', () => {
    it('resolves true when the clipboard accepts', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        stubClipboard(writeText);
        expect(await copyToClipboard('abc')).toBe(true);
        expect(writeText).toHaveBeenCalledWith('abc');
    });

    it('resolves false when the clipboard refuses', async () => {
        stubClipboard(vi.fn().mockRejectedValue(new Error('denied')));
        expect(await copyToClipboard('abc')).toBe(false);
    });

    it('resolves false when there is no clipboard', async () => {
        Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
        expect(await copyToClipboard('abc')).toBe(false);
    });
});

@Component({
    standalone: true,
    imports: [EfCopyFieldComponent],
    template: `<ef-copy-field value="https://a.b/c" labelKey="k" />`,
})
class HostComponent {}

describe('EfCopyFieldComponent in a host', () => {
    it('renders inside a parent template', () => {
        TestBed.configureTestingModule({ imports: [HostComponent, TranslateModule.forRoot()] });
        const f = TestBed.createComponent(HostComponent);
        f.detectChanges();
        expect(f.nativeElement.querySelector('input').value).toBe('https://a.b/c');
    });
});
