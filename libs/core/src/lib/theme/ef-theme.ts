import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';
import Lara from '@primeng/themes/lara';

/* ──────────────────────────────────────────────────────────────────
 * LEGACY: Noir preset (Aura base, monochrome surface palette).
 * Kept for backward-compat with apps that haven't migrated to
 * Comptoir. Phase 5 of the design-system plan retrofits consumers
 * to EfComptoirTheme; once that lands, Noir + EfTheme can be
 * deleted.
 * ────────────────────────────────────────────────────────────── */

const Noir = definePreset(Aura, {
    semantic: {
        primary: {
            50: '{surface.50}',
            100: '{surface.100}',
            200: '{surface.200}',
            300: '{surface.300}',
            400: '{surface.400}',
            500: '{surface.500}',
            600: '{surface.600}',
            700: '{surface.700}',
            800: '{surface.800}',
            900: '{surface.900}',
            950: '{surface.950}'
        },
        colorScheme: {
            light: {
                primary: {
                    color: '{primary.950}',
                    contrastColor: '#ffffff',
                    hoverColor: '{primary.800}',
                    activeColor: '{primary.700}'
                },
                highlight: {
                    background: '{primary.950}',
                    focusBackground: '{primary.700}',
                    color: '#ffffff',
                    focusColor: '#ffffff'
                }
            },
            dark: {
                primary: {
                    color: '{primary.50}',
                    contrastColor: '{primary.950}',
                    hoverColor: '{primary.200}',
                    activeColor: '{primary.300}'
                },
                highlight: {
                    background: '{primary.50}',
                    focusBackground: '{primary.300}',
                    color: '{primary.950}',
                    focusColor: '{primary.950}'
                }
            }
        }
    }
});

/**
 * Default Elasticias theme configuration for PrimeNG.
 * Uses the Noir preset (surface-based primary colors) with dark mode support.
 *
 * @deprecated Migrate to {@link EfComptoirTheme} as part of Phase 5 of the
 * design-system plan. Will be removed once all consumers have moved.
 */
export const EfTheme = {
    preset: Noir,
    options: {
        darkModeSelector: '.p-dark',
    }
};

export default EfTheme;

/* ──────────────────────────────────────────────────────────────────
 * COMPTOIR: ink surface + tenant primary (Lara base).
 * Surface palette is the ink ramp from libs/tokens/colors.json.
 * Primary palette defaults to the parfumerie sample tenant; it is
 * runtime-replaced by EfThemeConfigService.setTenantAccent(hex)
 * via PrimeNG's updatePrimaryPalette() API.
 * ────────────────────────────────────────────────────────────── */

const ComptoirPreset = definePreset(Lara, {
    semantic: {
        primary: {
            50:  '#f7f0f4',
            100: '#ecdce5',
            200: '#d8b4c5',
            300: '#b87a99',
            400: '#934e74',
            500: '#6f3257',
            600: '#54243f',
            700: '#401a30',
            800: '#2c1221',
            900: '#1a0913',
            950: '#0d040a'
        },
        /* ──────────────────────────────────────────────────────────────
         * Control sizing (ADR-009). The native "comptoir" variant is the
         * default render path and is pinned to --hit-base (40px) in CSS;
         * these tokens align the OPT-IN PrimeNG variant (p-select filter,
         * p-multiselect, p-inputnumber stepper, etc.) to the same canonical
         * heights so the two paths agree:
         *   base  → 40px (--hit-base)   sm → 32px (--hit)   lg → 48px (--hit-touch, POS/mobile)
         * Lara form-field height ≈ paddingY*2 + lineHeight(1.5)*fontSize(14px) + 2px border.
         *   base: 8px*2 + 21 + 2 ≈ 40px · sm: 5px*2 + ~18 + 2 ≈ 32px · lg: 12px*2 + 21 + 2 ≈ 48px
         * NOTE: exact pixel height depends on the app's root font-size; the
         * native default path is the verified one — confirm the PrimeNG
         * opt-in controls visually in the running app and nudge paddingY if
         * they read 1-2px off. Border radius matches --r-md (12px). */
        formField: {
            paddingX: '0.75rem',
            paddingY: '0.5rem',
            borderRadius: '12px',
            sm: {
                fontSize: '0.78rem',
                paddingX: '0.625rem',
                paddingY: '0.3125rem'
            },
            lg: {
                fontSize: '0.9375rem',
                paddingX: '0.875rem',
                paddingY: '0.75rem'
            }
        },
        colorScheme: {
            light: {
                primary: {
                    color: '{primary.500}',
                    contrastColor: '#ffffff',
                    hoverColor: '{primary.600}',
                    activeColor: '{primary.700}'
                },
                surface: {
                    0:   '#ffffff',
                    50:  '#f8f9fb',
                    100: '#f1f3f6',
                    200: '#e4e8ee',
                    300: '#cdd3dd',
                    400: '#9ca5b3',
                    500: '#6c7280',
                    600: '#4a4f5a',
                    700: '#2f3239',
                    800: '#1d1f24',
                    900: '#0f1115',
                    950: '#06070a'
                },
                highlight: {
                    background: '{primary.500}',
                    focusBackground: '{primary.600}',
                    color: '#ffffff',
                    focusColor: '#ffffff'
                }
            },
            dark: {
                primary: {
                    color: '{primary.400}',
                    contrastColor: '{primary.950}',
                    hoverColor: '{primary.300}',
                    activeColor: '{primary.200}'
                },
                surface: {
                    0:   '#000000',
                    50:  '#06070a',
                    100: '#0f1115',
                    200: '#1d1f24',
                    300: '#2f3239',
                    400: '#4a4f5a',
                    500: '#6c7280',
                    600: '#9ca5b3',
                    700: '#cdd3dd',
                    800: '#e4e8ee',
                    900: '#f1f3f6',
                    950: '#f8f9fb'
                },
                highlight: {
                    background: '{primary.400}',
                    focusBackground: '{primary.300}',
                    color: '{primary.950}',
                    focusColor: '{primary.950}'
                }
            }
        }
    }
});

/**
 * Comptoir theme configuration for PrimeNG (Phase 1 / design-system v0.2).
 * Surface palette = ink ramp; primary palette = tenant accent
 * (runtime-driven via `EfThemeConfigService.setTenantAccent(hex)`).
 *
 * Usage with providePrimeNG:
 * ```ts
 * providePrimeNG({ theme: EfComptoirTheme, ripple: true })
 * ```
 *
 * Pair with `state.preset = 'Comptoir'` so the body class becomes
 * `theme-comptoir` (avoids legacy `theme-modern` radius overrides).
 */
export const EfComptoirTheme = {
    preset: ComptoirPreset,
    options: {
        darkModeSelector: '.p-dark',
    }
};
