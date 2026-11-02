// @vitest-environment node
import { compile } from 'sass';
import postcss from 'postcss';
import { resolve } from 'node:path';

/**
 * The native (comptoir) select draws its chevron as a background image. A
 * physical `right 12px` put it on the same side as the text in Arabic, where
 * `padding-inline-end` had already moved the reserved space to the left, so
 * the chevron sat on the value. jsdom lays nothing out, so this reads the
 * compiled CSS.
 */
const patterns = postcss.parse(compile(resolve(__dirname, '../../_patterns.scss')).css);

function position(selector: string): string | undefined {
  let found: string | undefined;
  patterns.walkRules((r) => {
    if (!r.selectors.includes(selector)) return;
    r.walkDecls('background-position', (d) => { if (d.parent === r) found = d.value; });
  });
  return found;
}

describe('native select chevron', () => {
  it('sits at the right in left-to-right', () => {
    expect(position('.ef-select-native')).toBe('right 12px center');
  });

  it.each(['[dir=rtl] .ef-select-native', '[dir=rtl] .ef-field select'])(
    'moves to the left under %s',
    (selector) => {
      expect(position(selector)).toBe('left 12px center');
    },
  );

  it('reserves its space on the inline end', () => {
    let pad: string | undefined;
    patterns.walkRules((r) => {
      if (r.selectors.includes('.ef-select-native')) r.walkDecls('padding-inline-end', (d) => (pad = d.value));
    });
    expect(pad).toBe('36px');
  });

  it('the PrimeNG trigger pads logically, so the two sides swap in Arabic', () => {
    let found: string | undefined;
    patterns.walkRules((r) => {
      if (r.selectors.includes('.es.p-select')) r.walkDecls('padding-inline', (d) => (found = d.value));
    });
    expect(found).toBe('14px 10px');
  });
});
