import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EfPdfPreviewComponent } from './ef-pdf-preview.component';

describe('EfPdfPreviewComponent (WhatsApp fallback)', () => {
  let openSpy: ReturnType<typeof vi.spyOn>;
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  const nav = navigator as Navigator & { share?: unknown; canShare?: unknown };
  const originalShare = nav.share;
  const originalCanShare = nav.canShare;

  beforeEach(async () => {
    // jsdom has neither object URLs nor the Web Share API.
    URL.createObjectURL = () => 'blob:test';
    URL.revokeObjectURL = () => undefined;
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    await TestBed.configureTestingModule({
      imports: [EfPdfPreviewComponent, TranslateModule.forRoot()],
    }).compileComponents();
  });

  afterEach(() => {
    openSpy.mockRestore();
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    Object.defineProperty(navigator, 'share', { value: originalShare, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: originalCanShare, configurable: true });
  });

  function share(phone: string, defaultCallingCode?: string): string {
    const fixture = TestBed.createComponent(EfPdfPreviewComponent);
    if (defaultCallingCode !== undefined) {
      fixture.componentRef.setInput('defaultCallingCode', defaultCallingCode);
    }
    fixture.componentRef.setInput('blob', new Blob(['%PDF'], { type: 'application/pdf' }));
    fixture.componentRef.setInput('fileName', 'BL-0042.pdf');
    fixture.componentRef.setInput('whatsappPhone', phone);
    fixture.detectChanges();
    fixture.componentInstance.shareWhatsapp();
    expect(openSpy).toHaveBeenCalledTimes(1);
    return openSpy.mock.calls[0][0] as string;
  }

  it('wa.me fallback strips the plus', () => {
    // wa.me wants the international number as digits only; a "+" makes it
    // open on an error page instead of the chat.
    const url = share('+212 6 12-34-56-78');
    expect(url.startsWith('https://wa.me/212612345678?text=')).toBe(true);
    expect(url).toBe('https://wa.me/212612345678?text=BL-0042.pdf');
  });

  it('opens the contact picker when there is no phone', () => {
    expect(share('')).toBe('https://wa.me/?text=BL-0042.pdf');
  });

  it('treats a phone without any digit as no phone', () => {
    expect(share('+ -')).toBe('https://wa.me/?text=BL-0042.pdf');
  });

  it('wa.me fallback puts the default calling code on a national number', () => {
    expect(share('06 12 34 56 78', '212')).toBe('https://wa.me/212612345678?text=BL-0042.pdf');
  });

  it('wa.me fallback keeps an international number whatever the default', () => {
    expect(share('+33 6 12 34 56 78', '212')).toBe('https://wa.me/33612345678?text=BL-0042.pdf');
  });

  it('opens the contact picker for a national number without a default calling code', () => {
    // wa.me/0612345678 lands on WhatsApp's error page; the picker at least
    // lets the user choose the chat.
    expect(share('0612345678')).toBe('https://wa.me/?text=BL-0042.pdf');
  });
});
