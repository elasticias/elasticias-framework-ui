import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EfInputTextComponent } from './ef-input-text/ef-input-text.component';
import { EfTextareaComponent } from './ef-textarea/ef-textarea.component';

@Component({
    standalone: true,
    imports: [EfInputTextComponent, EfTextareaComponent],
    template: `<ef-input-text name="a" lang="ar" /><ef-textarea name="b" lang="ar" />`,
})
class HostComponent {}

describe('static lang on text controls', () => {
    it('reaches the native field only, never the ef-* host that also holds the label and hint', () => {
        TestBed.configureTestingModule({ imports: [HostComponent, TranslateModule.forRoot()] });
        const fixture = TestBed.createComponent(HostComponent);
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        for (const tag of ['ef-input-text', 'ef-textarea']) {
            expect(el.querySelector(tag)?.hasAttribute('lang')).toBe(false);
            expect(el.querySelector(`${tag} input, ${tag} textarea`)?.getAttribute('lang')).toBe('ar');
        }
    });
});
