import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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
