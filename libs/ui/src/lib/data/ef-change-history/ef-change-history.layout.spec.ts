// @vitest-environment node
import { compile } from 'sass';
import postcss, { AtRule, Rule } from 'postcss';
import { resolve } from 'node:path';

/** jsdom evaluates no media query, so this reads the compiled CSS. */
const css = postcss.parse(compile(resolve(__dirname, 'ef-change-history.component.scss')).css);

const media = (r: Rule) => {
  const m: string[] = [];
  for (let p = r.parent; p && p.type !== 'root'; p = p.parent) {
    if (p.type === 'atrule' && (p as AtRule).name === 'media') m.push((p as AtRule).params);
  }
  return m.join(' and ');
};

function decls(selector: string, where: string) {
  const out: Record<string, string> = {};
  css.walkRules((r) => {
    if (!r.selectors.includes(selector) || media(r) !== where) return;
    r.walkDecls((d) => { if (d.parent === r) out[d.prop] = d.value; });
  });
  return out;
}

describe('ef-change-history compact values', () => {
  const value = '.timeline--compact .ch-changes .strong';

  it('keeps one ellipsised line on a wide screen', () => {
    expect(decls(value, '')).toMatchObject({ 'white-space': 'nowrap', 'text-overflow': 'ellipsis' });
  });

  it('wraps a long value on a phone instead of cutting it', () => {
    expect(decls(value, '(max-width: 767px)')).toMatchObject({
      'white-space': 'normal',
      'overflow-wrap': 'anywhere',
      overflow: 'visible',
    });
    expect(decls('.timeline--compact .ch-changes .text-mute', '(max-width: 767px)')['overflow-wrap']).toBe('anywhere');
    expect(decls('.timeline--compact .ch-changes li', '(max-width: 767px)')['flex-wrap']).toBe('wrap');
  });

  it('declares the phone rule after the base rule, so it wins', () => {
    const order: string[] = [];
    css.walkRules((r) => { if (r.selectors.includes(value)) order.push(media(r)); });
    expect(order.indexOf('(max-width: 767px)')).toBeGreaterThan(order.indexOf(''));
  });
});
