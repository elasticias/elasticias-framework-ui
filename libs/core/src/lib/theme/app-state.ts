export interface AppState {
    preset?: string;
    primary?: string;
    surface?: string;
    darkTheme?: boolean;
    menuActive?: boolean;
    mobileMenuVisible?: boolean;
    designerKey?: string;
    RTL?: boolean;
}

export const DEFAULT_APP_STATE: AppState = {
    preset: 'Lara',
    primary: 'noir',
    surface: null as any,
    darkTheme: false,
    menuActive: true,
    mobileMenuVisible: false,
    designerKey: 'primeng-designer-theme',
    RTL: false
};
