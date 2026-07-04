import type { ChartConfiguration } from 'chart.js';
import { cssVar, chartGrid, chartTick } from '../../lib/charts';
import { bucketLines } from '../../lib/chart-bucket';
import type { Flight } from '../../lib/compute';
import { useChart } from './useChart';

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
export function WeekdayChart({ wd, themePref, large = false, flights = [], onDrill }: {
  wd: Record<number, number>; themePref: string;
  large?: boolean; flights?: Flight[]; onDrill?: (value: string) => void;
}) {
  const data = WEEKDAYS.map((_, i) => wd?.[i] || 0);
  const line = cssVar('--cyan');
  const ref = useChart((): ChartConfiguration<'line'> => ({
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
    options: {
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
    },
  }), [wd, themePref, large, flights]);
  return <canvas ref={ref} />;
}
