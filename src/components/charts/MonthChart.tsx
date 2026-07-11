import type { ChartConfiguration } from 'chart.js';
import { cssVar, chartGrid, chartTick } from '../../lib/charts';
import { bucketLines } from '../../lib/chart-bucket';
import type { Flight } from '../../lib/compute';
import { useChart } from './useChart';
import type { ChartMode } from '../../hooks/useChartMode';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 月別フライト数の折れ線（旧 render-charts.js renderCharts の Month 部分）。赤の面塗り。
// large=true（⛶ 拡大）では旧 _renderMonthLargeChart 相当：太線・大きい点＋
// リッチツールチップ（bucketLines）＋クリックでドリルダウン（onDrill）。
// mode='bar'（2026-07-11）は棒に切り替え（YearChart と同じ塗り＋縁の流儀・同じ赤）。
// options（軸・tooltip・ドリルダウン）は折れ線と棒で共通＝挙動は変わらない。
export function MonthChart({ mo, themePref, large = false, flights = [], onDrill, mode = 'default' }: {
  mo: Record<number, number>; themePref: string;
  large?: boolean; flights?: Flight[]; onDrill?: (value: string) => void; mode?: ChartMode;
}) {
  const data = MONTHS.map((_, i) => mo[i + 1] || 0);
  const ref = useChart((): ChartConfiguration<'line'> | ChartConfiguration<'bar'> => {
    const red = cssVar('--red');
    const options: ChartConfiguration<'line'>['options'] = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        ...(large ? { tooltip: { callbacks: { label: (ctx) => bucketLines(flights, (f) => f.date.slice(5, 7) === String(ctx.dataIndex + 1).padStart(2, '0')) } } } : {}),
      },
      scales: {
        y: { beginAtZero: true, grid: chartGrid(), ticks: large ? { ...chartTick(), font: { family: 'Outfit', size: 14 } } : chartTick() },
        x: { grid: { display: false }, ticks: large ? { ...chartTick(), font: { family: 'JetBrains Mono', size: 14 } } : chartTick() },
      },
      ...(large && onDrill ? {
        onClick: (_e, els) => { if (els.length) { const i = els[0].index; setTimeout(() => onDrill(String(i + 1).padStart(2, '0')), 0); } },
        onHover: (e, els) => { const c = e.native?.target as HTMLElement | undefined; if (c) c.style.cursor = els.length ? 'pointer' : 'default'; },
      } : {}),
    };
    if (mode === 'bar') {
      return {
        type: 'bar',
        data: {
          labels: MONTHS,
          datasets: [{
            data,
            backgroundColor: red + '70',
            borderColor: red,
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
        labels: MONTHS,
        datasets: [{
          data,
          borderColor: red,
          backgroundColor: large ? 'rgba(255,77,106,0.10)' : 'rgba(255,77,106,0.08)',
          fill: true,
          tension: 0.4,
          pointRadius: large ? 7 : 5,
          pointHoverRadius: large ? 9 : undefined,
          borderWidth: large ? 3 : undefined,
          pointBackgroundColor: red,
          pointBorderColor: cssVar('--chart-point-border'),
          pointBorderWidth: 2,
        }],
      },
      options,
    };
  }, [mo, themePref, large, flights, mode]);
  return <canvas ref={ref} />;
}
