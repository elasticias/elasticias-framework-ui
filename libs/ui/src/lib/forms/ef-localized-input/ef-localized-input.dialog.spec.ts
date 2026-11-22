import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type { LocalizedText } from '@elasticias/types';
import { EfReadOnlyDirective } from '../ef-read-only.directive';
import { EfServerErrorsDirective } from '../ef-server-errors.directive';
import { EfLocalizedInputComponent } from './ef-localized-input.component';

/**
 * The compact editor (`languageEditor` auto, text mode): the field looks like
 * any one-line input, edits the default culture, and a languages button
 * inside it opens a dialog with every culture stacked. The dialog edits a
 * draft; Appliquer emits once, anything else discards it.
 */
const KEYS = {
    ef_localized_input_culture_fr: 'Français',
    ef_localized_input_culture_ar: 'Arabe',
    ef_localized_input_culture_en: 'Anglais',
    ef_localized_input_cultures: 'Langues du texte',
    ef_localized_input_errors_in_other: 'Erreur dans :',
    ef_localized_input_error_in_culture: '{{culture}} : {{message}}',
    ef_localized_input_translations: 'Traductions : {{filled}} sur {{total}} langues remplies',
    ef_localized_input_read_only_hint: 'Ce texte se modifie ailleurs.',
    common_apply: 'Appliquer',
    common_cancel: 'Annuler',
    common_close: 'Fermer',
    title: 'Titre',
    too_long: 'Trop long',
};

type Errors = { [k: string]: string[] };

@Component({
    standalone: true,
    imports: [EfLocalizedInputComponent, EfServerErrorsDirective, EfReadOnlyDirective],
    template: `
        <div [efServerErrors]="errors()" [efReadOnly]="readOnly()">
            <ef-localized-input
                name="title"
                labelKey="title"
                [mode]="mode()"
                [languageEditor]="editor()"
                [maxLength]="maxLength()"
                [readOnlyCultures]="readOnlyCultures()"
                [cultures]="cultures()"
                [value]="value()"
                (valueChangeEvent)="emitted.push($event); value.set($event)"
            >
                <a read-only-link data-link>catalogue</a>
            </ef-localized-input>
        </div>
    `,
})
class Host {
    readonly errors = signal<Errors | null>(null);
    readonly readOnly = signal(false);
    readonly mode = signal<'text' | 'textarea' | 'html'>('text');
    readonly editor = signal<'auto' | 'tabs' | 'dialog'>('auto');
    readonly maxLength = signal<number | undefined>(undefined);
    readonly readOnlyCultures = signal<string[]>([]);
    readonly cultures = signal<unknown>(undefined);
    readonly value = signal<LocalizedText>({ fr: 'Bonjour', ar: 'مرحبا' });
    readonly emitted: LocalizedText[] = [];
}

function render(setup: (h: Host) => void = () => undefined) {
    TestBed.configureTestingModule({ imports: [Host, TranslateModule.forRoot()] });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('fr', KEYS);
    translate.use('fr');
    const fixture = TestBed.createComponent(Host);
    setup(fixture.componentInstance);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const detect = () => {
        fixture.detectChanges();
    };
    const settle = async () => {
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    };
    const inline = () => host.querySelector<HTMLInputElement>('ef-localized-input .eli-panel input')!;
    const trigger = () => host.querySelector<HTMLButtonElement>('[data-languages]');
    const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]');
    const dialogField = (code: string) => document.querySelector<HTMLInputElement>(`[role="dialog"] input[name="title.${code}"]`)!;
    const footerButton = (label: string) =>
        Array.from(document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')).find(b => b.textContent?.trim() === label);
    const open = async () => {
        trigger()!.click();
        await settle();
    };
    const type = (el: HTMLInputElement, text: string) => {
        el.value = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        detect();
    };
    return { fixture, host, detect, settle, inline, trigger, dialog, dialogField, footerButton, open, type, cmp: fixture.componentInstance };
}

afterEach(() => document.body.querySelectorAll('.p-dialog-mask, .p-dialog').forEach(m => m.remove()));

describe('EfLocalizedInputComponent compact editor', () => {
    it('shows a plain field for the default culture with no tab row, in text mode by default', () => {
        const { host, inline, trigger } = render();
        expect(host.querySelector('[role="tab"]')).toBeNull();
        expect(inline().getAttribute('name')).toBe('title.fr');
        expect(inline().value).toBe('Bonjour');
        expect(trigger()).not.toBeNull();
    });

    it('draws the languages button inside the field, with the filled count', () => {
        const { host, trigger } = render();
        expect(host.querySelector('.ef-input-group [data-languages]')).not.toBeNull();
        expect(trigger()!.textContent).toContain('2/3');
        expect(trigger()!.getAttribute('aria-label')).toBe('Traductions : 2 sur 3 langues remplies');
        expect(trigger()!.getAttribute('aria-haspopup')).toBe('dialog');
    });

    it('edits the default culture inline and emits the whole object', () => {
        const { inline, type, cmp } = render();
        type(inline(), 'Salut');
        expect(cmp.emitted.at(-1)).toEqual({ fr: 'Salut', ar: 'مرحبا' });
    });

    it('keeps the tab row for a textarea, an explicit tabs editor and a field with one culture', () => {
        expect(render(h => h.mode.set('textarea')).host.querySelector('[role="tab"]')).not.toBeNull();
        TestBed.resetTestingModule();
        expect(render(h => h.editor.set('tabs')).host.querySelector('[role="tab"]')).not.toBeNull();
        TestBed.resetTestingModule();
        const single = render(h => h.cultures.set([{ code: 'fr', labelKey: 'ef_localized_input_culture_fr', dir: 'ltr' }]));
        expect(single.host.querySelector('[role="tab"]')).toBeNull();
        expect(single.trigger()).toBeNull();
    });

    it('opens a dialog titled by the label with every culture stacked, each in its direction', async () => {
        const { open, dialog, dialogField } = render();
        await open();
        expect(dialog()?.textContent).toContain('Titre');
        expect(dialogField('fr').value).toBe('Bonjour');
        expect(dialogField('ar').value).toBe('مرحبا');
        expect(dialogField('ar').getAttribute('dir')).toBe('rtl');
        expect(dialogField('ar').getAttribute('lang')).toBe('ar');
        expect(dialogField('en').value).toBe('');
    });

    it('emits once on Appliquer with every culture edited in the dialog', async () => {
        const { open, dialogField, type, footerButton, settle, cmp, inline } = render();
        await open();
        type(dialogField('en'), 'Hello');
        type(dialogField('fr'), 'Salut');
        expect(cmp.emitted).toHaveLength(0);
        footerButton('Appliquer')!.click();
        await settle();
        expect(cmp.emitted).toEqual([{ fr: 'Salut', ar: 'مرحبا', en: 'Hello' }]);
        expect(inline().value).toBe('Salut');
    });

    it('discards the dialog edits on Annuler', async () => {
        const { open, dialogField, type, footerButton, settle, cmp, inline, trigger } = render();
        await open();
        type(dialogField('fr'), 'Salut');
        footerButton('Annuler')!.click();
        await settle();
        await new Promise(r => setTimeout(r, 400));
        await settle();
        expect(cmp.emitted).toHaveLength(0);
        expect(document.activeElement).toBe(trigger());
        expect(inline().value).toBe('Bonjour');
        await open();
        expect(dialogField('fr').value).toBe('Bonjour');
    });

    it('applies on Enter in a field of the dialog, unless an IME is composing', async () => {
        const { open, dialogField, type, settle, cmp } = render();
        await open();
        type(dialogField('en'), 'Hello');
        dialogField('en').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, isComposing: true }));
        await settle();
        expect(cmp.emitted).toHaveLength(0);
        dialogField('en').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        await settle();
        expect(cmp.emitted).toEqual([{ fr: 'Bonjour', ar: 'مرحبا', en: 'Hello' }]);
    });

    it('discards the dialog edits on Escape, and gives focus back to the button', async () => {
        const { open, dialogField, type, settle, cmp, trigger, dialog } = render();
        await open();
        type(dialogField('fr'), 'Salut');
        dialogField('fr').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        await settle();
        await new Promise(r => setTimeout(r, 400));
        await settle();
        expect(dialog()).toBeNull();
        expect(cmp.emitted).toHaveLength(0);
        expect(document.activeElement).toBe(trigger());
    });

    it('marks the field and the button for an error in another culture, and shows it on that culture in the dialog', async () => {
        const { inline, trigger, cmp, detect, host, open } = render();
        cmp.errors.set({ 'title.ar': ['too_long'] });
        detect();
        expect(inline().getAttribute('aria-invalid')).toBe('true');
        expect(inline().value).toBe('Bonjour');
        expect(trigger()!.classList).toContain('is-invalid');
        expect(host.textContent).toContain('Erreur dans : Arabe');
        await open();
        const arBlock = document.querySelector('[role="dialog"] [data-culture="ar"]')!;
        expect(arBlock.textContent).toContain('Trop long');
        const frBlock = document.querySelector('[role="dialog"] [data-culture="fr"]')!;
        expect(frBlock.textContent).not.toContain('Trop long');
    });

    it('opens read-only under efReadOnly, with only Fermer', async () => {
        const { cmp, detect, open, dialogField, footerButton, trigger } = render();
        cmp.readOnly.set(true);
        detect();
        expect(trigger()!.disabled).toBe(false);
        await open();
        expect(dialogField('ar').disabled).toBe(true);
        expect(footerButton('Fermer')).toBeDefined();
        expect(footerButton('Appliquer')).toBeUndefined();
    });

    it('shows a read-only default inline with its link, and edits the other cultures in the dialog', async () => {
        const { inline, host, cmp, detect, open, dialogField } = render();
        cmp.readOnlyCultures.set(['fr']);
        detect();
        expect(inline().readOnly).toBe(true);
        expect(host.querySelector('[data-link]')).not.toBeNull();
        await open();
        expect(dialogField('fr').readOnly).toBe(true);
        expect(dialogField('ar').readOnly).toBe(false);
    });

    it('counts each culture against maxLength in the dialog', async () => {
        const { cmp, detect, open } = render();
        cmp.maxLength.set(40);
        detect();
        await open();
        const ar = document.querySelector('[role="dialog"] [data-culture="ar"] [data-counter]');
        expect(ar?.textContent?.replace(/\s+/g, ' ').trim()).toBe('5 / 40');
    });

    it('inserts at the caret of the inline default culture', () => {
        const { fixture, cmp } = render();
        const lic = fixture.debugElement.query(d => d.componentInstance instanceof EfLocalizedInputComponent)
            .componentInstance as EfLocalizedInputComponent;
        expect(lic.insertAtCaret(' {{x}}')).toBe(true);
        expect(cmp.emitted.at(-1)).toEqual({ fr: 'Bonjour {{x}}', ar: 'مرحبا' });
    });
});

describe('EfLocalizedInputComponent compact editor in a form', () => {
    @Component({
        standalone: true,
        imports: [EfLocalizedInputComponent, ReactiveFormsModule],
        template: `<ef-localized-input name="title" labelKey="title" required [formControl]="ctrl" />`,
    })
    class FormHost {
        readonly ctrl = new FormControl<LocalizedText>({ fr: 'Bonjour' });
    }

    it('writes the dialog edits to the form control once, on Appliquer', async () => {
        TestBed.configureTestingModule({ imports: [FormHost, TranslateModule.forRoot()] });
        TestBed.inject(TranslateService).setTranslation('fr', KEYS);
        TestBed.inject(TranslateService).use('fr');
        const fixture = TestBed.createComponent(FormHost);
        fixture.detectChanges();
        const changes: unknown[] = [];
        fixture.componentInstance.ctrl.valueChanges.subscribe(v => changes.push(v));
        (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-languages]')!.click();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
        const en = document.querySelector<HTMLInputElement>('[role="dialog"] input[name="title.en"]')!;
        en.value = 'Hello';
        en.dispatchEvent(new Event('input', { bubbles: true }));
        fixture.detectChanges();
        Array.from(document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')).find(b => b.textContent?.trim() === 'Appliquer')!.click();
        fixture.detectChanges();
        expect(changes).toEqual([{ fr: 'Bonjour', en: 'Hello' }]);
        expect(fixture.componentInstance.ctrl.valid).toBe(true);
    });
});
