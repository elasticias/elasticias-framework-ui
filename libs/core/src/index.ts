export { LoaderService } from './lib/services/loader.service';
export { CacheService } from './lib/services/cache.service';
export {
    EfToastService,
    /** @deprecated alias of EfToastService — kept for v1 imports. */
    ToastService,
} from './lib/services/toast.service';
export type {
    EfToast,
    EfToastAction,
    EfToastOptions,
    EfToastSeverity,
} from './lib/services/toast.service';
export { ConfirmDialogService } from './lib/services/confirm-dialog.service';
export { screenGuard, hasScreenPermission } from './lib/guards/screen.guard';
export type { ScreenGuardConfig } from './lib/guards/screen.guard';

// Theme
export { EfThemeConfigService } from './lib/theme/ef-theme-config.service';
export { EfTheme, EfComptoirTheme } from './lib/theme/ef-theme';
export { PRIMENG_EN_LOCALE } from './lib/theme/locales/primeng-en';
export { PRIMENG_FR_LOCALE } from './lib/theme/locales/primeng-fr';
export { PRIMENG_AR_LOCALE } from './lib/theme/locales/primeng-ar';
export type { AppState } from './lib/theme/app-state';
export { DEFAULT_APP_STATE } from './lib/theme/app-state';

// Modules
export { EF_MODULES, EF_MODULES_TOKEN } from './lib/modules/ef-module-registry';
export type { EfModule, EfModuleId, EfNavSection, EfNavItem, EfNavAction } from './lib/modules/ef-module-registry';
export { EfActiveModuleService } from './lib/modules/ef-active-module.service';

// Responsive
export { EfViewportService } from './lib/responsive/ef-viewport.service';
export type { EfViewport } from './lib/responsive/ef-viewport.service';

// Auth
export { EfPermissionService } from './lib/auth/ef-permission.service';
export type { EfModulePermission, EfPermissionLevel } from './lib/auth/ef-permission.service';
export { EF_SESSION } from './lib/auth/ef-session.token';
export { EF_BUILD_INFO } from './lib/build/ef-build-info.token';
export type { EfBuildInfo } from './lib/build/ef-build-info.token';
export type { EfSession } from './lib/auth/ef-session.token';
