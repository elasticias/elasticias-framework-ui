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
    it('never clips the box, so the link bubble can leave the field', () => {
        // Quill positions the bubble inside .ql-container; overflow on the box cut it off.
        expect(value('ef-rich-text .ef-rich-text__box', 'overflow')).toBeUndefined();
        expect(value('ef-rich-text .ef-rich-text__box', 'overflow-x')).toBeUndefined();
        // The rounded look comes from the children instead.
        expect(value('ef-rich-text .ql-toolbar.ql-snow', 'border-radius')).toBe('var(--r-md) var(--r-md) 0 0');
        expect(value('ef-rich-text .ql-container.ql-snow', 'border-radius')).toBe('0 0 var(--r-md) var(--r-md)');
    });

    it('paints the icons with the text colour', () => {
        expect(value('ef-rich-text .ql-snow .ql-stroke', 'stroke')).toBe('currentColor');
        expect(value('ef-rich-text .ql-snow.ql-toolbar button', 'color')).toBe('var(--text-mute)');
    });

    it('writes the text in the theme text colour, not PrimeNG\'s', () => {
        // At PrimeNG's own specificity plus the element, so it wins.
        expect(value('ef-rich-text .p-editor .p-editor-content .ql-editor', 'color')).toBe('var(--text)');
        expect(value('ef-rich-text .p-editor .p-editor-content .ql-editor', 'background')).toBe('transparent');
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

    it('draws Quill 2 list markers: a bullet for a bulleted item, a number for an ordered one', () => {
        // Quill 2 renders every list as <ol><li data-list>, while PrimeNG's
        // editor style numbers every ol li (Quill 1 markup).
        expect(value('ef-rich-text .ql-editor li[data-list]::before', 'content')).toBe('none');
        expect(value('ef-rich-text .ql-editor li[data-list=bullet] > .ql-ui::before', 'content')).toBe('"\\2022"');
        expect(value('ef-rich-text .ql-editor li[data-list=ordered] > .ql-ui::before', 'content')).toBe("counter(list-0, decimal) \". \"");
        expect(value('ef-rich-text .ql-editor li[data-list=ordered]', 'counter-increment')).toBe('list-0');
        expect(value('ef-rich-text .ql-editor li[data-list=bullet]', 'counter-increment')).toBe('none');
    });

    it('drops Quill\'s end-side list padding, so Arabic lists keep the full line', () => {
        expect(value('ef-rich-text .ql-editor li[data-list]', 'padding-inline-end')).toBe('0');
    });

    it('aligns the text to its start, so Arabic sits on the right', () => {
        // PrimeNG and Quill set a physical text-align: left on .ql-editor.
        expect(value('ef-rich-text .ql-editor', 'text-align')).toBe('start');
    });

    it('keeps the page direction on the host when an app sets dir on it', () => {
        // A static dir="rtl" also lands on the host and would flip the label
        // and the toolbar; only the editing area follows the text's dir.
        expect(value('ef-rich-text[dir]', 'direction')).toBe('inherit');
    });

    it('places list markers with logical properties, so they follow dir', () => {
        expect(value('ef-rich-text .ql-editor li[data-list]', 'padding-inline-start')).toBe('1.5em');
        expect(value('ef-rich-text .ql-editor li[data-list] > .ql-ui::before', 'margin-inline-start')).toBe('-1.5em');
        const physical: string[] = [];
        root.walkDecls(d => {
            if (/(padding|margin)-(left|right)|^(left|right)$/.test(d.prop) && (d.parent as Rule).selectors?.some(x => x.includes('data-list'))) physical.push(d.prop);
        });
        expect(physical).toEqual([]);
    });

    it('emits no @charset, so the stylesheet stays ASCII once compiled', () => {
        expect(compile(resolve(__dirname, 'ef-rich-text.component.scss')).css.startsWith('@charset')).toBe(false);
    });

    it('sizes toolbar buttons to --hit-touch on touch, last in the file', () => {
        const media = '(max-width: 767px), (pointer: coarse)';
        expect(value('ef-rich-text .ql-snow.ql-toolbar button', 'height', media)).toBe('var(--hit-touch)');
        expect(rules.at(-1)!.media).toBe(media);
    });
});
