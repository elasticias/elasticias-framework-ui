import type { ChartConfiguration, ChartType } from 'chart.js';

export type EfChartType = 'line' | 'bar' | 'donut';

export interface EfChartSeries {
  label?: string;
  data: ReadonlyArray<number>;
  color?: string;
}

/** Concrete hexes (canvas can't resolve CSS var() strings). Order matches the tenant accents. */
export const EF_CHART_PALETTE: ReadonlyArray<string> = [
  '#0d9488', '#6366f1', '#f59e0b', '#ef4444', '#0ea5e9', '#a855f7',
];

export function buildChartConfig(
  type: EfChartType,
  labels: ReadonlyArray<string>,
  series: ReadonlyArray<EfChartSeries>,
): ChartConfiguration {
  const chartType: ChartType = type === 'donut' ? 'doughnut' : type;
  const datasets = series.map((s, i) => {
    const color = s.color ?? EF_CHART_PALETTE[i % EF_CHART_PALETTE.length];
    if (type === 'donut') {
      return {
        label: s.label,
        data: [...s.data],
        backgroundColor: s.data.map((_, j) => s.color ?? EF_CHART_PALETTE[j % EF_CHART_PALETTE.length]),
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
    return { label: s.label, data: [...s.data], backgroundColor: color, borderRadius: 4 };
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
