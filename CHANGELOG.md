## 1.0.46 (2026-10-20)

### Added

- **Idle sign-out, shared across tabs (`EfSessionIdleService`, `@elasticias/core`).** Signs the user out after `timeoutMs` without input (default 30 minutes, set through `EF_SESSION_IDLE_CONFIG`). A sliding server cookie never expires while a tab is open, because a polling app keeps it alive with nobody at the desk, so the check has to run in the browser. The last input is kept in localStorage, so work in one tab keeps every tab alive. Every check reads the wall clock, so a suspended background tab or a sleeping phone signs out on time, not hours late. The app owns the session: `start()` after a confirmed sign-in, `resume()` when restoring one from cache (it returns `false`, and fires once, when that session is already past the limit), `stop()` when it ends. Pair it with the server's `AddElasticiasCookieSession` (Elasticias.Framework 1.0.12) at the same timeout.

- **`ef-session-idle-dialog` (`@elasticias/ui`).** Host it once at the app root. It opens for the last `warningMs` (default one minute) with a countdown, "stay" and "sign out" (through `EF_SESSION`, offered only when the app provides it). Input does not dismiss it, so a mouse moving past cannot close it unread; closing it or "stay" counts as still here, and "stay" in one tab closes it in every tab. Keys the app provides: `session_idle_warning_title`, `session_idle_warning_body` (`{{seconds}}`), `session_idle_stay`, `common_logout`.

- **`EfDialogAction.autofocus`.** An action can take focus when the dialog opens, instead of PrimeNG's first focusable element. Opt-in, because focusing the primary everywhere would put Enter on "delete" in every confirmation.

## 1.0.45 (2026-10-15)

### Fixed

- **Toasts show above an open dialog.** `ef-toast-region` sat at `z-index: 1000`, under PrimeNG's modal mask (1101 for the first dialog), so an error raised by a dialog's save, such as the change-password validation toast, rendered behind the mask, blurred by its `backdrop-filter`, and its close button could not be reached. The region now uses a new `--z-toast` token (100000). PrimeNG adds a whole base (about 1000) each time the layer kind changes, so a select opened in a dialog is already 2102 and a value just above 1100 would not hold. PrimeNG's dialog focus trap only redirects Tab at its own sentinels, so clicking the toast's close button works with the dialog open, and the dialog stays open.

- **Icon-font arrows point the right way in Arabic.** The `ef-datepicker-advanced` back chevron and its previous/next month arrows, and the `ef-toolbar` back button, are PrimeIcons glyphs, which the bidi algorithm never mirrors. Under `dir="rtl"` the previous-month button sits on the right but pointed left, into the calendar. They now flip with `transform: scaleX(-1)` under RTL. The `ef-pager` arrows are unchanged on purpose: `‹ › « »` are Bidi_Mirrored characters, and Chromium and WebKit already draw them mirrored in an RTL pager (previous on the right, pointing right). A `scaleX(-1)` on top would flip them back.

- **The select and multiselect clear ✕ reaches the 48px touch tier.** The `ef-select` / `ef-multiselect` ✕ (`.es-clear`) shared the input ✕'s look but not its coarse-pointer rule, so on a phone or tablet its target was the painted 22px. It now gets the same invisible 48x48 overhang. It reserves only the inline room the target lacks after the trigger's 10px gap, so the target stops at the label's edge and at the caret's, and a tap on the caret still opens the panel. It takes no block margin, so the trigger stays 40px tall with or without a value. The ✕ size and the trigger gap are now custom properties (`--ef-clear-size`, `--es-gap`) that the touch tier reads, instead of literals repeated in both places.

- **The phone row ⋯ trigger has a full 48x48 target.** A staging smoke test on a 390px touch phone measured the trigger's target at 47.75px wide. On coarse pointers its `::after` is now a fixed `--hit-touch` box centred on the trigger (`max(48px, 100%)` each way), not an inset derived from the painted size and border. The trigger is `box-sizing: border-box` and `flex-shrink: 0`, and its 34x28 size is two custom properties (`--ef-row-trigger-w`, `--ef-row-trigger-h`) that the touch margins read. The real cause of the short width was the phone card's chevron: its 48px overlay ended on exactly the pixel where the trigger's began, and hit testing snaps to whole pixels, so the chevron (painted later) took that pixel. The chevron (`.mrow__actions + .mrow__disclosure`) now sits 1px further out. Measured with `elementFromPoint` on a 390px touch viewport: 48.9 x 48.9.

## 1.0.44 (2026-10-13)

### Fixed

- **The row ⋯ trigger and the clear ✕ keep their desktop size on touch screens.** The coarse-pointer tier grew their painted box to 48px, so every list row on a phone or tablet showed a 48px bordered circle. They now draw at 34x28 and 22px, and reach 48px through an invisible `::after` overhang, the pattern the 1.0.43 top bar uses. A margin reserves the same 48x48 footprint as before, so row height, card spacing and input layout are unchanged, and two triggers in adjacent compact rows cannot overlap. In the phone card list the chevron (`.mrow__disclosure`) moves 10.5px further from the trigger on coarse pointers: its 48px overlay used to cover the trigger's trailing 10px, so a tap there expanded the row.

- **The pager fits a phone, and a narrow card.** On a 390px phone the page buttons ran past the card and the card clipped them: "next" and the last page were unreachable (page 5 of the orders list put five of seven buttons out of reach). Two changes:
  - On `EfViewportService` mobile (767px and below), `ef-pager` shows first · previous · "5 sur 20" · next · last instead of the numbered window. Every page the window offered is still one or two taps away. New inputs `firstLabelKey` (default `common_page_first`) and `lastLabelKey` (`common_page_last`) label the new buttons; **apps must add both keys** to their i18n files.
  - `.pager`, `.pager .size` and `.pager .pages` wrap and can shrink (`min-width: 0`). When the lines-per-page block and the page buttons do not fit on one line, the buttons take their own line, at the end. This is what keeps the window inside a narrow card on a tablet, such as a report table with the side panel open. Desktop is unchanged when both halves fit.

- **Page buttons are 48px tall on touch screens.** The coarse-pointer tier set `.pg` to 48px, but the pager's own `.pager .pg { height: 32px }` outranked it, so page buttons were 48px wide and 32px tall on every phone and tablet. The touch rule is now `.pager .pg`, with `min-inline-size` instead of a fixed width so a four-digit page number keeps its padding.

## 1.0.43 (2026-10-13)

Tablet fixes (iPad, Surface). The layout changes were measured in Playwright on 768-1376px touch viewports in Chromium and WebKit. Touch gestures in WebKit, iOS long-press and Safari's toolbar (the dvh change) still need a real device.

### Breaking

- **`EfAppShellComponent.sideCollapsed` is now a read-only `computed` signal** (it was a writable `signal`). Code that called `.set()` on it stops compiling; use `toggleSide()` instead.
- **`EfDataCardComponent.openMenuCount` is removed.** It counted open row menus to lift the card's clip, which row menus no longer need (see Fixed).

### Changed

- **The side panel starts folded on a tablet.** In the `EfViewportService` tablet band (768-1279px), `ef-app-shell` folds the module side by default. An explicit choice stored under `EF_SIDE_COLLAPSED_KEY` (`ef.shell.side-collapsed`) still wins, on every viewport. The default is derived and never written to the preference store, so it follows a rotation or a resize until the user toggles. A store hydrate that removes the key brings the default back. Desktop and phone are unchanged.
  - With a server-backed store (ElasticERP's `ServerPreferenceStore` keeps `sideCollapsed` on the account), one toggle on any device is an explicit choice everywhere: from then on that user never gets the tablet default, and the server cannot drop the key. Test the default with an account that has never toggled.
- **Top-bar actions are plain icons.** `.ef-theme-toggle`, `.ef-app-top__logout` and `.ef-app-top__action` lose their bordered pill: they are now a 40px borderless box (`--hit-base`, `--r-md` radius) with an 18px glyph and a soft hover fill (only where the device can hover, so iOS does not leave it on the last icon tapped), in the style of the phone menu button. On coarse pointers the touch target is a 48px invisible overhang (`::after`, 4px each side) instead of a 48px painted circle. The `ef-app-top` actions slot gap is now 8px, so two lib controls' touch targets meet without overlapping. On coarse pointers the first lib control after app-projected content sits 12px from it, which also clears an app control that overhangs 8px (a 32px avatar with a 48px target). The login header's `ef-theme-toggle` follows, because it shares the class.
- **Top-bar tooltips use `pTooltip` instead of `title`.** The sign-out button and `ef-theme-toggle` show a PrimeNG tooltip on hover and on keyboard focus (`tooltipEvent="both"`), below the control. `ef-theme-toggle` gains a `tooltipPosition` input (default `'bottom'`). The accessible name stays on `aria-label`.
  - On touch, PrimeNG opens the tooltip on `touchstart` and does not cancel the click that follows. The theme switch keeps that (a stray toggle is harmless). **Sign-out does not:** on a screen without hover (`(hover: none)`) its tooltip is disabled, and a click that ends a touch or pen press held for 500ms or more is ignored, so holding it to find out what it does never signs the user out.
  - An app that projects its own `.ef-app-top__action` button should drop `title` and add `pTooltip` + `tooltipPosition="bottom"` + `tooltipEvent="both"` (disable it on `(hover: none)` too if the action is destructive), and drop any `::after` touch overlay of its own: the lib now draws a 4px one on coarse pointers.

### Fixed

- **A wide table scrolls sideways inside its card.** `ef-data-card` puts the desktop table in its own scroller (`.tbl-scroll`: `overflow-x: auto`, `overscroll-behavior-x: contain`) inside `.tbl-wrap`, which stays the clipping shell, so the head and pager do not scroll with the rows. Before, between 768px and the table's natural width, the right-hand columns (totals, row actions) were cut off with no way to reach them. The data card host, `.tbl-wrap` and `.tbl-scroll` all take `min-width: 0`, so the card shrinks instead of widening the page.
- **Row menus are never clipped by the table scroller.** The `ef-row-actions` menu is now `position: fixed`, placed from the trigger's rect (inline end, or inline start with `menuLeft`, mirrored in RTL; flips above when there is no room below). After its entry animation it corrects for a transformed ancestor and keeps itself inside the viewport, and a menu taller than the room on its side scrolls inside itself. A fixed menu does not follow its row, so any scroll outside the menu, or a change of viewport width, closes it (a height-only resize, such as an on-screen keyboard, does not). A row destroyed with its menu open removes its listeners and dispatches the close.
- **The data card keeps its rounded clip while a row menu is open.** `.tbl-wrap.has-open-menu` now follows only the density and columns menus. Counting row menus left the card unclipped for good when a row went while its menu was open.
- **Tablet toolbars keep their labelled buttons.** The coarse-pointer rule that squares `.detail-toolbar` / `.search-toolbar` buttons into 40px icons now applies only at 767px and below, the same breakpoint that hides their labels. On tablets, "Nouvelle commande" and the detail actions no longer spill out of 40px boxes or overlap, and the page no longer pans sideways by the overflow.
- **The shell fits the viewport Safari actually shows.** `ef-app-shell` and `ef-app-shell-mobile` are `height: 100dvh` and `ef-bottom-sheet` is `max-height: 85dvh`, each with a `vh` fallback. On iPadOS and iOS Safari, `vh` is the viewport with the toolbars hidden, so the bottom of the shell (the pager, the last rows, the side panel's footer) could sit under the browser toolbar.

## 1.0.42 (unreleased)

### Breaking

- **`EfDateRange.start` and `end` are now `Date | null`** (`@elasticias/screens`, re-exported by `@elasticias/ui`). The new `all_time` range has no bounds. Code that reads these fields directly under `strictNullChecks` stops compiling. To migrate, null-check them, or type a range that is always bounded as the new `EfBoundedDateRange`. `AbstractReportScreenV2.dateRange()` is already an `EfBoundedDateRange`, so report screens need no change.

### Changed

- **Search screens open on "Toute la période" ("All time") instead of "30 derniers jours".**
  - This changes no results: the 30-day window was only a label and was never sent.
  - The first search and `clear()` now send exactly what the chip shows.
  - Returning to a screen rebuilds the chip from the restored dates. A period the user picked comes back as a fixed custom range, not as the relative preset (a "this month" picked last month restores as last month's dates).
  - A screen whose backend has no date field sets `showDateFilter = false` and drops the picker from its template. The base then never sends dates.
- **The picker's "all time" row is opt-in.** `ef-datepicker-advanced` gains `allowAllTime`, which adds an `all_time` row ("Toute la période") that emits null bounds. List screens should set it. Report screens should not: a report screen that receives an open range falls back to its default period.

### Added

- **Per-column first sort direction.** `EfDataCardColumn.firstSortDirection` (`'asc' | 'desc'`) sets the direction of the first click on a column that is not the current sort. The default stays `'desc'`.
- **Brand colour tokens.** The Crescilio brand colours are in `_comptoir.scss`, each as an on-ink / on-paper pair:
  - `--cr-spring` / `--cr-spring-paper`: ERP;
  - `--cr-sun` / `--cr-sun-paper`: POS;
  - `--cr-violet` / `--cr-violet-paper`: Store;
  - `--cr-critical` / `--cr-critical-paper`: Coral, critical, system only.

### Fixed

- **`ef-toggleswitch` has a larger tap target on touch screens.** On coarse pointers its tap target grows towards 48x48 without changing its look. Inside a table the extra area is capped at the cell's padding (`--tbl-cell-pad-block`), so it never reaches a neighbouring row.

## 0.0.2 (2026-04-01)

This was a version bump only, there were no code changes.