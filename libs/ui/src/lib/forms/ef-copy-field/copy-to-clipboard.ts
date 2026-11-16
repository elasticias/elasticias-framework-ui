/**
 * Puts `text` on the clipboard. Resolves `false` where the clipboard is
 * unavailable (an insecure origin, a refused permission) so the caller can fall
 * back to selecting the text; it never throws.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        if (!navigator.clipboard?.writeText) return false;
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}
