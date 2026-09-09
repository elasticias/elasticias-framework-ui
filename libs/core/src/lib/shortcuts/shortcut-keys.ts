/**
 * Key-combo parsing shared by `EfShortcutService` (matching a keydown event
 * against the registry) and `formatShortcut` (rendering a registration for
 * display). Kept internal to the shortcuts folder: neither export is part
 * of the public `@elasticias/core` surface.
 */

/** Fixed order modifiers are stored and compared in, so `'shift+mod+x'`
 *  and `'mod+shift+x'` normalise to the same string. */
const MODIFIER_ORDER = ['mod', 'shift', 'alt'] as const;

/**
 * Physical-key `KeyboardEvent.code` values mapped to the token used in a
 * `keys` string. `code` identifies the physical key regardless of what
 * Shift makes it print, which is what lets `'shift+/'` match the key next
 * to Right Shift on a US layout even though pressing it actually produces
 * `'?'`.
 */
const CODE_KEYS: Record<string, string> = {
    Enter: 'enter',
    Escape: 'escape',
    Space: 'space',
    Backspace: 'backspace',
    Tab: 'tab',
    Slash: '/',
};

/** Normalises a `keys` registration string into a canonical, comparable
 *  form: lowercase tokens, modifiers first in a fixed order. */
export function normaliseKeys(raw: string): string {
    const tokens = raw
        .toLowerCase()
        .split('+')
        .map(token => token.trim())
        .filter(Boolean);
    const modifierTokens = MODIFIER_ORDER.filter(modifier => tokens.includes(modifier));
    const rest = tokens.filter(token => !(MODIFIER_ORDER as readonly string[]).includes(token));
    return [...modifierTokens, ...rest].join('+');
}

interface KeyEventLike {
    code: string;
    key: string;
    metaKey: boolean;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
}

/** The canonical key token for an event, independent of Shift. `KeyD`
 *  is `'d'` whether or not Shift was held. */
function keyToken(event: KeyEventLike): string {
    if (CODE_KEYS[event.code]) return CODE_KEYS[event.code];
    if (event.code?.startsWith('Key')) return event.code.slice(3).toLowerCase();
    if (event.code?.startsWith('Digit')) return event.code.slice(5);
    return event.key.toLowerCase();
}

/**
 * Builds the normalised combo a keydown event represents, e.g. `'mod+d'`.
 * `isMac` decides which physical modifier counts as `mod`: Meta on macOS,
 * Control everywhere else.
 */
export function comboFromEvent(event: KeyEventLike, isMac: boolean): string {
    const tokens: string[] = [];
    if (isMac ? event.metaKey : event.ctrlKey) tokens.push('mod');
    if (event.shiftKey) tokens.push('shift');
    if (event.altKey) tokens.push('alt');
    tokens.push(keyToken(event));
    return normaliseKeys(tokens.join('+'));
}

/**
 * True while the event target is a place the user is typing: an input, a
 * textarea, a select, or anything `contenteditable`. The dispatcher checks
 * this before anything else. Without it every shortcut key is a reserved
 * word in every text field in the app.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    return target.isContentEditable;
}
