import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Editor } from 'primeng/editor';
import type { LocalizedText } from '@elasticias/types';
import { provideEfRichText } from '@elasticias/ui/rich-text';
import { EfServerErrorsDirective } from '../ef-server-errors.directive';
import { EF_RICH_TEXT } from '../ef-rich-text.token';
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

function setup(withEditor: boolean | 'failing' = true) {
    const providers =
        withEditor === 'failing'
            ? [{ provide: EF_RICH_TEXT, useValue: () => Promise.reject(new Error('chunk failed')) }]
            : withEditor ? [provideEfRichText()] : [];
    TestBed.configureTestingModule({ imports: [EfLocalizedInputComponent, TranslateModule.forRoot()], providers });
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

async function render(inputs: Record<string, unknown> = {}, withEditor: boolean | 'failing' = true) {
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

    it('refuses insertAtCaret in the rich editor, which has no insert', async () => {
        const { fixture, emitted } = await render({ value: { fr: '<p>Eau</p>' } });
        await quillOf(fixture);
        expect(fixture.componentInstance.insertAtCaret('{{x}}')).toBe(false);
        expect(emitted).toEqual([]);
    });

    it('inserts at the caret when rich falls back to the html source', async () => {
        const { fixture, emitted } = await render({ value: { fr: '<p>Eau</p>' } }, false);
        expect(fixture.componentInstance.insertAtCaret('{{x}}')).toBe(true);
        expect(emitted.at(-1)).toEqual({ fr: '<p>Eau</p>{{x}}' });
    });

    it('emits sanitised HTML in the whole object, and no key for an emptied culture', async () => {
        const { fixture, emitted } = await render({ value: { fr: '<p>Eau</p>', en: '<p>Water</p>' } });
        const quill = await quillOf(fixture);
        quill.insertText(3, ' douce', 'user');
        expect(emitted.at(-1)).toEqual({ fr: '<p>Eau douce</p>', en: '<p>Water</p>' });
        quill.deleteText(0, quill.getLength(), 'user');
        expect(emitted.at(-1)).toEqual({ en: '<p>Water</p>' });
    });

    it('keeps a culture that is not listed unchanged in every emitted object', async () => {
        const { fixture, emitted } = await render({ value: { fr: '<p>Eau</p>', de: '<p>Wasser</p>' } });
        const quill = await quillOf(fixture);
        quill.insertText(3, ' douce', 'user');
        expect(emitted.at(-1)).toEqual({ fr: '<p>Eau douce</p>', de: '<p>Wasser</p>' });
        quill.deleteText(0, quill.getLength(), 'user');
        expect(emitted.at(-1)).toEqual({ de: '<p>Wasser</p>' });
    });

    it('keeps the same editor when the culture list is replaced by an equal one', async () => {
        const list = () => [
            { code: 'fr', labelKey: 'ef_localized_input_culture_fr', dir: 'auto' as const },
            { code: 'ar', labelKey: 'ef_localized_input_culture_ar', dir: 'rtl' as const },
        ];
        const { fixture } = await render({ value: { fr: '<p>Eau</p>' }, cultures: list() });
        const before = await quillOf(fixture);
        fixture.componentRef.setInput('cultures', list());
        fixture.detectChanges();
        const after = await quillOf(fixture);
        expect(after).toBe(before);
    });

    it('counts the text a reader sees, not the tags', async () => {
        const { fixture, host } = await render({ value: { fr: '<p><strong>Eau</strong></p>' }, advisedLength: 10 });
        await quillOf(fixture);
        expect(host.querySelector('[data-counter]')!.textContent?.trim()).toBe('3 / 10');
    });

    it('counts the stored HTML against maxLength when no advisedLength is set, as the server does', async () => {
        const html = '<p><strong>Eau</strong></p>';
        const { fixture, host } = await render({ value: { fr: html }, maxLength: 20 });
        await quillOf(fixture);
        const counter = host.querySelector('[data-counter]')!;
        expect(counter.textContent?.trim()).toBe(`${html.length} / 20`);
        expect(counter.classList).toContain('is-over');
    });

    it('falls back to the html source, and says why, when the app has not provided the editor', async () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const { host } = await render({ value: { fr: '<p>Eau</p>' } }, false);
        expect(host.querySelector('ef-rich-text')).toBeNull();
        expect(host.querySelector<HTMLTextAreaElement>('[role="tabpanel"] textarea')!.value).toBe('<p>Eau</p>');
        expect(error).toHaveBeenCalledWith(expect.stringContaining('provideEfRichText'));
        error.mockRestore();
    });

    it('falls back to the html source when the editor fails to load', async () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const { fixture, host } = await render({ value: { fr: '<p>Eau</p>' } }, 'failing');
        await vi.waitFor(() => {
            fixture.detectChanges();
            expect(host.querySelector<HTMLTextAreaElement>('[role="tabpanel"] textarea')?.value).toBe('<p>Eau</p>');
        });
        expect(error).toHaveBeenCalledWith(expect.stringContaining('could not load'), expect.any(Error));
        error.mockRestore();
    });

    it('shows a description.ar server error under the ar editor, inside [efServerErrors]', async () => {
        @Component({
            standalone: true,
            imports: [EfLocalizedInputComponent, EfServerErrorsDirective],
            template: `<div [efServerErrors]="map()"><ef-localized-input name="description" labelKey="description" mode="rich" [value]="{ fr: '<p>Eau</p>', ar: '<p>ماء</p>' }" /></div>`,
        })
        class Host { map = signal<{ [k: string]: string[] } | null>(null); }
        setup();
        const fixture = TestBed.createComponent(Host);
        fixture.detectChanges();
        await quillOf(fixture);
        fixture.componentInstance.map.set({ 'description.ar': ['Trop long'] });
        fixture.detectChanges();
        const host = fixture.nativeElement as HTMLElement;
        // The first culture in error is brought into view, and its editor is recreated.
        await vi.waitFor(() => {
            fixture.detectChanges();
            expect(host.querySelector('[role="tab"][id$="-tab-ar"]')!.getAttribute('aria-selected')).toBe('true');
            const q = fixture.debugElement.query(By.directive(Editor))?.componentInstance as (Editor & { quill?: Quill }) | undefined;
            expect(q?.quill?.root.textContent).toBe('ماء');
        });
        const messages = Array.from(host.querySelectorAll('ef-rich-text small.text-danger')).map(e => e.textContent!.trim());
        expect(messages).toEqual(['Trop long']);
    });
});
