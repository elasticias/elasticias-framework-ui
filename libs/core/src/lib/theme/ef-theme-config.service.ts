import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { computed, effect, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { StorageUtils } from '@elasticias/utils';
import { AppState, DEFAULT_APP_STATE } from './app-state';

/**
 * Service that manages theme state: preset, primary color, surface, dark mode, RTL.
 * State is persisted to localStorage so user preferences survive page reloads.
 *
 * Apps can extend this service or use it directly.
 */
@Injectable({
    providedIn: 'root'
})
export class EfThemeConfigService {
    private readonly STORAGE_KEY = 'APP_CONFIG_STATE';

    appState = signal<AppState>(null as any);

    designerActive = signal(false);

    newsActive = signal(false);

    document = inject(DOCUMENT);

    platformId = inject(PLATFORM_ID);

    theme = computed(() => (this.appState()?.darkTheme ? 'dark' : 'light'));

    transitionComplete = signal<boolean>(false);

    private initialized = false;

    constructor() {
        const initialState = this.loadAppState();
        this.appState.set({ ...initialState });
        this.updatePresetClass(initialState);

        effect(
            () => {
                const state = this.appState();

                if (!this.initialized || !state) {
                    this.initialized = true;
                    return;
                }
                this.saveAppState(state);
                this.updatePresetClass(state);
                this.handleDarkModeTransition(state);
                this.applyRTL(state);
            },
        );

        // Apply RTL on initial load
        if (isPlatformBrowser(this.platformId)) {
            if (initialState?.RTL) {
                this.document.documentElement.setAttribute('dir', 'rtl');
            }
        }
    }

    private static readonly PRESET_CLASS_MAP: Record<string, string> = {
        Aura: 'theme-compact',
        Lara: 'theme-modern',
        Material: 'theme-material',
        Nora: 'theme-classic',
    };

    private static readonly ALL_THEME_CLASSES = Object.values(EfThemeConfigService.PRESET_CLASS_MAP);

    private updatePresetClass(state: AppState): void {
        if (isPlatformBrowser(this.platformId)) {
            const body = this.document.body;
            body.classList.remove(...EfThemeConfigService.ALL_THEME_CLASSES);
            if (state.preset) {
                const cls = EfThemeConfigService.PRESET_CLASS_MAP[state.preset];
                if (cls) {
                    body.classList.add(cls);
                }
            }
        }
    }

    private handleDarkModeTransition(state: AppState): void {
        if (isPlatformBrowser(this.platformId)) {
            if ((document as any).startViewTransition) {
                this.startViewTransition(state);
            } else {
                this.toggleDarkMode(state);
                this.onTransitionEnd();
            }
        }
    }

    private startViewTransition(state: AppState): void {
        const transition = (document as any).startViewTransition(() => {
            this.toggleDarkMode(state);
        });

        transition.ready.then(() => this.onTransitionEnd());
    }

    private toggleDarkMode(state: AppState): void {
        if (state.darkTheme) {
            this.document.documentElement.classList.add('p-dark');
        } else {
            this.document.documentElement.classList.remove('p-dark');
        }
    }

    private onTransitionEnd() {
        this.transitionComplete.set(true);
        setTimeout(() => {
            this.transitionComplete.set(false);
        });
    }

    private applyRTL(state: AppState): void {
        if (isPlatformBrowser(this.platformId)) {
            const setDir = () => {
                if (state.RTL) {
                    this.document.documentElement.setAttribute('dir', 'rtl');
                } else {
                    this.document.documentElement.removeAttribute('dir');
                }
            };

            if ((document as any).startViewTransition) {
                (document as any).startViewTransition(() => setDir());
            } else {
                setDir();
            }
        }
    }

    hideMenu() {
        this.appState.update((state) => ({ ...state, menuActive: false }));
    }

    showMenu() {
        this.appState.update((state) => ({ ...state, menuActive: true }));
    }

    toggleMobileMenu() {
        this.appState.update((state) => ({
            ...state,
            mobileMenuVisible: !state.mobileMenuVisible
        }));
    }

    closeMobileMenu() {
        this.appState.update((state) => ({
            ...state,
            mobileMenuVisible: false
        }));
    }

    openMobileMenu() {
        this.appState.update((state) => ({
            ...state,
            mobileMenuVisible: true
        }));
    }

    hideNews() {
        this.newsActive.set(false);
    }

    showNews() {
        this.newsActive.set(true);
    }

    showDesigner() {
        this.designerActive.set(true);
    }

    hideDesigner() {
        this.designerActive.set(false);
    }

    private loadAppState(): AppState {
        if (isPlatformBrowser(this.platformId)) {
            const storedState = StorageUtils.getLocal<AppState>(this.STORAGE_KEY);
            if (storedState) {
                return storedState;
            }
        }
        return { ...DEFAULT_APP_STATE };
    }

    private saveAppState(state: AppState): void {
        if (isPlatformBrowser(this.platformId)) {
            StorageUtils.setLocal(this.STORAGE_KEY, state);
        }
    }
}
