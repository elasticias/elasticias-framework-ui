export interface AppState {
    preset?: string;
    primary?: string;
    surface?: string;
    darkTheme?: boolean;
    menuActive?: boolean;
    designerKey?: string;
    RTL?: boolean;
}

export const DEFAULT_APP_STATE: AppState = {
    preset: 'Nora',
    primary: 'noir',
    surface: null as any,
    darkTheme: false,
    menuActive: true,
    designerKey: 'primeng-designer-theme',
    RTL: false
};
