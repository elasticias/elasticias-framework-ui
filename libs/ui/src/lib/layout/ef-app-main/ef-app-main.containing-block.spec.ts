// @vitest-environment node
import { compile } from 'sass';
import postcss from 'postcss';
import { resolve } from 'node:path';

/**
 * jsdom lays nothing out, so these read the compiled CSS. Absolutely
 * positioned descendants (sr-only counters, hidden file and switch inputs)
 * must resolve against a shell element, never the initial containing block,
 * or they extend the document and the shell's sidebar scrolls away.
 */
const lib = (p: string) => resolve(__dirname, '..', '..', p);
const position = (file: string, selector: string) => {
  let found: string | undefined;
  postcss.parse(compile(lib(file)).css).walkRules((r) => {
    if (r.selectors.includes(selector)) r.walkDecls('position', (d) => (found = d.value));
  });
  return found;
};

describe('scroll leak containing blocks', () => {
  it('the app main scroller is position: relative', () => {
    expect(position('layout/ef-app-main/ef-app-main.component.scss', '.ef-app-main__content')).toBe('relative');
  });
  it('ef-localized-input host contains its sr-only counter text', () => {
    expect(position('forms/ef-localized-input/ef-localized-input.component.scss', ':host')).toBe('relative');
  });
});
