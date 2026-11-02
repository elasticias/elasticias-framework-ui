/**
 * The value a text field takes when `text` is inserted where the user left
 * the caret, and where the caret goes next.
 *
 * `selectionStart` is only the user's choice once the field has had focus:
 * before that the browser reports wherever writing `value` left it. A field
 * never entered, or one whose type has no selection (`email`, `number`),
 * gets the text appended. A field that lost focus keeps its last selection,
 * which is what a toolbar button beside it relies on.
 */
export function insertAtSelection(
    field: HTMLInputElement | HTMLTextAreaElement,
    text: string,
    wasFocused: boolean,
): { value: string; caret: number } {
    const current = field.value;
    let start: number | null = null;
    let end: number | null = null;
    try {
        start = field.selectionStart;
        end = field.selectionEnd;
    } catch {
        // Some input types throw on selection access instead of returning null.
    }
    if (!wasFocused || start === null || end === null) {
        return { value: current + text, caret: current.length + text.length };
    }
    const from = Math.min(start, end, current.length);
    const to = Math.min(Math.max(start, end), current.length);
    return { value: current.slice(0, from) + text + current.slice(to), caret: from + text.length };
}

/** Moves the caret, ignoring input types that have no selection. */
export function placeCaret(field: HTMLInputElement | HTMLTextAreaElement, caret: number): void {
    field.focus();
    try {
        field.setSelectionRange(caret, caret);
    } catch {
        // `email` / `number` inputs: no selection API, the caret stays at the end.
    }
}
