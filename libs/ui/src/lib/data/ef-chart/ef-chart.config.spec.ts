import { describe, expect, it } from 'vitest';
import { buildChartConfig, EF_CHART_PALETTE } from './ef-chart.config';

describe('buildChartConfig', () => {
  it('maps donut to chart.js doughnut with per-slice palette colors', () => {
    const cfg = buildChartConfig('donut', ['A', 'B'], [{ data: [3, 7] }]);
    expect(cfg.type).toBe('doughnut');
    expect(cfg.data.labels).toEqual(['A', 'B']);
    expect(cfg.data.datasets[0].backgroundColor).toEqual(EF_CHART_PALETTE.slice(0, 2));
  });

  it('line series get palette color, subtle fill and no vertical grid', () => {
    const cfg = buildChartConfig('line', ['j1', 'j2'], [{ label: 'CA', data: [1, 2] }]);
    expect(cfg.type).toBe('line');
    expect(cfg.data.datasets[0].label).toBe('CA');
    expect(cfg.data.datasets[0].borderColor).toBe(EF_CHART_PALETTE[0]);
    expect((cfg.options?.scales?.['x'] as { grid?: { display?: boolean } }).grid?.display).toBe(false);
  });

  it('honors an explicit series color and indexes the palette per series', () => {
    const cfg = buildChartConfig('bar', ['a'], [{ data: [1], color: '#ff0000' }, { data: [2] }]);
    expect(cfg.data.datasets[0].backgroundColor).toBe('#ff0000');
    expect(cfg.data.datasets[1].backgroundColor).toBe(EF_CHART_PALETTE[1]);
  });

  it('moduleColor takes the dominant (first) palette slot for lines and donut slices', () => {
    const sales = '#1356a8';
    const line = buildChartConfig('line', ['j1'], [{ data: [1] }], sales);
    expect(line.data.datasets[0].borderColor).toBe(sales);

    const donut = buildChartConfig('donut', ['A', 'B'], [{ data: [3, 7] }], sales);
    expect(donut.data.datasets[0].backgroundColor).toEqual([sales, EF_CHART_PALETTE[0]]);
  });

  it('moduleColor never duplicates itself when it already exists in the palette', () => {
    const cfg = buildChartConfig(
      'donut', ['A', 'B'], [{ data: [1, 2] }], EF_CHART_PALETTE[0].toUpperCase(),
    );
    // First slice = module color; second = the NEXT accent, not the same hue again.
    expect(cfg.data.datasets[0].backgroundColor).toEqual([
      EF_CHART_PALETTE[0].toUpperCase(), EF_CHART_PALETTE[1],
    ]);
  });

  it('explicit series color still wins over moduleColor', () => {
    const cfg = buildChartConfig('bar', ['a'], [{ data: [1], color: '#ff0000' }], '#1356a8');
    expect(cfg.data.datasets[0].backgroundColor).toBe('#ff0000');
  });
});
