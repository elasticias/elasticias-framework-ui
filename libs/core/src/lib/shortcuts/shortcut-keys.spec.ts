import { comboFromEvent, isTypingTarget, normaliseKeys } from './shortcut-keys';

function event(init: Partial<{
    code: string;
    key: string;
    metaKey: boolean;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
}>) {
    return {
        code: '',
        key: '',
        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        ...init,
    };
}

describe('comboFromEvent', () => {
    it('reads mod from Meta on macOS', () => {
        const combo = comboFromEvent(event({ code: 'KeyD', key: 'd', metaKey: true }), true);
        expect(combo).toBe('mod+d');
    });

    it('does not read mod from Ctrl on macOS', () => {
        const combo = comboFromEvent(event({ code: 'KeyD', key: 'd', ctrlKey: true }), true);
        expect(combo).toBe('d');
    });

    it('reads mod from Ctrl everywhere else', () => {
        const combo = comboFromEvent(event({ code: 'KeyD', key: 'd', ctrlKey: true }), false);
        expect(combo).toBe('mod+d');
    });

    it('does not read mod from Meta off macOS', () => {
        const combo = comboFromEvent(event({ code: 'KeyD', key: 'd', metaKey: true }), false);
        expect(combo).toBe('d');
    });

    it('reads the physical `/` key by code, independent of the shifted character it prints', () => {
        const combo = comboFromEvent(event({ code: 'Slash', key: '?', shiftKey: true }), false);
        expect(combo).toBe('shift+/');
    });
});

describe('normaliseKeys', () => {
    it('orders modifiers the same way regardless of input order', () => {
        expect(normaliseKeys('shift+mod+x')).toBe(normaliseKeys('mod+shift+x'));
    });
});

describe('isTypingTarget', () => {
    it('is true for an input', () => {
        expect(isTypingTarget(document.createElement('input'))).toBe(true);
    });

    it('is true for a textarea', () => {
        expect(isTypingTarget(document.createElement('textarea'))).toBe(true);
    });

    it('is true for a select', () => {
        expect(isTypingTarget(document.createElement('select'))).toBe(true);
    });

    it('is falsy for a plain button', () => {
        // jsdom does not implement `isContentEditable` at all (it reads
        // `undefined` even for a non-editable element), so this checks
        // `toBeFalsy` rather than a strict `toBe(false)`. See the note in
        // ef-shortcut.service.spec.ts on the same limitation.
        expect(isTypingTarget(document.createElement('button'))).toBeFalsy();
    });

    it('is false for the document itself', () => {
        expect(isTypingTarget(document)).toBe(false);
    });
});
