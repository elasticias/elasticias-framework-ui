import { InjectionToken } from '@angular/core';

/**
 * How `ef-data-card` presents a row once the table becomes a list.
 *
 * - `row`  — a dense two-line row: the primary field, a muted secondary line,
 *            a status badge and the actions menu. Roughly eight to a screen,
 *            which is what a list of thousands needs.
 * - `card` — one card per record, every field on its own labelled line.
 *            Easier to read a single record, at about a record and a half
 *            per screen.
 *
 * Both expand to the same labelled detail; they differ only in the collapsed
 * state.
 */
export type EfDataCardMobileLayout = 'row' | 'card';

/**
 * App-wide default, so screens don't drift apart. Provide it once at the
 * application root; a screen that genuinely needs the other shape overrides
 * it with `[mobileLayout]`.
 *
 * ```ts
 * { provide: EF_DATA_CARD_MOBILE_LAYOUT, useValue: 'card' }
 * ```
 */
export const EF_DATA_CARD_MOBILE_LAYOUT = new InjectionToken<EfDataCardMobileLayout>(
    'EF_DATA_CARD_MOBILE_LAYOUT',
);
