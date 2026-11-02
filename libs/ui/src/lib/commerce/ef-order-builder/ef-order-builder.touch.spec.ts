// @vitest-environment node
import { compile } from 'sass';
import postcss, { AtRule, Rule } from 'postcss';
import { resolve } from 'node:path';

/**
 * Touch targets inside the order builder, read from the compiled CSS (jsdom
 * evaluates no pointer media query). Measured in the real ERP build too, see
 * the ui-batch7 report, fix round 1.
 */
const lib = (p: string) => resolve(__dirname, '../..', p);
const css = (file: string) => postcss.parse(compile(lib(file)).css);

const builder = css('commerce/ef-order-builder/ef-order-builder.component.scss');

const media = (r: Rule) => {
  const m: string[] = [];
  for (let p = r.parent; p && p.type !== 'root'; p = p.parent) {
    if (p.type === 'atrule' && (p as AtRule).name === 'media') m.push((p as AtRule).params);
  }
  return m.join(' and ');
};

describe('ef-order-builder touch targets', () => {
  const coarse = (m: string) => m.includes('pointer: coarse');
  const onCoarse = (suffix: RegExp, prop: string) => {
    let v: string | undefined;
    builder.walkRules((r) => {
      if (!coarse(media(r)) || !r.selectors.some((x) => suffix.test(x))) return;
      r.walkDecls(prop, (d) => { if (d.parent === r) v = d.value; });
    });
    return v;
  };

  it('the summary button in the floating total is 48px on a coarse pointer', () => {
    expect(onCoarse(/\.ob-fab \.open$/, 'min-block-size')).toBe('var(--hit-touch)');
  });

  it('an editable line value is as tall as its editor on a coarse pointer, so the row does not jump', () => {
    expect(onCoarse(/\.ln-val$/, 'min-block-size')).toBe('var(--hit-field)');
  });
});
