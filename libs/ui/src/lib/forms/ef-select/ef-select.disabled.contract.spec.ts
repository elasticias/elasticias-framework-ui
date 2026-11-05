// @vitest-environment node
import { compile } from 'sass';
import postcss from 'postcss';
import { resolve } from 'node:path';

/**
 * A disabled select reads like every other disabled comptoir field. jsdom
 * does not compile the global stylesheet, so this reads the compiled CSS.
 * The selectors double `.p-select` / `.p-multiselect` so they outrank
 * PrimeNG's runtime `.p-select.p-disabled`, which is injected after this
 * sheet and won the tie with a plain `.es.p-disabled`.
 */
const patterns = postcss.parse(compile(resolve(__dirname, '../../_patterns.scss')).css);

function decl(selector: string, prop: string): string | undefined {
  let found: string | undefined;
  patterns.walkRules((r) => {
    if (r.parent?.type !== 'root' || !r.selectors.includes(selector)) return;
    r.walkDecls(prop, (d) => { if (d.parent === r) found = d.value; });
  });
  return found;
}

describe('disabled ef-select skin', () => {
  it.each(['.es.p-select.p-disabled', '.es.p-multiselect.p-disabled'])(
    '%s matches the disabled comptoir input fill and text',
    (selector) => {
      expect(decl(selector, 'background')).toBe(decl('.ef-input[disabled]', 'background'));
      expect(decl(selector, 'color')).toBe(decl('.ef-input[disabled]', 'color'));
      expect(decl(selector, 'border-color')).toBe('var(--rule)');
      expect(decl(selector, 'opacity')).toBe('1');
    },
  );

  it('mutes the label text', () => {
    expect(decl('.es.p-select.p-disabled .p-select-label', 'color')).toBe('var(--text-mute)');
    expect(decl('.es.p-multiselect.p-disabled .p-multiselect-label', 'color')).toBe('var(--text-mute)');
  });

  it('mutes the caret', () => {
    expect(decl('.es.p-select.p-disabled .p-select-dropdown', 'color')).toBe('var(--text-soft)');
  });

  it('no longer fades the whole control', () => {
    expect(decl('.es.p-disabled', 'opacity')).toBeUndefined();
  });
});
