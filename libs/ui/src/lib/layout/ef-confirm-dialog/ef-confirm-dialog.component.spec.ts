import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ConfirmationService } from 'primeng/api';
import { EfConfirmDialogComponent } from './ef-confirm-dialog.component';

/**
 * The phone tap-target rule lives in the stylesheet; jsdom does not apply media
 * queries, so pin that a max-width 767px block sets --hit-touch on both buttons.
 */
describe('confirm dialog touch tier', () => {
    it('sizes both buttons at --hit-touch inside a 767px media block', () => {
        const css = readFileSync(join(__dirname, '../../_patterns.scss'), 'utf8');
        const blocks = css.split('@media (max-width: 767px)').slice(1);
        const hit = blocks.some(
            (b) =>
                /\.es-confirm \.p-confirmdialog-accept-button,\s*\.es-confirm \.p-confirmdialog-reject-button\s*\{\s*min-height: var\(--hit-touch\)/.test(b),
        );
        expect(hit).toBe(true);
    });
});

/**
 * The 48px clear target at 767px or less is only safe where the host reserves room for it,
 * so the rule must name the two hosts and never a bare `.ef-clear`.
 */
describe('clear target touch tier', () => {
    const css = readFileSync(join(__dirname, '../../_patterns.scss'), 'utf8');
    const phone = css.split('@media (max-width: 767px)').slice(1).join('\n');

    it('gives the 48px target only to the input wrapper and the input group', () => {
        expect(phone).toMatch(/\.ef-input-wrap \.ef-clear::after,\s*\.ef-input-group \.ef-clear::after\s*\{[^}]*inset: calc\(\(var\(--hit-touch\)/);
        expect(phone).not.toMatch(/(^|[\s,{}])\.ef-clear::after/m);
    });
});

describe('confirm dialog close button', () => {
    afterEach(() => document.body.querySelectorAll('.p-dialog-mask').forEach((m) => m.remove()));

    it('hands PrimeNG a translated close label so the X has an accessible name', async () => {
        TestBed.configureTestingModule({
            imports: [EfConfirmDialogComponent, TranslateModule.forRoot()],
            providers: [ConfirmationService],
        });
        const translate = TestBed.inject(TranslateService);
        translate.setTranslation('en', { common_close: 'Close' });
        translate.use('en');
        const fixture = TestBed.createComponent(EfConfirmDialogComponent);
        fixture.detectChanges();
        TestBed.inject(ConfirmationService).confirm({ message: 'Sure?', closable: true });
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
        const close = document.querySelector<HTMLElement>('.es-confirm .p-dialog-close-button');
        expect(close?.getAttribute('aria-label')).toBe('Close');
    });
});
