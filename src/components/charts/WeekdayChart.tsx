import type { ChartConfiguration } from 'chart.js';
import { cssVar, chartGrid, chartTick } from '../../lib/charts';
import { bucketLines } from '../../lib/chart-bucket';
import type { Flight } from '../../lib/compute';
import { useChart } from './useChart';
import type { ChartMode } from '../../hooks/useChartMode';

// flights の既定値は毎レンダー新しい [] を作らないようモジュール定数にする
// （useChart の deps に入るため、新参照だと他カードの操作でも再描画が走る・2026-07-12）。
const NO_FLIGHTS: Flight[] = [];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// 日付文字列 → Mon=0..Sun=6 の曜日インデックス（旧 _renderWeekdayLargeChart と同じ計算）。
function weekdayIndex(date: string): number {
  const [yy, mm, dd] = date.split('-').map(Number);
  return (new Date(yy, mm - 1, dd).getDay() + 6) % 7;
}

// 曜日別フライト数の折れ線（旧 render-charts.js renderCharts の Weekday 部分）。シアンの面塗り。
// インデックスは Mon=0..Sun=6（compute.ts の wd と同じ ISO 風）。
// large=true（⛶ 拡大）では旧 _renderWeekdayLargeChart 相当：太線・大きい点＋
// リッチツールチップ（bucketLines）＋クリックでドリルダウン（onDrill）。
// mode='bar'（2026-07-11）は棒に切り替え（YearChart と同じ塗り＋縁の流儀・同じシアン）。
// 曜日は本来カテゴリ比較なので棒の方が教科書的に正しい形＝切り替えの価値が高い。
export function WeekdayChart({ wd, themePref, large = false, flights = NO_FLIGHTS, onDrill, mode = 'default' }: {
  wd: Record<number, number>; themePref: string;
  large?: boolean; flights?: Flight[]; onDrill?: (value: string) => void; mode?: ChartMode;
}) {
  const data = WEEKDAYS.map((_, i) => wd?.[i] || 0);
  const line = cssVar('--cyan');
  const ref = useChart((): ChartConfiguration<'line'> | ChartConfiguration<'bar'> => {
    const options: ChartConfiguration<'line'>['options'] = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        ...(large ? { tooltip: { callbacks: { label: (ctx) => bucketLines(flights, (f) => weekdayIndex(f.date) === ctx.dataIndex) } } } : {}),
      },
      scales: {
        y: { beginAtZero: true, grid: chartGrid(), ticks: large ? { ...chartTick(), font: { family: 'Outfit', size: 14 } } : chartTick() },
        x: { grid: { display: false }, ticks: { ...chartTick(), font: { family: 'JetBrains Mono', size: large ? 14 : 11 } } },
      },
      ...(large && onDrill ? {
        onClick: (_e, els) => { if (els.length) { const i = els[0].index; setTimeout(() => onDrill(String(i)), 0); } },
        onHover: (e, els) => { const c = e.native?.target as HTMLElement | undefined; if (c) c.style.cursor = els.length ? 'pointer' : 'default'; },
      } : {}),
    };
    if (mode === 'bar') {
      return {
        type: 'bar',
        data: {
          labels: WEEKDAYS,
          datasets: [{
            data,
            backgroundColor: line + '70',
            borderColor: line,
            borderWidth: 1.5,
            borderRadius: large ? 8 : 5,
            barPercentage: 0.55,
          }],
        },
        options: options as ChartConfiguration<'bar'>['options'],
      };
    }
    return {
      type: 'line',
      data: {
        labels: WEEKDAYS,
        datasets: [{
          data,
          borderColor: line,
          backgroundColor: large ? 'rgba(0,212,255,0.10)' : 'rgba(0,212,255,0.08)',
          fill: true,
          tension: 0.4,
          pointRadius: large ? 7 : 5,
          pointHoverRadius: large ? 9 : undefined,
          borderWidth: large ? 3 : undefined,
          pointBackgroundColor: line,
          pointBorderColor: cssVar('--chart-point-border'),
          pointBorderWidth: 2,
        }],
      },
      options,
    };
  }, [wd, themePref, large, flights, mode]);
  return <canvas ref={ref} />;
}
