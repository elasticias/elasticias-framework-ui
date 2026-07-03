import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, ElementRef, OnDestroy, effect, input, viewChild,
} from '@angular/core';
import {
  ArcElement, BarController, BarElement, CategoryScale, Chart, DoughnutController, Filler,
  Legend, LineController, LineElement, LinearScale, PointElement, Tooltip,
} from 'chart.js';
import type { ChartConfiguration } from 'chart.js';
import { buildChartConfig, type EfChartSeries, type EfChartType } from './ef-chart.config';

Chart.register(
  ArcElement, BarController, BarElement, CategoryScale, DoughnutController, Filler,
  Legend, LineController, LineElement, LinearScale, PointElement, Tooltip,
);

/**
 * Thin chart.js wrapper for report/dashboard visuals (line, bar, donut).
 * Labels/series are data — i18n happens in the parent. Zoneless-safe: the
 * effect below re-renders whenever inputs change; instance destroyed on cleanup.
 */
@Component({
  selector: 'ef-chart',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="ef-chart" [style.height.px]="height()"><canvas #canvas></canvas></div>`,
  styles: [`.ef-chart { position: relative; width: 100%; }`],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfChartComponent implements OnDestroy {
  readonly type = input.required<EfChartType>();
  readonly labels = input<ReadonlyArray<string>>([]);
  readonly series = input<ReadonlyArray<EfChartSeries>>([]);
  readonly height = input(260);

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private chart: Chart | null = null;

  constructor() {
    effect(() => {
      const cfg = buildChartConfig(this.type(), this.labels(), this.series());
      // Chart#config is a union that includes per-dataset-typed configs; ours is always a plain ChartConfiguration.
      if (this.chart && (this.chart.config as ChartConfiguration).type === cfg.type) {
        this.chart.data = cfg.data;
        this.chart.update();
      } else {
        this.chart?.destroy();
        this.chart = new Chart(this.canvas().nativeElement, cfg);
      }
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
    this.chart = null;
  }
}
