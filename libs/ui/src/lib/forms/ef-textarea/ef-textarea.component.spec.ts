import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EfTextareaComponent } from './ef-textarea.component';

/**
 * An HTML body or a JSON snippet reads better in a monospace face. Screens
 * reached into the textarea with `::ng-deep` to get one; `mono` is the
 * wrapper's own switch for it.
 */
describe('EfTextareaComponent mono', () => {
    function render(inputs: Record<string, unknown>) {
        TestBed.configureTestingModule({ imports: [EfTextareaComponent, TranslateModule.forRoot()] });
        const fixture = TestBed.createComponent(EfTextareaComponent);
        for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
        fixture.detectChanges();
        return (fixture.nativeElement as HTMLElement).querySelector('textarea')!;
    }

    it('applies the mono class', () => {
        const textarea = render({ mono: true });
        expect(textarea.classList).toContain('ef-textarea--mono');
        expect(getComputedStyle(textarea).fontFamily).toBe('var(--font-mono)');
    });

    it('keeps the text face by default', () => {
        const textarea = render({});
        expect(textarea.classList).not.toContain('ef-textarea--mono');
    });
});
