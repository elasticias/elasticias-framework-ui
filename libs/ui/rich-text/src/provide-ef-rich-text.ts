import { Provider } from '@angular/core';
import { EF_RICH_TEXT } from '@elasticias/ui';
import { EfRichTextComponent } from './ef-rich-text.component';

/**
 * Turns on `ef-localized-input`'s `rich` mode for the app. Quill still loads
 * lazily, the first time an editor renders.
 *
 * ```ts
 * providers: [provideEfRichText()]
 * ```
 */
export function provideEfRichText(): Provider {
    return { provide: EF_RICH_TEXT, useValue: () => Promise.resolve(EfRichTextComponent) };
}
