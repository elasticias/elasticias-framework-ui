// Pipes
export { EfCurrencyPipe } from './lib/pipes/ef-currency.pipe';
export { TruncatePipe } from './lib/pipes/truncate.pipe';
export { EfCompactPipe } from './lib/pipes/ef-compact.pipe';

// Commerce
export { EfPriceDisplayComponent } from './lib/commerce/ef-price-display.component';
export { EfQuantitySelectorComponent } from './lib/commerce/ef-quantity-selector.component';
export { EfOrderBuilderComponent } from './lib/commerce/ef-order-builder/ef-order-builder.component';
export * from './lib/commerce/ef-order-builder/ef-order-builder.component.types';
export { EfProductTypeaheadComponent } from './lib/commerce/ef-product-typeahead/ef-product-typeahead.component';
export * from './lib/commerce/ef-product-typeahead/ef-product-typeahead.component.types';
export { EfOrderSummaryComponent } from './lib/commerce/ef-order-summary/ef-order-summary.component';
export type { ProductCountGroup, ProductCountGroupLabel, ProductWithCountGroup } from './lib/commerce/ef-order-summary/ef-order-summary.component';
export { EfProductCatalogueFilterComponent } from './lib/commerce/ef-product-catalogue-filter/ef-product-catalogue-filter.component';
export type { CategoryItem, CategoryGroup, CategoryAssignment, SelectedFilter } from './lib/commerce/ef-product-catalogue-filter/ef-product-catalogue-filter.component';
export { EfProductCatalogueComponent } from './lib/commerce/ef-product-catalogue/ef-product-catalogue.component';
export type { CatalogueProduct, CatalogueProductVariant } from './lib/commerce/ef-product-catalogue/ef-product-catalogue.component';

// Layout components
export { EfDialogComponent } from './lib/layout/ef-dialog/ef-dialog.component';
export { EfConfirmDialogComponent } from './lib/layout/ef-confirm-dialog/ef-confirm-dialog.component';
export { EfThemeToggleComponent } from './lib/layout/ef-theme-toggle/ef-theme-toggle.component';
export { EfBuildStampComponent } from './lib/layout/ef-build-stamp/ef-build-stamp.component';
export { EfTooltipDirective } from './lib/overlays/ef-tooltip.directive';
export type {
    EfDialogAction,
    EfDialogSeverity,
    EfDialogSize,
} from './lib/layout/ef-dialog/ef-dialog.component';
export { EfFieldsetComponent } from './lib/layout/ef-fieldset/ef-fieldset.component';
export { EfButtonComponent } from './lib/layout/ef-button/ef-button.component';
export type {
    EfButtonSeverity,
    EfButtonPrimeNGSeverity,
    EfButtonComptoirSeverity,
} from './lib/layout/ef-button/ef-button.component';
export { EfButtonGroupComponent } from './lib/layout/ef-button-group/ef-button-group.component';
export { EfLabelComponent } from './lib/layout/ef-label/ef-label.component';
export { EfBadgeComponent } from './lib/layout/ef-badge/ef-badge.component';
export * from './lib/layout/ef-badge/ef-badge.component.types';
export { EfToolbarComponent } from './lib/layout/ef-toolbar/ef-toolbar.component';

// Comptoir shell components (Phase 2)
export { EfAppShellComponent } from './lib/layout/ef-app-shell/ef-app-shell.component';
export { EfAppShellMobileComponent } from './lib/layout/ef-app-shell-mobile/ef-app-shell-mobile.component';
export { EfAppMainComponent } from './lib/layout/ef-app-main/ef-app-main.component';
export { EfAppTopComponent } from './lib/layout/ef-app-top/ef-app-top.component';
export { EfModuleRailComponent } from './lib/layout/ef-module-rail/ef-module-rail.component';
export { EfModuleSideComponent } from './lib/layout/ef-module-side/ef-module-side.component';
export { EfBottomSheetComponent } from './lib/layout/ef-bottom-sheet/ef-bottom-sheet.component';
export { EfFabComponent } from './lib/layout/ef-fab/ef-fab.component';
export type { EfFabPosition } from './lib/layout/ef-fab/ef-fab.component';
export { EfPillGroupComponent } from './lib/layout/ef-pill-group/ef-pill-group.component';
export type { EfPillItem } from './lib/layout/ef-pill-group/ef-pill-group.component';
export { EfTabsComponent } from './lib/layout/ef-tabs/ef-tabs.component';
export type {
    EfTabItem,
    EfTabsVariant,
    EfTabsModule,
} from './lib/layout/ef-tabs/ef-tabs.component';
export { EfTabPanelDirective } from './lib/layout/ef-tabs/ef-tab-panel.directive';
export { EfProfileChipComponent } from './lib/layout/ef-profile-chip/ef-profile-chip.component';

// Feedback components
export { EfBlockUiComponent } from './lib/feedback/ef-block-ui/ef-block-ui.component';
export { EfBlockableDivComponent } from './lib/feedback/ef-blockable-div/ef-blockable-div.component';
export { EfPulseComponent } from './lib/feedback/ef-pulse/ef-pulse.component';
export { EfPdfPreviewComponent } from './lib/feedback/ef-pdf-preview/ef-pdf-preview.component';
export { EfStatusChipComponent } from './lib/feedback/ef-status-chip/ef-status-chip.component';
export type { EfStatusColor, EfStatusReferenceItem } from './lib/feedback/ef-status-chip/ef-status-chip.types';
export {
  EF_STATUS_COLORS,
  EF_STATUS_COLOR_ALIASES,
  resolveEfStatusColor,
} from './lib/feedback/ef-status-chip/ef-status-chip.types';
export { EfToastRegionComponent } from './lib/feedback/ef-toast-region/ef-toast-region.component';
export type { EfToastRegionPosition } from './lib/feedback/ef-toast-region/ef-toast-region.component';
export { EfSkeletonComponent } from './lib/feedback/ef-skeleton/ef-skeleton.component';
export type { EfSkeletonVariant } from './lib/feedback/ef-skeleton/ef-skeleton.component';

// Phase 7 — detail-screen primitives
export { EfCardComponent } from './lib/layout/ef-card/ef-card.component';
export { EfFormGridComponent } from './lib/layout/ef-form-grid/ef-form-grid.component';
export { EfDetailToolbarComponent } from './lib/layout/ef-detail-toolbar/ef-detail-toolbar.component';
export type { EfDetailToolbarAction } from './lib/layout/ef-detail-toolbar/ef-detail-toolbar.types';
export { EfSearchToolbarComponent } from './lib/layout/ef-search-toolbar/ef-search-toolbar.component';
export type { EfSearchToolbarAction } from './lib/layout/ef-search-toolbar/ef-search-toolbar.types';
export { EfTotalsComponent } from './lib/data/ef-totals/ef-totals.component';
export type { EfTotalsRow, EfTotalsGrand } from './lib/data/ef-totals/ef-totals.types';
export { EfStatsComponent } from './lib/data/ef-stats/ef-stats.component';
export type { EfStatsRow } from './lib/data/ef-stats/ef-stats.types';
export { EfTimelineComponent } from './lib/data/ef-timeline/ef-timeline.component';
export type { EfTimelineItem, EfTimelineState } from './lib/data/ef-timeline/ef-timeline.types';
export { EfChangeHistoryComponent } from './lib/data/ef-change-history/ef-change-history.component';
export type { EfChangeHistoryEntry, EfChangeHistoryFieldChange } from './lib/data/ef-change-history/ef-change-history.types';
export { EfKpiCardComponent } from './lib/data/ef-kpi-card/ef-kpi-card.component';
export type { EfKpiSparkline, EfKpiDeltaTone } from './lib/data/ef-kpi-card/ef-kpi-card.types';
export { EfChartComponent } from './lib/data/ef-chart/ef-chart.component';
export { buildChartConfig, EF_CHART_PALETTE } from './lib/data/ef-chart/ef-chart.config';
export type { EfChartSeries, EfChartType } from './lib/data/ef-chart/ef-chart.config';
export { EfRankListComponent } from './lib/data/ef-rank-list/ef-rank-list.component';
export type { EfRankRow } from './lib/data/ef-rank-list/ef-rank-list.component';

// Forms
export * from './lib/forms';

// Data components
export { EfDatatableComponent } from './lib/data/ef-datatable/ef-datatable.component';
export type { DatatableSearchEntity } from './lib/data/ef-datatable/ef-datatable.component';
export * from './lib/data/ef-datatable/ef-datatable.component.types';
export { EfDatatableActionBarComponent } from './lib/data/ef-datatable-actionbar/ef-datatable-actionbar.component';

// Comptoir data primitives (Phase 6)
export { EfDataCardComponent } from './lib/data/ef-data-card/ef-data-card.component';
export { EF_DATA_CARD_MOBILE_LAYOUT } from './lib/data/ef-data-card/ef-data-card.mobile';
export type { EfDataCardMobileLayout } from './lib/data/ef-data-card/ef-data-card.mobile';
export type { EfDataCardRowAction } from './lib/data/ef-data-card/ef-data-card.component';
export {
    EfColumnTemplateDirective,
    EfColumnHeaderTemplateDirective,
} from './lib/data/ef-data-card/ef-column-template.directive';
export type {
    EfDataCardColumn,
    EfDataCardColumnType,
    EfDataCardColumnMobileRole,
    EfDataCardColumnAlign,
    EfDataCardSort,
    EfDataCardSortDirection,
} from './lib/data/ef-data-card/ef-data-card.types';
export { EfRowActionsComponent } from './lib/data/ef-row-actions/ef-row-actions.component';
export type { EfRowAction } from './lib/data/ef-row-actions/ef-row-actions.types';
export { EfPagerComponent } from './lib/data/ef-pager/ef-pager.component';
export { EfBulkBarComponent } from './lib/data/ef-bulk-bar/ef-bulk-bar.component';
export { EfEmptyStateComponent } from './lib/feedback/ef-empty-state/ef-empty-state.component';
export { EfSmartBarComponent } from './lib/data/ef-smart-bar/ef-smart-bar.component';
export { EfFilterPillComponent } from './lib/forms/ef-filter-pill/ef-filter-pill.component';
export { EfServerErrorsDirective } from './lib/forms/ef-server-errors.directive';
export { EfClearButtonComponent } from './lib/forms/ef-clear-button/ef-clear-button.component';
export { EfInputTextComponent } from './lib/forms/ef-input-text/ef-input-text.component';
export { EfPasswordComponent } from './lib/forms/ef-password/ef-password.component';
export { EfCheckboxComponent } from './lib/forms/ef-checkbox/ef-checkbox.component';
export { EfTextareaComponent } from './lib/forms/ef-textarea/ef-textarea.component';
export { EfSelectComponent } from './lib/forms/ef-select/ef-select.component';
export { EfPresetPillComponent } from './lib/forms/ef-preset-pill/ef-preset-pill.component';
export type { EfPresetItem } from './lib/forms/ef-preset-pill/ef-preset-pill.component';
export {
    EfDatepickerAdvancedComponent,
    type EfDateFieldValue,
} from './lib/forms/ef-datepicker-advanced/ef-datepicker-advanced.component';
export type {
    EfDatePreset,
    EfDatePresetKey,
    EfDateRange,
} from './lib/forms/ef-datepicker-advanced/ef-datepicker-advanced.types';
export { EfFilterDrawerComponent } from './lib/forms/ef-filter-drawer/ef-filter-drawer.component';
export { EfActivationFilterComponent } from './lib/forms/ef-activation-filter/ef-activation-filter.component';

// Theme
export { EfThemeConfiguratorComponent } from './lib/ef-theme-configurator/ef-theme-configurator.component';

// Analytics
export { EfEmailMetricsCardComponent } from './lib/analytics/ef-email-metrics-card/ef-email-metrics-card.component';
