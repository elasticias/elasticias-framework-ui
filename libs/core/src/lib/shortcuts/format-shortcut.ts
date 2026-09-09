import { normaliseKeys } from './shortcut-keys';

/** Reads the platform once. `userAgentData` is the current standard; the
 *  `platform` string fallback covers browsers that don't expose it yet. */
function detectMacPlatform(): boolean {
    if (typeof navigator === 'undefined') return false;
    const uaData = (navigator as Navigator & { userAgentData?: { platform?: string } })
        .userAgentData;
    const platform = uaData?.platform ?? navigator.platform ?? '';
    return /mac/i.test(platform);
}

/**
 * Detected once, at module load. `formatShortcut` uses it by default, and
 * `ef-shortcuts-dialog` reads it directly to decide whether its "Ctrl on
 * Windows and Linux" line is news (it isn't, on a Mac) or worth a sentence.
 */
export const isMacPlatform: boolean = detectMacPlatform();

const MAC_MODIFIER_GLYPHS: Record<string, string> = {
    mod: '⌘',
    shift: '⇧',
    alt: '⌥',
};

const OTHER_MODIFIER_WORDS: Record<string, string> = {
    mod: 'Ctrl',
    shift: 'Shift',
    alt: 'Alt',
};

/** Named keys with a glyph of their own, distinct from their letter. */
const KEY_GLYPHS: Record<string, string> = {
    enter: '↵',
    escape: 'Esc',
    backspace: '⌫',
    space: 'Space',
    tab: 'Tab',
};

/**
 * A produced character that stands in for the whole combo. Shift plus the
 * physical `/` key always reads as the question mark it prints — showing
 * it as `'Shift' + '/'` would describe the keys pressed rather than the
 * shortcut a person recognises.
 */
const SHIFTED_SYMBOL_GLYPHS: Record<string, string> = {
    '/': '?',
};

/**
 * Formats a `keys` registration for display. One registration, correct on
 * both platforms:
 *
 * - `'mod+d'`   → `⌘D` on macOS, `Ctrl+D` elsewhere
 * - `'enter'`   → `↵`
 * - `'e'`       → `E`
 * - `'shift+/'` → `?`
 *
 * `mac` defaults to the platform this code is actually running on. Pass it
 * explicitly only to render for a platform other than the current one.
 */
export function formatShortcut(keys: string, mac: boolean = isMacPlatform): string {
    const tokens = normaliseKeys(keys).split('+');
    const key = tokens[tokens.length - 1];
    const modifiers = tokens.slice(0, -1);

    if (modifiers.length === 1 && modifiers[0] === 'shift' && SHIFTED_SYMBOL_GLYPHS[key]) {
        return SHIFTED_SYMBOL_GLYPHS[key];
    }

    const displayKey = KEY_GLYPHS[key] ?? key.toUpperCase();

    if (mac) {
        return modifiers.map(modifier => MAC_MODIFIER_GLYPHS[modifier] ?? modifier).join('') + displayKey;
    }

    const words = modifiers.map(modifier => OTHER_MODIFIER_WORDS[modifier] ?? modifier);
    return [...words, displayKey].join('+');
}
