## 1.0.43 (unreleased)

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