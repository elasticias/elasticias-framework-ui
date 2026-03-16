import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  EfBadgeConfig,
  EfBadgeColor,
  EfBadgeSize,
  EfBadgeVariant,
  EF_BADGE_DEFAULTS,
  EF_BADGE_BG_COLORS,
  EF_BADGE_TEXT_COLORS,
  EF_BADGE_BORDER_COLORS,
  EF_BADGE_BG_LIGHT_COLORS,
} from './ef-badge.component.types';

/**
 * ef-badge - Reusable status badge component
 *
 * Features:
 * - Multiple color variants (Tailwind colors)
 * - Multiple size options (sm, md, lg)
 * - Multiple style variants (filled, outline, dot, pill)
 * - Icon support
 * - Fully customizable with styleClass
 *
 * @example
 * ```html
 * <!-- Simple filled badge -->
 * <ef-badge label="Active" color="green" />
 *
 * <!-- Dot variant -->
 * <ef-badge label="En attente" color="yellow" variant="dot" />
 *
 * <!-- With icon -->
 * <ef-badge label="Error" color="red" icon="pi pi-exclamation-circle" />
 *
 * <!-- Outline variant -->
 * <ef-badge label="Info" color="blue" variant="outline" />
 *
 * <!-- Pill variant -->
 * <ef-badge label="New" color="purple" variant="pill" />
 * ```
 */
@Component({
  selector: 'ef-badge',
  standalone: true,
  templateUrl: './ef-badge.component.html',
  styleUrl: './ef-badge.component.scss',
  imports: [CommonModule],
})
export class EfBadgeComponent {
  /**
   * Badge label text
   */
  label = input<string>();

  /**
   * Badge color (Tailwind color name)
   */
  color = input<EfBadgeColor>(EF_BADGE_DEFAULTS.color);

  /**
   * Badge size
   */
  size = input<EfBadgeSize>(EF_BADGE_DEFAULTS.size);

  /**
   * Badge style variant
   */
  variant = input<EfBadgeVariant>(EF_BADGE_DEFAULTS.variant);

  /**
   * Custom CSS classes
   */
  styleClass = input<string>(EF_BADGE_DEFAULTS.styleClass);

  /**
   * Icon class (e.g., PrimeIcons)
   */
  icon = input<string>();

  /**
   * Whether to show the dot indicator
   */
  showDot = input<boolean>(EF_BADGE_DEFAULTS.showDot);

  /**
   * Computed badge configuration with defaults
   */
  config = computed<Required<EfBadgeConfig>>(() => ({
    label: this.label() || '',
    color: this.color(),
    size: this.size(),
    variant: this.variant(),
    styleClass: this.styleClass(),
    icon: this.icon() || '',
    showDot: this.showDot() || this.variant() === 'dot',
  }));

  /**
   * Computed CSS classes for the badge
   */
  badgeClasses = computed(() => {
    const cfg = this.config();
    const classes: string[] = ['ef-badge'];

    // Base classes
    classes.push('inline-flex', 'items-center', 'gap-1.5', 'font-medium');

    // Size classes
    switch (cfg.size) {
      case 'sm':
        classes.push('text-xs', 'px-2', 'py-0.5');
        break;
      case 'md':
        classes.push('text-sm', 'px-2.5', 'py-1');
        break;
      case 'lg':
        classes.push('text-base', 'px-3', 'py-1.5');
        break;
    }

    // Variant-specific classes
    switch (cfg.variant) {
      case 'filled':
        classes.push('rounded');
        classes.push(EF_BADGE_BG_LIGHT_COLORS[cfg.color]);
        classes.push(EF_BADGE_TEXT_COLORS[cfg.color]);
        break;

      case 'outline':
        classes.push('rounded', 'border-2');
        classes.push(EF_BADGE_BORDER_COLORS[cfg.color]);
        classes.push(EF_BADGE_TEXT_COLORS[cfg.color]);
        classes.push('bg-white');
        break;

      case 'dot':
        classes.push('rounded');
        classes.push(EF_BADGE_TEXT_COLORS[cfg.color]);
        break;

      case 'pill':
        classes.push('rounded-full');
        classes.push(EF_BADGE_BG_LIGHT_COLORS[cfg.color]);
        classes.push(EF_BADGE_TEXT_COLORS[cfg.color]);
        break;
    }

    // Custom classes
    if (cfg.styleClass) {
      classes.push(cfg.styleClass);
    }

    return classes.join(' ');
  });

  /**
   * Computed CSS classes for the dot indicator
   */
  dotClasses = computed(() => {
    const cfg = this.config();
    const classes: string[] = ['rounded-full'];

    // Dot size based on badge size
    switch (cfg.size) {
      case 'sm':
        classes.push('w-2', 'h-2');
        break;
      case 'md':
        classes.push('w-2.5', 'h-2.5');
        break;
      case 'lg':
        classes.push('w-3', 'h-3');
        break;
    }

    // Dot color
    classes.push(EF_BADGE_BG_COLORS[cfg.color]);

    return classes.join(' ');
  });

  /**
   * Computed CSS classes for the icon
   */
  iconClasses = computed(() => {
    const cfg = this.config();
    const classes: string[] = [];

    if (cfg.icon) {
      classes.push(cfg.icon);
    }

    // Icon size based on badge size
    switch (cfg.size) {
      case 'sm':
        classes.push('text-xs');
        break;
      case 'md':
        classes.push('text-sm');
        break;
      case 'lg':
        classes.push('text-base');
        break;
    }

    return classes.join(' ');
  });
}
