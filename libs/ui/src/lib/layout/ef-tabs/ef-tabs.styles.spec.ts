// @vitest-environment node
import { compile } from 'sass';
import postcss from 'postcss';
import { resolve } from 'node:path';

/**
 * Read from the compiled stylesheet: jsdom evaluates no :focus-visible and
 * computes no contrast. The keyboard focus ring must survive the danger
 * tone (WCAG 2.4.7), and the tab note must not be faded below the muted
 * text colour (WCAG 1.4.3).
 */
const root = postcss.parse(compile(resolve(__dirname, 'ef-tabs.component.scss')).css);

function decl(selector: string, prop: string): string | undefined {
    let found: string | undefined;
    root.walkRules(rule => {
        if (!rule.selectors.includes(selector)) return;
        rule.walkDecls(prop, d => { found = d.value; });
    });
    return found;
}

describe('ef-tabs styles', () => {
    it('keeps the focus ring on the active danger pill, next to the danger ring', () => {
        const shadow = decl(':host(.ef-tabs--pill) .ef-tabs__tab.is-danger.is-active:focus-visible', 'box-shadow');
        expect(shadow).toContain('inset 0 0 0 2px var(--st-cancelled-fg)');
        expect(shadow).toContain('0 0 0 2px color-mix(in srgb, var(--ink-active, #0f1115) 40%, transparent)');
    });

    it('declares the focus rule after the danger rule, so it wins at equal or higher specificity', () => {
        const order: string[] = [];
        root.walkRules(rule => { order.push(...rule.selectors); });
        const danger = order.indexOf(':host(.ef-tabs--pill) .ef-tabs__tab.is-danger.is-active');
        const focus = order.indexOf(':host(.ef-tabs--pill) .ef-tabs__tab.is-danger.is-active:focus-visible');
        expect(danger).toBeGreaterThan(-1);
        expect(focus).toBeGreaterThan(danger);
    });

    it('does not fade the tab note', () => {
        expect(decl('.ef-tabs__note', 'font-size')).toBe('11px');
        expect(decl('.ef-tabs__note', 'opacity')).toBeUndefined();
    });
});
