import { formatShortcut } from './format-shortcut';

describe('formatShortcut', () => {
    it('maps mod to the Command glyph on macOS', () => {
        expect(formatShortcut('mod+d', true)).toBe('⌘D');
    });

    it('maps mod to Ctrl everywhere else', () => {
        expect(formatShortcut('mod+d', false)).toBe('Ctrl+D');
    });

    it('formats enter as the return glyph on both platforms', () => {
        expect(formatShortcut('enter', true)).toBe('↵');
        expect(formatShortcut('enter', false)).toBe('↵');
    });

    it('formats a bare letter as its uppercase form', () => {
        expect(formatShortcut('e', true)).toBe('E');
        expect(formatShortcut('e', false)).toBe('E');
    });

    it('formats shift+/ as the question mark it prints, on both platforms', () => {
        expect(formatShortcut('shift+/', true)).toBe('?');
        expect(formatShortcut('shift+/', false)).toBe('?');
    });

    it('is order-independent for modifier tokens', () => {
        expect(formatShortcut('shift+mod+x', false)).toBe(formatShortcut('mod+shift+x', false));
    });
});
