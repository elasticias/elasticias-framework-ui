// @vitest-environment node
import { compile } from 'sass';
import postcss, { AtRule, Rule } from 'postcss';
import { resolve } from 'node:path';

/**
 * Read from the compiled stylesheet (jsdom evaluates no media query): the
 * toolbar's icons follow the theme instead of Quill's #444, the link bubble's
 * texts come from translated attributes, and toolbar buttons are touch-sized
 * on a phone or a coarse pointer, as the last rule of the file.
 */
const root = postcss.parse(compile(resolve(__dirname, 'ef-rich-text.component.scss')).css);
const rules: { rule: Rule; media: string }[] = [];
root.walkRules(rule => {
    const p = rule.parent;
    rules.push({ rule, media: p && p.type === 'atrule' && (p as AtRule).name === 'media' ? (p as AtRule).params : '' });
});
const value = (selector: string, prop: string, media = '') => {
    let found: string | undefined;
    for (const r of rules) {
        if (r.media === media && r.rule.selectors.includes(selector)) r.rule.walkDecls(prop, d => { found = d.value; });
    }
    return found;
};

describe('ef-rich-text styles', () => {
    it('paints the icons with the text colour', () => {
        expect(value('ef-rich-text .ql-snow .ql-stroke', 'stroke')).toBe('currentColor');
        expect(value('ef-rich-text .ql-snow.ql-toolbar button', 'color')).toBe('var(--text-mute)');
    });

    it('uses no hardcoded colour', () => {
        const hex: string[] = [];
        root.walkDecls(d => { if (/#[0-9a-f]{3,8}\b/i.test(d.value) && !d.value.includes('var(')) hex.push(`${d.prop}: ${d.value}`); });
        expect(hex).toEqual([]);
    });

    it('takes the link bubble texts from translated attributes', () => {
        expect(value('ef-rich-text .ql-snow .ql-tooltip[data-mode=link]::before', 'content')).toBe('attr(data-ef-enter)');
        expect(value('ef-rich-text .ql-snow .ql-tooltip.ql-editing a.ql-action::after', 'content')).toBe('attr(data-ef-save)');
    });

    it('sizes toolbar buttons to --hit-touch on touch, last in the file', () => {
        const media = '(max-width: 767px), (pointer: coarse)';
        expect(value('ef-rich-text .ql-snow.ql-toolbar button', 'height', media)).toBe('var(--hit-touch)');
        expect(rules.at(-1)!.media).toBe(media);
    });
});
