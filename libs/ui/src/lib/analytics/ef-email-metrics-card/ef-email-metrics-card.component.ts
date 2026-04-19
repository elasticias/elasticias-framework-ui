import { Component, computed, input, output } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { FormsModule } from '@angular/forms';
import type { EmailMetrics, EmailEventRecord, EmailEventKind } from '@elasticias/types';

type RangeKey = '7d' | '30d' | '90d';

/**
 * Manager dashboard widget: email engagement KPIs, category breakdown, recent events.
 * Keep this presentational — host app fetches metrics + supplies `rangeChange` callback.
 *
 * @example
 * <ef-email-metrics-card
 *   [metrics]="metrics()"
 *   [recentEvents]="events()"
 *   [loading]="loading()"
 *   (rangeChange)="reload($event)"
 * />
 */
@Component({
  selector: 'ef-email-metrics-card',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    TableModule,
    TagModule,
    ButtonModule,
    SelectButtonModule,
    DecimalPipe,
    DatePipe,
  ],
  templateUrl: './ef-email-metrics-card.component.html',
  styleUrl: './ef-email-metrics-card.component.scss',
})
export class EfEmailMetricsCardComponent {
  metrics = input<EmailMetrics | null>(null);
  recentEvents = input<EmailEventRecord[]>([]);
  loading = input<boolean>(false);
  title = input<string>('Email engagement');

  selectedRange: RangeKey = '7d';
  rangeOptions = [
    { label: '7 j', value: '7d' },
    { label: '30 j', value: '30d' },
    { label: '90 j', value: '90d' },
  ];

  hasData = computed(() => (this.metrics()?.sent ?? 0) > 0);

  kpis = computed(() => {
    const m = this.metrics();
    if (!m) return [];
    return [
      { label: 'Envoyés', value: m.sent, tone: 'neutral' as const },
      { label: 'Taux d’ouverture', value: m.openRate, rate: true, tone: this.rateTone(m.openRate, 0.2, 0.35) },
      { label: 'Taux de clic', value: m.clickRate, rate: true, tone: this.rateTone(m.clickRate, 0.02, 0.05) },
      { label: 'Taux de rebond', value: m.bounceRate, rate: true, tone: this.rateTone(m.bounceRate, 0.05, 0.02, true) },
    ];
  });

  onRangeChange(value: RangeKey) {
    this.selectedRange = value;
    this.rangeChange.emit(value);
  }

  readonly rangeChange = output<RangeKey>();

  kindSeverity(kind: EmailEventKind): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (kind) {
      case 'Open': return 'success';
      case 'Click': return 'info';
      case 'SoftBounce': return 'warn';
      case 'HardBounce':
      case 'Spam': return 'danger';
      default: return 'secondary';
    }
  }

  private rateTone(rate: number, warnThreshold: number, goodThreshold: number, lowerIsBetter = false): 'good' | 'warn' | 'neutral' {
    if (lowerIsBetter) {
      if (rate > warnThreshold) return 'warn';
      if (rate < goodThreshold) return 'good';
      return 'neutral';
    }
    if (rate >= goodThreshold) return 'good';
    if (rate >= warnThreshold) return 'neutral';
    return 'warn';
  }
}
