import { InjectionToken, Type } from '@angular/core';

/**
 * Loads the rich text editor component that `ef-localized-input`'s `rich`
 * mode renders. The editor lives in the `@elasticias/ui/rich-text` entry
 * point so an app that never edits rich text neither bundles PrimeNG's Editor
 * nor needs `quill` installed. Provide it with `provideEfRichText()` from that
 * entry (the editor code is in the app's main bundle, Quill itself still loads
 * lazily the first time an editor renders), or with your own loader to defer
 * the editor code too:
 *
 * ```ts
 * { provide: EF_RICH_TEXT, useValue: () => import('@elasticias/ui/rich-text').then(m => m.EfRichTextComponent) }
 * ```
 */
export const EF_RICH_TEXT = new InjectionToken<() => Promise<Type<unknown>>>('EF_RICH_TEXT');

/** Length of the text a reader sees in an HTML fragment, tags not counted. Browser only: it parses with `document`. */
export function plainTextLength(html: string | null | undefined): number {
    if (!html) return 0;
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    return (tpl.content.textContent ?? '').length;
}
