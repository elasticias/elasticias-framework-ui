import type { ChartConfiguration, ChartType } from 'chart.js';

export type EfChartType = 'line' | 'bar' | 'donut';

export interface EfChartSeries {
  label?: string;
  data: ReadonlyArray<number>;
  color?: string;
  /** Per-point colors (donut slices / bars). Sparse entries fall back to
   *  `color`, then the palette — use for status-keyed charts so slices
   *  reuse the exact status-chip tokens (`--st-*-fg`) instead of accents. */
  colors?: ReadonlyArray<string | undefined>;
}

/** Concrete hexes (canvas can't resolve CSS var() strings). Order matches the tenant accents.
 *
 *  Convention: the DOMINANT color of report/dashboard visuals is the **active
 *  module's color** (`--module`, e.g. Sales blue `--m-sales`). `ef-chart`
 *  resolves the token at render time and passes it as `moduleColor`, which
 *  takes the palette's first slot — these accents only color secondary
 *  series/slices. A series' explicit `color` always wins. */
export const EF_CHART_PALETTE: ReadonlyArray<string> = [
  '#0d9488', '#6366f1', '#f59e0b', '#ef4444', '#0ea5e9', '#a855f7',
];

export function buildChartConfig(
  type: EfChartType,
  labels: ReadonlyArray<string>,
  series: ReadonlyArray<EfChartSeries>,
  /** Resolved `--module` color — becomes the palette's first (dominant) slot. */
  moduleColor?: string,
): ChartConfiguration {
  const palette: ReadonlyArray<string> = moduleColor
    ? [moduleColor, ...EF_CHART_PALETTE.filter((c) => c.toLowerCase() !== moduleColor.toLowerCase())]
    : EF_CHART_PALETTE;
  const chartType: ChartType = type === 'donut' ? 'doughnut' : type;
  const datasets = series.map((s, i) => {
    const color = s.color ?? palette[i % palette.length];
    if (type === 'donut') {
      return {
        label: s.label,
        data: [...s.data],
        backgroundColor: s.data.map(
          (_, j) => s.colors?.[j] ?? s.color ?? palette[j % palette.length],
        ),
        borderWidth: 0,
      };
    }
    if (type === 'line') {
      return {
        label: s.label,
        data: [...s.data],
        borderColor: color,
        backgroundColor: `${color}22`,
        fill: true,
        tension: 0.35,
        pointRadius: 2,
        borderWidth: 2,
      };
    }
    return {
      label: s.label,
      data: [...s.data],
      backgroundColor: s.colors ? s.data.map((_, j) => s.colors?.[j] ?? color) : color,
      borderRadius: 4,
    };
  });

  return {
    type: chartType,
    data: { labels: [...labels], datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      ...(type === 'donut' ? { cutout: '62%' } : {}),
      plugins: { legend: { display: type === 'donut', position: 'bottom' } },
      scales:
        type === 'donut'
          ? undefined
          : {
              x: { grid: { display: false } },
              y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.06)' } },
            },
    },
  } as ChartConfiguration;
}
