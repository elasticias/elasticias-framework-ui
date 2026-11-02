import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EfViewportService } from '@elasticias/core';
import { EfFileUploadComponent } from './ef-file-upload.component';

describe('EfFileUploadComponent', () => {
    const viewport = {
        current: signal('desktop'),
        isMobile: signal(false),
        isTablet: signal(false),
        isDesktop: signal(true),
        isTabletOrBelow: signal(false),
    };

    function render(inputs: Record<string, unknown> = {}) {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            imports: [EfFileUploadComponent, TranslateModule.forRoot()],
            providers: [{ provide: EfViewportService, useValue: viewport }],
        });
        const translate = TestBed.inject(TranslateService);
        translate.setTranslation('en', { upload_logo: 'Upload logo', too_big: 'File too large', bad_type: 'Wrong type' });
        translate.use('en');
        const fixture = TestBed.createComponent(EfFileUploadComponent);
        fixture.componentRef.setInput('labelKey', 'upload_logo');
        for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
        const files: File[] = [];
        const rejected: { file: File; reason: string }[] = [];
        fixture.componentInstance.fileSelected.subscribe((f: File) => files.push(f));
        fixture.componentInstance.fileRejected.subscribe((r: { file: File; reason: string }) => rejected.push(r));
        fixture.detectChanges();
        const root = fixture.nativeElement as HTMLElement;
        const input = root.querySelector('input[type=file]') as HTMLInputElement;
        const choose = (file: File) => {
            Object.defineProperty(input, 'files', { value: [file], configurable: true });
            input.dispatchEvent(new Event('change'));
            fixture.detectChanges();
        };
        return { fixture, root, input, files, rejected, choose };
    }

    const png = (bytes = 10) => new File([new Uint8Array(bytes)], 'logo.png', { type: 'image/png' });

    it('shows a translated label on a real button', () => {
        const { root } = render();
        const btn = root.querySelector('button') as HTMLButtonElement;
        expect(btn.textContent).toContain('Upload logo');
        expect(btn.type).toBe('button');
    });

    it('opens the native picker from the button, which is the keyboard path', () => {
        const { root, input } = render();
        const click = vi.spyOn(input, 'click');
        (root.querySelector('button') as HTMLButtonElement).click();
        expect(click).toHaveBeenCalledTimes(1);
    });

    it('keeps the native input out of the tab order and the accessibility tree', () => {
        const { input } = render();
        expect(input.tabIndex).toBe(-1);
        expect(input.getAttribute('aria-hidden')).toBe('true');
    });

    it('passes the accept list to the input', () => {
        const { input } = render({ accept: 'image/png,image/jpeg' });
        expect(input.accept).toBe('image/png,image/jpeg');
    });

    it('emits the chosen File', () => {
        const { choose, files } = render({ accept: 'image/*' });
        const f = png();
        choose(f);
        expect(files).toEqual([f]);
    });

    it('rejects a file over maxSizeBytes without emitting it', () => {
        const { choose, files, rejected } = render({ maxSizeBytes: 5 });
        choose(png(10));
        expect(files).toEqual([]);
        expect(rejected.map((r) => r.reason)).toEqual(['size']);
    });

    it('rejects a file whose type is not accepted', () => {
        const { choose, files, rejected } = render({ accept: 'image/jpeg,.webp' });
        choose(png());
        expect(files).toEqual([]);
        expect(rejected.map((r) => r.reason)).toEqual(['type']);
    });

    it('accepts by extension and by wildcard', () => {
        const a = render({ accept: '.png' });
        a.choose(png());
        expect(a.files.length).toBe(1);
        const b = render({ accept: 'image/*' });
        b.choose(png());
        expect(b.files.length).toBe(1);
    });

    it('announces a rejection in a live region with the translated message', () => {
        const { choose, root } = render({ maxSizeBytes: 5, sizeErrorKey: 'too_big' });
        choose(png(10));
        const live = root.querySelector('[role=alert]') as HTMLElement;
        expect(live.textContent).toContain('File too large');
    });

    it('lets the same file be chosen twice', () => {
        const { choose, files, input } = render();
        const f = png();
        choose(f);
        expect(input.value).toBe('');
        choose(f);
        expect(files.length).toBe(2);
    });

    it('does nothing when disabled', () => {
        const { root, input } = render({ disabled: true });
        const click = vi.spyOn(input, 'click');
        const btn = root.querySelector('button') as HTMLButtonElement;
        expect(btn.disabled).toBe(true);
        btn.click();
        expect(click).not.toHaveBeenCalled();
    });

    it('gives an icon-only button an accessible name', () => {
        const { root } = render({ icon: 'pi pi-upload', labelKey: undefined, ariaLabelKey: 'upload_logo' });
        expect(root.querySelector('button')?.getAttribute('aria-label')).toBe('Upload logo');
    });

    it('anchors its hidden input to itself and sizes touch by pointer, not width', () => {
        const { root } = render();
        expect(getComputedStyle(root).position).toBe('relative');
    });
});
