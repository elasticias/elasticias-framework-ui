// @vitest-environment node
import { compile } from 'sass';
import postcss, { AtRule, Rule } from 'postcss';
import { resolve } from 'node:path';

/**
 * Contract for the detail toolbar's reflow at tablet and desktop width. jsdom
 * lays nothing out, so this reads the compiled `_patterns.scss`. The pixel
 * evidence (an order held by a colleague, seven actions, fr at 1280) is in the
 * store-operations T10 report.
 *
 * The identity column used to be `flex: 1` (basis 0), so it always "fit" and
 * the actions never wrapped: with many actions it shrank to a sliver and the
 * notices in it ("Prise en charge par …") were cut to an ellipsis. With a
 * real basis, the actions wrap onto their own row instead.
 */
const patterns = postcss.parse(compile(resolve(__dirname, '../../_patterns.scss')).css);

const media = (r: Rule) => {
  const m: string[] = [];
  for (let p = r.parent; p && p.type !== 'root'; p = p.parent) {
    if (p.type === 'atrule' && (p as AtRule).name === 'media') m.push((p as AtRule).params);
  }
  return m.join(' and ');
};

/** Every declaration of `prop` on rules whose selector list contains `selector`, in source order. */
function decls(selector: string, prop: string) {
  const found: { value: string; media: string }[] = [];
  patterns.walkRules((r) => {
    if (!r.selectors.includes(selector)) return;
    r.walkDecls(prop, (d) => {
      if (d.parent === r) found.push({ value: d.value, media: media(r) });
    });
  });
  return found;
}

describe('ef-detail-toolbar reflow', () => {
  it('gives the identity a real basis, so many actions wrap below it instead of squeezing it', () => {
    const base = decls('.detail-toolbar .left', 'flex').filter((d) => d.media === '');
    expect(base.length).toBeGreaterThan(0);
    const value = base[base.length - 1].value;
    const basis = value.split(/\s+/).slice(2).join(' ');
    expect(basis).toContain('--detail-toolbar-identity-min');
    expect(value.startsWith('1 1 ')).toBe(true);
  });

  it('lets the identity shrink below that basis only when it is alone on its row', () => {
    const minWidth = decls('.detail-toolbar .left', 'min-width').filter((d) => d.media === '');
    expect(minWidth[minWidth.length - 1]?.value).toBe('0');
  });

  it('keeps the phone layout (identity and actions each on a full row) as the last word', () => {
    const all = decls('.detail-toolbar .left', 'flex');
    const last = all[all.length - 1];
    expect(last.media).toContain('max-width: 767px');
    expect(last.value).toBe('1 1 100%');
  });

  it('keeps the label of a keepInView action on a phone, after the rule that hides the others', () => {
    const hide = decls('.detail-toolbar .right .btn > span', 'display');
    const keep = decls('.detail-toolbar .right .btn.btn--keep-label > span', 'display');
    expect(hide.some((d) => d.media.includes('max-width: 767px') && d.value === 'none')).toBe(true);
    expect(keep.length).toBeGreaterThan(0);
    expect(keep[keep.length - 1].value).not.toBe('none');
    expect(keep[keep.length - 1].media).toContain('max-width: 767px');
  });
});
