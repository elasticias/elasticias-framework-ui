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