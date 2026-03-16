/**
 * Available Tailwind color names for badges
 */
export type EfBadgeColor =
  | 'emerald'
  | 'green'
  | 'lime'
  | 'orange'
  | 'amber'
  | 'yellow'
  | 'teal'
  | 'cyan'
  | 'sky'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'purple'
  | 'fuchsia'
  | 'pink'
  | 'rose'
  | 'slate'
  | 'gray'
  | 'zinc'
  | 'neutral'
  | 'stone'
  | 'red';

/**
 * Badge size variants
 */
export type EfBadgeSize = 'sm' | 'md' | 'lg';

/**
 * Badge style variants
 */
export type EfBadgeVariant = 'filled' | 'outline' | 'dot' | 'pill';

/**
 * Badge configuration interface
 */
export interface EfBadgeConfig {
  /**
   * Text label to display (optional for 'dot' variant)
   */
  label?: string;

  /**
   * Badge color (Tailwind color name)
   * @default 'blue'
   */
  color?: EfBadgeColor;

  /**
   * Badge size
   * @default 'md'
   */
  size?: EfBadgeSize;

  /**
   * Badge style variant
   * @default 'filled'
   */
  variant?: EfBadgeVariant;

  /**
   * Custom CSS classes to apply
   */
  styleClass?: string;

  /**
   * Icon class (e.g., PrimeIcons) to display before label
   */
  icon?: string;

  /**
   * Whether to show the dot indicator
   * @default true for 'dot' variant, false otherwise
   */
  showDot?: boolean;
}

/**
 * Default badge configuration
 */
export const EF_BADGE_DEFAULTS: Required<Omit<EfBadgeConfig, 'label' | 'icon'>> = {
  color: 'blue',
  size: 'md',
  variant: 'filled',
  styleClass: '',
  showDot: false,
};

/**
 * Maps Tailwind colors to their background classes
 */
export const EF_BADGE_BG_COLORS: Record<EfBadgeColor, string> = {
  emerald: 'bg-emerald-500',
  green: 'bg-green-500',
  lime: 'bg-lime-500',
  orange: 'bg-orange-500',
  amber: 'bg-amber-500',
  yellow: 'bg-yellow-500',
  teal: 'bg-teal-500',
  cyan: 'bg-cyan-500',
  sky: 'bg-sky-500',
  blue: 'bg-blue-500',
  indigo: 'bg-indigo-500',
  violet: 'bg-violet-500',
  purple: 'bg-purple-500',
  fuchsia: 'bg-fuchsia-500',
  pink: 'bg-pink-500',
  rose: 'bg-rose-500',
  slate: 'bg-slate-500',
  gray: 'bg-gray-500',
  zinc: 'bg-zinc-500',
  neutral: 'bg-neutral-500',
  stone: 'bg-stone-500',
  red: 'bg-red-500',
};

/**
 * Maps Tailwind colors to their text classes
 */
export const EF_BADGE_TEXT_COLORS: Record<EfBadgeColor, string> = {
  emerald: 'text-emerald-700',
  green: 'text-green-700',
  lime: 'text-lime-700',
  orange: 'text-orange-700',
  amber: 'text-amber-700',
  yellow: 'text-yellow-700',
  teal: 'text-teal-700',
  cyan: 'text-cyan-700',
  sky: 'text-sky-700',
  blue: 'text-blue-700',
  indigo: 'text-indigo-700',
  violet: 'text-violet-700',
  purple: 'text-purple-700',
  fuchsia: 'text-fuchsia-700',
  pink: 'text-pink-700',
  rose: 'text-rose-700',
  slate: 'text-slate-700',
  gray: 'text-gray-700',
  zinc: 'text-zinc-700',
  neutral: 'text-neutral-700',
  stone: 'text-stone-700',
  red: 'text-red-700',
};

/**
 * Maps Tailwind colors to their border classes
 */
export const EF_BADGE_BORDER_COLORS: Record<EfBadgeColor, string> = {
  emerald: 'border-emerald-500',
  green: 'border-green-500',
  lime: 'border-lime-500',
  orange: 'border-orange-500',
  amber: 'border-amber-500',
  yellow: 'border-yellow-500',
  teal: 'border-teal-500',
  cyan: 'border-cyan-500',
  sky: 'border-sky-500',
  blue: 'border-blue-500',
  indigo: 'border-indigo-500',
  violet: 'border-violet-500',
  purple: 'border-purple-500',
  fuchsia: 'border-fuchsia-500',
  pink: 'border-pink-500',
  rose: 'border-rose-500',
  slate: 'border-slate-500',
  gray: 'border-gray-500',
  zinc: 'border-zinc-500',
  neutral: 'border-neutral-500',
  stone: 'border-stone-500',
  red: 'border-red-500',
};

/**
 * Maps Tailwind colors to their light background classes (for filled variant)
 */
export const EF_BADGE_BG_LIGHT_COLORS: Record<EfBadgeColor, string> = {
  emerald: 'bg-emerald-100',
  green: 'bg-green-100',
  lime: 'bg-lime-100',
  orange: 'bg-orange-100',
  amber: 'bg-amber-100',
  yellow: 'bg-yellow-100',
  teal: 'bg-teal-100',
  cyan: 'bg-cyan-100',
  sky: 'bg-sky-100',
  blue: 'bg-blue-100',
  indigo: 'bg-indigo-100',
  violet: 'bg-violet-100',
  purple: 'bg-purple-100',
  fuchsia: 'bg-fuchsia-100',
  pink: 'bg-pink-100',
  rose: 'bg-rose-100',
  slate: 'bg-slate-100',
  gray: 'bg-gray-100',
  zinc: 'bg-zinc-100',
  neutral: 'bg-neutral-100',
  stone: 'bg-stone-100',
  red: 'bg-red-100',
};
