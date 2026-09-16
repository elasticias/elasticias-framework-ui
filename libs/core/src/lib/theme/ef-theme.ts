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
                /* The ramp runs in the SAME direction as the light one, and
                 * that is deliberate — it used to be inverted here (0 = black
                 * … 950 = near-white) and that single flip was the cause of
                 * dark mode being unreadable product-wide.
                 *
                 * PrimeNG's surface ramp is not "light values for light mode,
                 * dark values for dark mode". It is a fixed light→dark scale
                 * that the *semantic* block indexes differently per scheme:
                 * light reads `{surface.0}` as the page and `{surface.700}` as
                 * body text, dark reads `{surface.900}` as the page and
                 * `{surface.0}` as body text. Every component preset inherits
                 * those conventions. Inverting the ramp therefore inverted
                 * every inherited value at once — dark `text.color` resolved
                 * to #000000, `content.background` to #f1f3f6, and
                 * `button.text.secondary.color` to #2f3239 on a #1d1f24 card
                 * (1.28:1, the reported bug).
                 *
                 * Keeping the ramp upright makes the ink scale land exactly on
                 * the Comptoir dark aliases from `_comptoir.scss`:
                 *   surface.900 → --paper       (#0f1115)
                 *   surface.800 → --paper-alt   (#1d1f24)
                 *   surface.400 → --text-mute   (#9ca5b3)
                 *   surface.50  → --text        (#f8f9fb)
                 * so inherited PrimeNG values agree with the design system
                 * instead of fighting it. */
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
                /* Lara's dark body text is `{surface.0}` = pure white; Comptoir's
                 * --text is --ink-50. Pin it so the two agree. 17.94:1 on
                 * --paper, 15.65:1 on --paper-alt. */
                text: {
                    color: '{surface.50}',
                    hoverColor: '{surface.50}'
                },
                highlight: {
                    background: '{primary.400}',
                    focusBackground: '{primary.300}',
                    color: '{primary.950}',
                    focusColor: '{primary.950}'
                }
            }
        }
    },
    /* ──────────────────────────────────────────────────────────────
     * Button: the low-emphasis variants.
     *
     * An upright surface ramp (above) fixes everything Lara expresses
     * through `{surface.N}`. It cannot fix the variants Lara expresses
     * through the accent and through raw Tailwind reds, because those
     * were tuned against Lara's own indigo/zinc, not against the
     * Comptoir tenant ramp. Measured on the default parfumerie accent,
     * against --paper (#0f1115) / --paper-alt (#1d1f24) in dark and
     * #ffffff / --paper (#f8f9fb) in light, resting state:
     *
     *   dark  text.primary   {primary.400} #934e74 → 3.22 / 2.81   ✗
     *   dark  outlined.primary.border {primary.700} #401a30 → 1.27 / 1.11 ✗
     *   dark  outlined.secondary.border {surface.700} → 1.47 / 1.28 ✗
     *   dark  outlined.danger.border {red.700} → 2.92 / 2.55        ✗
     *   light text.danger    {red.500} #ef4444 → 3.76 / 3.57        ✗
     *   light outlined.primary.border {primary.200} → 1.87 / 1.77   ✗
     *   light outlined.secondary.border {surface.200} → 1.19 / 1.13 ✗
     *
     * Text colours below clear 4.5:1 in every state (resting, hover
     * tint and the 16% active tint); border colours clear the 3:1
     * WCAG 1.4.11 bar for a component boundary without brightening
     * into something that reads as a fill.
     *
     * The severities Comptoir actually ships on `<ef-button>` are
     * primary / secondary / danger; success, info, warn, help and
     * contrast are left on stock, which the upright ramp already
     * makes legible.
     *
     * Caveat: `{primary.N}` tracks the tenant accent through
     * `EfThemeConfigService.setTenantAccent()`, so these ratios hold
     * for the default ramp. A very dark or very light tenant accent
     * would need a lightness clamp in the ramp generator — noted, not
     * built. */
    components: {
        button: {
            colorScheme: {
                light: {
                    text: {
                        /* {primary.color} (= {primary.500}) already reads
                         * 9.25 / 8.78 — left on stock so it keeps tracking
                         * the tenant accent. */
                        danger: { color: '{red.700}' }   /* 6.47 / 6.14 */
                    },
                    outlined: {
                        primary:   { borderColor: '{primary.300}' },                     /* 3.34 / 3.17 */
                        secondary: { color: '{surface.600}', borderColor: '{surface.500}' }, /* 8.21 / 7.80 · border 4.82 / 4.58 */
                        danger:    { color: '{red.700}', borderColor: '{red.500}' }      /* 6.47 / 6.14 · border 3.76 / 3.57 */
                    }
                },
                dark: {
                    text: {
                        primary:   { color: '{primary.200}' },  /* 10.13 / 8.84 */
                        secondary: { color: '{surface.300}' },  /* 12.56 / 10.96 — the reported 1.28 pair */
                        danger:    { color: '{red.400}' }       /* 6.83 / 5.96 */
                    },
                    outlined: {
                        primary:   { color: '{primary.200}', borderColor: '{primary.300}' }, /* 10.13 / 8.84 · border 5.65 / 4.93 */
                        secondary: { color: '{surface.300}', borderColor: '{surface.500}' }, /* 12.56 / 10.96 · border 3.92 / 3.42 */
                        danger:    { color: '{red.400}', borderColor: '{red.500}' }          /* 6.83 / 5.96 · border 5.02 / 4.38 */
                    },
                    /* `[link]="true"` carries no ground of its own, so it sits
                     * straight on --paper / --paper-alt: {primary.color} reads
                     * 3.22 / 2.81 there. Same lift as the text variant. */
                    link: {
                        color: '{primary.200}',        /* 10.13 / 8.84 */
                        hoverColor: '{primary.100}',
                        activeColor: '{primary.100}'
                    }
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
