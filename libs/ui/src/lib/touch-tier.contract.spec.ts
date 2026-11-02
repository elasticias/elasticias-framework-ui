// @vitest-environment node
import { compile } from 'sass';
import postcss, { AtRule, Rule } from 'postcss';
import { resolve } from 'node:path';

/**
 * Contract for the touch tier of form fields. jsdom evaluates no `pointer`
 * media query, does not compile the global stylesheets and lays nothing
 * out, so these read the compiled CSS. The pixel evidence (48px fields on a
 * touch phone, 40px with a mouse, in the real ERP build) is in the
 * ui-batch7 report.
 */
const lib = (p: string) => resolve(__dirname, p);
const css = (file: string) => postcss.parse(compile(lib(file)).css);

const comptoir = css('_comptoir.scss');
const patterns = css('_patterns.scss');

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

const coarse = (m: string) => m.includes('pointer: coarse') && !m.includes('max-width');

describe('touch tier for form fields', () => {
  it('declares --hit-field as --hit-base, switching to --hit-touch on a coarse pointer', () => {
    expect(decl(comptoir, ':root', '--hit-field')).toBe('var(--hit-base)');
    expect(decl(comptoir, ':root', '--hit-field', coarse)).toBe('var(--hit-touch)');
  });

  it('leaves --hit-base itself alone on touch (icons and toolbars paint from it)', () => {
    expect(decl(comptoir, ':root', '--hit-base', coarse)).toBeUndefined();
  });

  it.each([
    ['.ef-input', 'height'],
    ['.ef-select-native', 'height'],
    ['.ef-field select', 'height'],
    ['.ef-input-group', 'min-height'],
    ['.es.p-select', 'min-height'],
    ['.es.p-multiselect', 'min-height'],
    ['.dp__field-trigger', 'min-height'],
  ])('%s sizes its %s from --hit-field', (selector, prop) => {
    expect(decl(patterns, selector, prop)).toBe('var(--hit-field)');
  });

  it('centres the datepicker clear on the field height', () => {
    expect(decl(patterns, '.dp__field-clear', 'top')).toBe('calc(var(--hit-field) / 2)');
  });

  it('keeps the small select at its dense 32px', () => {
    expect(decl(patterns, '.es--sm.p-select', 'min-height')).toBe('32px');
  });
});
