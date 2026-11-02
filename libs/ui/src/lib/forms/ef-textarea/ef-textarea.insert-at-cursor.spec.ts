import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EfTextareaComponent } from './ef-textarea.component';

/**
 * A placeholder chip inserts its token where the user left the caret, as if
 * typed: one value change, caret after the token. A control the user never
 * entered gets the token at the end; a read-only one is left alone.
 */
describe('EfTextareaComponent insertAtCursor', () => {
    function render(inputs: Record<string, unknown> = {}) {
        TestBed.configureTestingModule({ imports: [EfTextareaComponent, TranslateModule.forRoot()] });
        const fixture = TestBed.createComponent(EfTextareaComponent);
        fixture.componentRef.setInput('value', 'Hello world');
        for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
        fixture.detectChanges();
        const cmp = fixture.componentInstance;
        const onChange = vi.fn();
        cmp.registerOnChange(onChange);
        const emitted: string[] = [];
        cmp.valueChangeEvent.subscribe((v: string) => emitted.push(v));
        const native = (fixture.nativeElement as HTMLElement).querySelector('textarea') as HTMLTextAreaElement;
        return { fixture, cmp, native, onChange, emitted };
    }

    it('insertAtCursor inserts at the caret and emits once', () => {
        const { fixture, cmp, native, onChange, emitted } = render();
        native.focus();
        native.setSelectionRange(5, 5);
        cmp.insertAtCursor('{{name}}');
        fixture.detectChanges();
        expect(native.value).toBe('Hello{{name}} world');
        expect(cmp.value).toBe('Hello{{name}} world');
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith('Hello{{name}} world');
        expect(emitted).toEqual(['Hello{{name}} world']);
        expect(native.selectionStart).toBe(13);
        expect(native.selectionEnd).toBe(13);
    });

    it('insertAtCursor replaces the selected text', () => {
        const { cmp, native } = render();
        native.focus();
        native.setSelectionRange(6, 11);
        cmp.insertAtCursor('{{name}}');
        expect(native.value).toBe('Hello {{name}}');
        expect(native.selectionStart).toBe(14);
    });

    it('insertAtCursor appends when never focused', () => {
        const { cmp, native, emitted } = render();
        // A caret position without focus is not the user's choice.
        native.setSelectionRange(0, 0);
        cmp.insertAtCursor('{{name}}');
        expect(native.value).toBe('Hello world{{name}}');
        expect(emitted).toEqual(['Hello world{{name}}']);
    });

    it('insertAtCursor keeps the last caret after the control lost focus', () => {
        const { cmp, native } = render();
        native.focus();
        native.setSelectionRange(5, 5);
        native.blur();
        cmp.insertAtCursor('!');
        expect(native.value).toBe('Hello! world');
    });

    it('insertAtCursor refuses a token that would pass maxlength, as typing would', () => {
        // Hello world is 11 chars; a cut token like "{{custo" would be worse
        // than no token, so the insert is refused whole rather than truncated.
        const { cmp, native, onChange, emitted } = render({ maxlength: 15 });
        native.focus();
        native.setSelectionRange(5, 5);
        cmp.insertAtCursor('{{name}}');
        expect(native.value).toBe('Hello world');
        expect(onChange).not.toHaveBeenCalled();
        expect(emitted).toEqual([]);
        cmp.insertAtCursor('!!!!');
        expect(native.value).toBe('Hello!!!! world');
    });

    it('insertAtCursor counts the replaced selection against maxlength', () => {
        // Replacing "world" (5) with "{{name}}" (8) gives 14 chars.
        const refused = render({ maxlength: 13 });
        refused.native.focus();
        refused.native.setSelectionRange(6, 11);
        refused.cmp.insertAtCursor('{{name}}');
        expect(refused.native.value).toBe('Hello world');

        TestBed.resetTestingModule();
        const fits = render({ maxlength: 14 });
        fits.native.focus();
        fits.native.setSelectionRange(6, 11);
        fits.cmp.insertAtCursor('{{name}}');
        expect(fits.native.value).toBe('Hello {{name}}');
    });

    it('insertAtCursor ignores focus that landed on another element inside the control', () => {
        const { cmp, native } = render();
        native.setSelectionRange(0, 0);
        const other = document.createElement('button');
        (native.parentElement as HTMLElement).appendChild(other);
        other.focus();
        cmp.insertAtCursor('!');
        expect(native.value).toBe('Hello world!');
    });

    it('insertAtCursor is a no-op when read-only', () => {
        const { cmp, native, onChange, emitted } = render({ readonly: true });
        native.focus();
        native.setSelectionRange(5, 5);
        cmp.insertAtCursor('{{name}}');
        expect(native.value).toBe('Hello world');
        expect(cmp.value).toBe('Hello world');
        expect(onChange).not.toHaveBeenCalled();
        expect(emitted).toEqual([]);
    });

    it('insertAtCursor is a no-op when disabled', () => {
        const { fixture, cmp, native, onChange } = render();
        native.focus();
        cmp.setDisabledState(true);
        fixture.detectChanges();
        cmp.insertAtCursor('{{name}}');
        expect(native.value).toBe('Hello world');
        expect(onChange).not.toHaveBeenCalled();
    });
});
