// @vitest-environment node
import { compile } from 'sass';
import postcss, { AtRule, Rule } from 'postcss';
import { resolve } from 'node:path';

/**
 * Contract for the order builder's bottom reserve. jsdom lays nothing out
 * and does not compile the global `_patterns.scss`, so these read the
 * compiled CSS. The pixel evidence (the floating total clear of the content
 * below it, fr and ar, 390 and 1024) comes from the real ERP build and is in
 * the ui-batch7 report.
 */
const lib = (p: string) => resolve(__dirname, '../..', p);
const css = (file: string) => postcss.parse(compile(lib(file)).css);

const patterns = css('_patterns.scss');
const builder = css('commerce/ef-order-builder/ef-order-builder.component.scss');

const media = (r: Rule) => {
  const m: string[] = [];
  for (let p = r.parent; p && p.type !== 'root'; p = p.parent) {
    if (p.type === 'atrule' && (p as AtRule).name === 'media') m.push((p as AtRule).params);
  }
  return m.join(' and ');
};

/** The last declaration of `prop` on a rule whose selector list contains `selector`. */
function decl(root: postcss.Root, selector: string, prop: string, where: (m: string) => boolean = (m) => m === '') {
  let found: string | undefined;
  root.walkRules((r) => {
    if (!r.selectors.includes(selector) || !where(media(r))) return;
    r.walkDecls(prop, (d) => { if (d.parent === r) found = d.value; });
  });
  return found;
}

describe('ef-order-builder floating total reserve', () => {
  it('no longer pads the builder itself (the reserve landed before any host card)', () => {
    let pads = false;
    builder.walkRules((r) => {
      if (!/\.order-builder(?![\w-])/.test(r.selector) || /ob-/.test(r.selector)) return;
      r.walkDecls(/^padding-(bottom|block-end)$/, () => { pads = true; });
    });
    expect(pads).toBe(false);
  });

  it('gives the floating total a fixed height from the shared token', () => {
    let size: string | undefined;
    builder.walkRules((r) => {
      if (media(r) === '' && r.selectors.some((x) => /\.ob-fab$/.test(x))) {
        r.walkDecls('block-size', (d) => { if (d.parent === r) size = d.value; });
      }
    });
    expect(size).toBe('var(--ef-order-fab-h)');
    expect(decl(patterns, ':root', '--ef-order-fab-h')).toBe('56px');
  });

  it('reserves the space at the end of the shell scroll area, without counting the tab bar twice', () => {
    const narrow = decl(patterns, '.ef-app-main__content:has(.order-builder .ob-fab)', 'padding-block-end', (m) => m.includes('max-width: 1279px'));
    expect(narrow).toBeDefined();
    expect(narrow).toContain('var(--ef-order-fab-h)');
    expect(narrow).not.toContain('--app-bottom-bar');
    const collapsed = decl(patterns, '.ef-app-main__content:has(.order-builder.ob-collapsed)', 'padding-block-end', (m) => m.includes('min-width: 1280px'));
    expect(collapsed).toBe(narrow);
  });
});
