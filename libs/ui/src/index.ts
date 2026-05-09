// Pipes
export { EfCurrencyPipe } from './lib/pipes/ef-currency.pipe';
export { TruncatePipe } from './lib/pipes/truncate.pipe';

// Commerce
export { EfPriceDisplayComponent } from './lib/commerce/ef-price-display.component';
export { EfQuantitySelectorComponent } from './lib/commerce/ef-quantity-selector.component';
export { EfOrderBuilderComponent } from './lib/commerce/ef-order-builder/ef-order-builder.component';
export * from './lib/commerce/ef-order-builder/ef-order-builder.component.types';
export { EfOrderSummaryComponent } from './lib/commerce/ef-order-summary/ef-order-summary.component';
export type { ProductCountGroup, ProductCountGroupLabel, ProductWithCountGroup } from './lib/commerce/ef-order-summary/ef-order-summary.component';
export { EfProductCatalogueFilterComponent } from './lib/commerce/ef-product-catalogue-filter/ef-product-catalogue-filter.component';
export type { CategoryItem, CategoryGroup, CategoryAssignment, SelectedFilter } from './lib/commerce/ef-product-catalogue-filter/ef-product-catalogue-filter.component';
export { EfProductCatalogueComponent } from './lib/commerce/ef-product-catalogue/ef-product-catalogue.component';
export type { CatalogueProduct, CatalogueProductVariant } from './lib/commerce/ef-product-catalogue/ef-product-catalogue.component';

// Layout components
export { EfDialogComponent } from './lib/layout/ef-dialog/ef-dialog.component';
export { EfFieldsetComponent } from './lib/layout/ef-fieldset/ef-fieldset.component';
export { EfButtonComponent } from './lib/layout/ef-button/ef-button.component';
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
export { EfProfileChipComponent } from './lib/layout/ef-profile-chip/ef-profile-chip.component';

// Feedback components
export { EfBlockUiComponent } from './lib/feedback/ef-block-ui/ef-block-ui.component';
export { EfBlockableDivComponent } from './lib/feedback/ef-blockable-div/ef-blockable-div.component';
export { EfPulseComponent } from './lib/feedback/ef-pulse/ef-pulse.component';

// Forms
export * from './lib/forms';

// Data components
export { EfDatatableComponent } from './lib/data/ef-datatable/ef-datatable.component';
export type { DatatableSearchEntity } from './lib/data/ef-datatable/ef-datatable.component';
export * from './lib/data/ef-datatable/ef-datatable.component.types';
export { EfDatatableActionBarComponent } from './lib/data/ef-datatable-actionbar/ef-datatable-actionbar.component';

// Comptoir data primitives (Phase 6)
export { EfDataCardComponent } from './lib/data/ef-data-card/ef-data-card.component';
export { EfPagerComponent } from './lib/data/ef-pager/ef-pager.component';
export { EfBulkBarComponent } from './lib/data/ef-bulk-bar/ef-bulk-bar.component';
export { EfEmptyStateComponent } from './lib/feedback/ef-empty-state/ef-empty-state.component';

// Theme
export { EfThemeConfiguratorComponent } from './lib/ef-theme-configurator/ef-theme-configurator.component';

// Analytics
export { EfEmailMetricsCardComponent } from './lib/analytics/ef-email-metrics-card/ef-email-metrics-card.component';
