import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface EfRankRow {
  label: string;
  value: string;
  secondary?: string;
  pct: number;
}

/** Top-N ranked rows (label · proportional bar · value). Lives inside an ef-card. */
@Component({
  selector: 'ef-rank-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ol class="rank">
      @for (row of rows(); track row.label; let i = $index) {
        <li class="rank-row">
          <span class="rank-idx">{{ i + 1 }}</span>
          <span class="rank-main">
            <span class="rank-label" [title]="row.label">{{ row.label }}</span>
            @if (row.secondary) { <span class="rank-secondary">{{ row.secondary }}</span> }
            <span class="rank-bar"><i [style.width.%]="row.pct"></i></span>
          </span>
          <span class="rank-value">{{ row.value }}</span>
        </li>
      }
    </ol>
  `,
  styles: [`
    :host { display: block; }
    .rank { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
    .rank-row { display: grid; grid-template-columns: 22px 1fr auto; gap: 10px; align-items: center; }
    .rank-idx { font-size: 12px; font-weight: 700; color: var(--ink-soft, #64748b); text-align: center; }
    .rank-main { display: grid; gap: 3px; min-width: 0; }
    .rank-label { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .rank-secondary { font-size: 11px; color: var(--ink-soft, #64748b); }
    .rank-bar { height: 4px; border-radius: 999px; background: var(--paper-alt, #f1f5f9); overflow: hidden; }
    .rank-bar i { display: block; height: 100%; border-radius: inherit; background: var(--tenant-500, #0d9488); }
    .rank-value { font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfRankListComponent {
  readonly rows = input<ReadonlyArray<EfRankRow>>([]);
}
