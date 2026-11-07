// @vitest-environment node
import { compile } from 'sass';
import postcss, { AtRule, Rule } from 'postcss';
import { resolve } from 'node:path';

/**
 * Mobile-first contract, read from the compiled stylesheet because jsdom
 * evaluates no media query and lays nothing out: the tab row scrolls inside
 * itself and can shrink, and on a phone the tabs are touch-sized. The phone
 * override has to come last, since a media query adds no specificity.
 */
const root = postcss.parse(compile(resolve(__dirname, 'ef-localized-input.component.scss')).css);

const rules: { rule: Rule; media: string }[] = [];
root.walkRules(rule => {
    const parent = rule.parent;
    const media = parent && parent.type === 'atrule' && (parent as AtRule).name === 'media' ? (parent as AtRule).params : '';
    rules.push({ rule, media });
});

const value = (selector: string, prop: string, media = '') => {
    let found: string | undefined;
    for (const r of rules) {
        if (r.media !== media || !r.rule.selectors.includes(selector)) continue;
        r.rule.walkDecls(prop, d => { found = d.value; });
    }
    return found;
};

describe('ef-localized-input layout', () => {
    it('lets the host and the tab row shrink, and scrolls the tabs inside their row', () => {
        expect(value(':host', 'min-width')).toBe('0');
        expect(value('.eli-tabs', 'min-width')).toBe('0');
        expect(value('.eli-tabs', 'overflow-x')).toBe('auto');
    });

    it('sizes the tabs to --hit-touch up to 767px, as the last rule of the file', () => {
        expect(value('.eli-tabs', '--hit', '(max-width: 767px)')).toBe('var(--hit-touch)');
        const last = rules.at(-1)!;
        expect(last.media).toBe('(max-width: 767px)');
    });

    it('keeps wide preview content inside the preview', () => {
        expect(value('.eli-preview', 'overflow-x')).toBe('auto');
        expect(value('.eli-preview', 'min-width')).toBe('0');
    });
});
