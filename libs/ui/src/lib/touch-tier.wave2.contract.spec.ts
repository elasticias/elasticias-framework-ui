// @vitest-environment node
import { compile } from 'sass';
import postcss, { AtRule, Rule } from 'postcss';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * QA D2/D3/D4/D6/D7/D8/D10. jsdom evaluates no media query, so these read
 * the compiled CSS: which rule applies under which query.
 */
const patterns = postcss.parse(compile(resolve(__dirname, '_patterns.scss')).css);
const tabs = postcss.parse(compile(resolve(__dirname, 'layout/ef-tabs/ef-tabs.component.scss')).css);

const media = (r: Rule) => {
  const m: string[] = [];
  for (let p = r.parent; p && p.type !== 'root'; p = p.parent) {
    if (p.type === 'atrule' && (p as AtRule).name === 'media') m.push((p as AtRule).params);
  }
  return m.join(' and ');
};

function decl(root: postcss.Root, selector: string, prop: string, where: (m: string) => boolean) {
  let found: string | undefined;
  root.walkRules((r) => {
    if (!r.selectors.includes(selector) || !where(media(r))) return;
    r.walkDecls(prop, (d) => { if (d.parent === r) found = d.value; });
  });
  return found;
}

const coarse = (m: string) => m === '(pointer: coarse)';
const phone = (m: string) => m === '(max-width: 767px)';
const base = (m: string) => m === '';

describe('touch tier wave 2', () => {
  it.each([
    ['.row-actions__item', 'min-height'],
    ['.ef-menu__item', 'min-height'],
    ['.es-confirm .p-confirmdialog-accept-button', 'min-height'],
    ['.es-confirm .p-confirmdialog-reject-button', 'min-height'],
  ])('%s reaches --hit-touch on a coarse pointer (D4, D7)', (sel, prop) => {
    expect(decl(patterns, sel, prop, coarse)).toBe('var(--hit-touch)');
  });

  it.each(['width', 'height'])('the dialog close has a 48px %s on a coarse pointer (D2)', (prop) => {
    expect(decl(patterns, '.es-dialog .es-dialog__close', prop, coarse)).toBe('var(--hit-touch)');
    expect(decl(patterns, '.es-dialog .es-dialog__close', prop, base)).toBe('32px');
  });

  it('wraps the pdf preview footer only under 768px (D2)', () => {
    const sel = '.es-dialog.ef-pdf-preview-dialog .p-dialog-footer';
    expect(decl(patterns, sel, 'flex-wrap', phone)).toBe('wrap');
    expect(decl(patterns, sel, 'flex-wrap', base)).toBeUndefined();
  });

  it.each([':host(.ef-tabs--pill) .ef-tabs__tab', ':host(.ef-tabs--underline) .ef-tabs__tab'])(
    '%s is 48px on a coarse pointer and keeps its desktop floor otherwise (D6)',
    (sel) => {
      expect(decl(tabs, sel, 'min-height', coarse)).toBe('var(--hit-touch)');
      expect(decl(tabs, sel, 'min-height', base)).toBeDefined();
    },
  );

  it('keeps the row trigger, disclosure and clear targets at 48px (D3, D8)', () => {
    expect(decl(patterns, '.row-actions__trigger::after', 'width', coarse)).toBe('max(var(--hit-touch), 100%)');
    expect(decl(patterns, '.ef-clear::after', 'inset', coarse)).toBe('calc((var(--hit-touch) - var(--ef-clear-size)) / -2)');
    const card = readFileSync(resolve(__dirname, 'data/ef-data-card/ef-data-card.component.scss'), 'utf8');
    expect(card).toMatch(/\.mrow__disclosure[\s\S]*?width: var\(--hit-touch\)/);
  });

  it('isolates a Latin code as LTR (D10)', () => {
    for (const sel of ['.tbl .ref', '.mrow__primary .ref']) {
      expect(decl(patterns, sel, 'direction', base)).toBe('ltr');
      expect(decl(patterns, sel, 'unicode-bidi', base)).toBe('isolate');
    }
  });
});
