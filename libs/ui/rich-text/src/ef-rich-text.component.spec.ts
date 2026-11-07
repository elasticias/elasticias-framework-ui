import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Editor } from 'primeng/editor';
import { EfReadOnlyDirective } from '@elasticias/ui';
import { EfRichTextComponent } from './ef-rich-text.component';

/**
 * A multi-line description with a little formatting: sanitised HTML out,
 * the text's direction on the editing area, and the keyboard and labels a
 * screen reader user needs.
 */
const KEYS: Record<string, string> = {
    ef_rich_text_bold: 'Gras',
    ef_rich_text_italic: 'Italique',
    ef_rich_text_underline: 'Souligné',
    ef_rich_text_bullet_list: 'Liste à puces',
    ef_rich_text_ordered_list: 'Liste numérotée',
    ef_rich_text_link: 'Lien',
    ef_rich_text_clean: 'Effacer la mise en forme',
    ef_rich_text_link_enter: 'Adresse du lien :',
    ef_rich_text_link_save: 'Enregistrer',
    description: 'Description',
};

interface Quill {
    root: HTMLElement;
    insertText(i: number, t: string, s: string): void;
    deleteText(i: number, n: number, s: string): void;
    getLength(): number;
    setContents: (...a: unknown[]) => void;
    isEnabled(): boolean;
    focus(): void;
    setSelection(i: number, n: number, s?: string): void;
    getSelection(): { index: number } | null;
}

// jsdom has no layout; Quill measures the selection when it moves.
const proto = Range.prototype as unknown as Record<string, unknown>;
proto['getBoundingClientRect'] ??= () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 });
proto['getClientRects'] ??= () => [];

function setup() {
    TestBed.configureTestingModule({ imports: [TranslateModule.forRoot()] });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('fr', KEYS);
    translate.use('fr');
}

async function ready<T>(fixture: ComponentFixture<T>): Promise<Quill> {
    fixture.detectChanges();
    const editor = fixture.debugElement.query(By.directive(Editor)).componentInstance as Editor & { quill: Quill };
    await vi.waitFor(() => expect(editor.quill).toBeTruthy());
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return editor.quill;
}

async function render(inputs: Record<string, unknown> = {}) {
    setup();
    const fixture = TestBed.createComponent(EfRichTextComponent);
    for (const [k, v] of Object.entries({ name: 'description', labelKey: 'description', ...inputs })) fixture.componentRef.setInput(k, v);
    const emitted: string[] = [];
    fixture.componentInstance.valueChangeEvent.subscribe(v => emitted.push(v));
    const quill = await ready(fixture);
    return { fixture, quill, emitted, host: fixture.nativeElement as HTMLElement };
}

describe('EfRichTextComponent', () => {
    it('renders the small toolbar, every button named in the reader language', async () => {
        const { host } = await render();
        const names = Array.from(host.querySelectorAll('.ql-toolbar button')).map(b => b.getAttribute('aria-label'));
        expect(names).toEqual(['Gras', 'Italique', 'Souligné', 'Liste à puces', 'Liste numérotée', 'Lien', 'Effacer la mise en forme']);
        expect(host.querySelector('.ql-image, .ql-code-block, .ql-header, .ql-color')).toBeNull();
    });

    it('emits sanitised HTML when the user types', async () => {
        const { quill, emitted } = await render();
        quill.insertText(0, 'Eau de parfum', 'user');
        expect(emitted.at(-1)).toBe('<p>Eau de parfum</p>');
    });

    it('emits an empty string, never <p><br></p>, once the text is removed', async () => {
        const { quill, emitted } = await render({ value: '<p>Eau</p>' });
        quill.deleteText(0, quill.getLength(), 'user');
        expect(emitted.at(-1)).toBe('');
    });

    it('loads the value into the editor', async () => {
        const { quill } = await render({ value: '<p><strong>Eau</strong></p>' });
        expect(quill.root.innerHTML).toContain('<strong>Eau</strong>');
    });

    it('never rewrites the editor when its own output comes back', async () => {
        const { fixture, quill, emitted } = await render();
        quill.insertText(0, 'Eau ', 'user');
        const spy = vi.spyOn(quill, 'setContents');
        fixture.componentRef.setInput('value', emitted.at(-1));
        fixture.detectChanges();
        expect(spy).not.toHaveBeenCalled();
    });

    it('passes a stored value through its own allowlist before Quill sees it', async () => {
        const { quill } = await render({
            value: '<p onclick="x()">a<a href="javascript:alert(1)">l</a><img src="x" onerror="x()"></p>',
        });
        const html = quill.root.innerHTML;
        expect(html).not.toMatch(/\son\w+=/);
        expect(html).not.toContain('javascript:');
        expect(quill.root.querySelector('img')).toBeNull();
        expect(quill.root.textContent).toBe('al');
    });

    it('replaces the content when a different value arrives', async () => {
        const { fixture, quill } = await render({ value: '<p>Eau</p>' });
        fixture.componentRef.setInput('value', '<p>Parfum</p>');
        fixture.detectChanges();
        expect(quill.root.textContent).toBe('Parfum');
    });

    it('puts dir and lang on the editing area only, with the textbox role and its label', async () => {
        const { quill, host } = await render({ dir: 'rtl', lang: 'ar', required: true, hintKey: 'description' });
        expect(quill.root.getAttribute('dir')).toBe('rtl');
        expect(quill.root.getAttribute('lang')).toBe('ar');
        expect(host.querySelector('.ql-toolbar')!.closest('[dir]')).toBeNull();
        expect(quill.root.getAttribute('role')).toBe('textbox');
        expect(quill.root.getAttribute('aria-multiline')).toBe('true');
        expect(quill.root.getAttribute('aria-required')).toBe('true');
        const label = host.querySelector('.ef-rich-text__label')!;
        expect(quill.root.getAttribute('aria-labelledby')).toBe(label.id);
        expect(label.textContent).toContain('Description');
        expect(quill.root.getAttribute('aria-describedby')).toContain(host.querySelector('.ef-field-hint')!.id);
    });

    it('is named by labelledBy when the label lives outside it', async () => {
        const { quill } = await render({ labelKey: '', labelledBy: 'outer-label' });
        expect(quill.root.getAttribute('aria-labelledby')).toBe('outer-label');
    });

    it('keeps a read-only editor in the tab order, but not a disabled one', async () => {
        const { quill, fixture } = await render({ value: '<p>Eau</p>', readonly: true, hintKey: 'description' });
        expect(quill.isEnabled()).toBe(false);
        expect(quill.root.getAttribute('tabindex')).toBe('0');
        expect(quill.root.getAttribute('aria-readonly')).toBe('true');
        fixture.componentRef.setInput('disabled', true);
        fixture.detectChanges();
        expect(quill.root.hasAttribute('tabindex')).toBe(false);
        expect(quill.root.getAttribute('aria-disabled')).toBe('true');
    });

    it('lets Tab leave the editor', async () => {
        const { quill } = await render({ value: '<ul><li>un</li></ul>' });
        quill.focus();
        quill.setSelection(1, 0, 'user');
        expect(quill.getSelection()).not.toBeNull();
        const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
        quill.root.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(false);
    });

    it('translates the link bubble', async () => {
        const { host } = await render();
        const tooltip = host.querySelector<HTMLElement>('.ql-tooltip')!;
        expect(tooltip.dataset['efEnter']).toBe('Adresse du lien :');
        expect(tooltip.querySelector<HTMLElement>('a.ql-action')!.dataset['efSave']).toBe('Enregistrer');
    });

    it('translates the link bubble once, and again only when the language changes', async () => {
        // In a host, so the parent's checks run the editor's ngDoCheck as in an app.
        @Component({
            standalone: true,
            imports: [EfRichTextComponent],
            template: `<ef-rich-text name="description" [value]="v()" />`,
        })
        class Host { v = signal('<p>Eau</p>'); }
        setup();
        const fixture = TestBed.createComponent(Host);
        await ready(fixture);
        const host = fixture.nativeElement as HTMLElement;
        const translate = TestBed.inject(TranslateService);
        const spy = vi.spyOn(translate, 'instant');
        fixture.componentInstance.v.set('<p>Eau douce</p>');
        fixture.detectChanges();
        fixture.detectChanges();
        expect(spy.mock.calls.filter(c => String(c[0]).startsWith('ef_rich_text_link'))).toEqual([]);
        translate.setTranslation('ar', { ef_rich_text_link_enter: 'عنوان الرابط:' });
        translate.use('ar');
        fixture.detectChanges();
        expect(host.querySelector<HTMLElement>('.ql-tooltip')!.dataset['efEnter']).toBe('عنوان الرابط:');
    });

    it('re-translates the link bubble when the translations load after the editor', async () => {
        TestBed.configureTestingModule({ imports: [TranslateModule.forRoot()] });
        const translate = TestBed.inject(TranslateService);
        translate.use('fr');
        const fixture = TestBed.createComponent(EfRichTextComponent);
        fixture.componentRef.setInput('name', 'description');
        fixture.componentRef.setInput('labelKey', 'description');
        await ready(fixture);
        const tooltip = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.ql-tooltip')!;
        expect(tooltip.dataset['efEnter']).toBe('ef_rich_text_link_enter');
        translate.setTranslation('fr', KEYS);
        expect(tooltip.dataset['efEnter']).toBe('Adresse du lien :');
    });

    it('updates the editing area attributes when its inputs change', async () => {
        const { fixture, quill } = await render({ dir: 'ltr', lang: 'fr' });
        fixture.componentRef.setInput('dir', 'rtl');
        fixture.componentRef.setInput('lang', 'ar');
        fixture.detectChanges();
        expect(quill.root.getAttribute('dir')).toBe('rtl');
        expect(quill.root.getAttribute('lang')).toBe('ar');
    });

    it('stops editing under efReadOnly, toolbar included', async () => {
        @Component({
            standalone: true,
            imports: [EfRichTextComponent, EfReadOnlyDirective],
            template: `<div [efReadOnly]="ro()"><ef-rich-text name="description" value="<p>Eau</p>" /></div>`,
        })
        class Host { ro = signal(true); }
        setup();
        const fixture = TestBed.createComponent(Host);
        const quill = await ready(fixture);
        const host = fixture.nativeElement as HTMLElement;
        expect(quill.isEnabled()).toBe(false);
        expect(Array.from(host.querySelectorAll<HTMLButtonElement>('.ql-toolbar button')).every(b => b.disabled)).toBe(true);
        fixture.componentInstance.ro.set(false);
        fixture.detectChanges();
        expect(quill.isEnabled()).toBe(true);
    });

    it('works with a reactive FormControl', async () => {
        @Component({
            standalone: true,
            imports: [EfRichTextComponent, ReactiveFormsModule],
            template: `<ef-rich-text name="description" [formControl]="ctrl" />`,
        })
        class Host { ctrl = new FormControl('<p>Eau</p>', { nonNullable: true }); }
        setup();
        const fixture = TestBed.createComponent(Host);
        const quill = await ready(fixture);
        expect(quill.root.textContent).toBe('Eau');
        quill.insertText(3, ' douce', 'user');
        expect(fixture.componentInstance.ctrl.value).toBe('<p>Eau douce</p>');
        fixture.componentInstance.ctrl.disable();
        fixture.detectChanges();
        expect(quill.isEnabled()).toBe(false);
    });
});
