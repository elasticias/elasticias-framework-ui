import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Editor } from 'primeng/editor';
import type { LocalizedText } from '@elasticias/types';
import { provideEfRichText } from '@elasticias/ui/rich-text';
import { EfLocalizedInputComponent } from './ef-localized-input.component';

/**
 * `mode="rich"`: the owner formats a description in each language with the
 * shared ef-rich-text, which an app turns on with provideEfRichText().
 */
interface Quill {
    root: HTMLElement;
    insertText(i: number, t: string, s: string): void;
    deleteText(i: number, n: number, s: string): void;
    getLength(): number;
}

function setup(withEditor = true) {
    TestBed.configureTestingModule({
        imports: [EfLocalizedInputComponent, TranslateModule.forRoot()],
        providers: withEditor ? [provideEfRichText()] : [],
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('fr', { description: 'Description', ef_localized_input_culture_ar: 'Arabe' });
    translate.use('fr');
}

async function quillOf(fixture: ComponentFixture<unknown>): Promise<Quill> {
    let editor: (Editor & { quill: Quill }) | undefined;
    await vi.waitFor(() => {
        fixture.detectChanges();
        editor = fixture.debugElement.query(By.directive(Editor))?.componentInstance;
        expect(editor?.quill).toBeTruthy();
    });
    fixture.detectChanges();
    return editor!.quill;
}

async function render(inputs: Record<string, unknown> = {}, withEditor = true) {
    setup(withEditor);
    const fixture = TestBed.createComponent(EfLocalizedInputComponent);
    for (const [k, v] of Object.entries({ name: 'description', labelKey: 'description', mode: 'rich', ...inputs })) {
        fixture.componentRef.setInput(k, v);
    }
    const emitted: LocalizedText[] = [];
    fixture.componentInstance.valueChangeEvent.subscribe(v => emitted.push(v));
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const select = async (code: string) => {
        host.querySelector<HTMLButtonElement>(`[role="tab"][id$="-tab-${code}"]`)!.click();
        fixture.detectChanges();
        return quillOf(fixture);
    };
    return { fixture, host, emitted, select };
}

describe('EfLocalizedInputComponent rich mode', () => {
    it('renders the rich editor for the culture, named by the field label', async () => {
        const { fixture, host, select } = await render({ value: { fr: '<p>Eau</p>', ar: '<p>ماء</p>' } });
        let quill = await quillOf(fixture);
        expect(quill.root.textContent).toBe('Eau');
        const label = host.querySelector('.eli-label')!;
        expect(quill.root.getAttribute('aria-labelledby')).toBe(label.id);
        quill = await select('ar');
        expect(quill.root.textContent).toBe('ماء');
        expect(quill.root.getAttribute('dir')).toBe('rtl');
        expect(quill.root.getAttribute('lang')).toBe('ar');
        expect(host.querySelector('[role="tabpanel"]')!.contains(quill.root)).toBe(true);
    });

    it('emits sanitised HTML in the whole object, and no key for an emptied culture', async () => {
        const { fixture, emitted } = await render({ value: { fr: '<p>Eau</p>', en: '<p>Water</p>' } });
        const quill = await quillOf(fixture);
        quill.insertText(3, ' douce', 'user');
        expect(emitted.at(-1)).toEqual({ fr: '<p>Eau douce</p>', en: '<p>Water</p>' });
        quill.deleteText(0, quill.getLength(), 'user');
        expect(emitted.at(-1)).toEqual({ en: '<p>Water</p>' });
    });

    it('counts the text a reader sees, not the tags', async () => {
        const { fixture, host } = await render({ value: { fr: '<p><strong>Eau</strong></p>' }, advisedLength: 10 });
        await quillOf(fixture);
        expect(host.querySelector('[data-counter]')!.textContent?.trim()).toBe('3 / 10');
    });

    it('falls back to the html source, and says why, when the app has not provided the editor', async () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const { host } = await render({ value: { fr: '<p>Eau</p>' } }, false);
        expect(host.querySelector('ef-rich-text')).toBeNull();
        expect(host.querySelector<HTMLTextAreaElement>('[role="tabpanel"] textarea')!.value).toBe('<p>Eau</p>');
        expect(error).toHaveBeenCalledWith(expect.stringContaining('provideEfRichText'));
        error.mockRestore();
    });
});
