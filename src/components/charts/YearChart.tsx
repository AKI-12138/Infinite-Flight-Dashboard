import type { ChartConfiguration } from 'chart.js';
import { chartGrid, chartTick } from '../../lib/charts';
import { YEAR_COLORS } from '../../lib/viz-colors';
import { bucketLines } from '../../lib/chart-bucket';
import type { Flight } from '../../lib/compute';
import { useChart } from './useChart';

// 年別フライト数の棒グラフ（旧 render-charts.js renderCharts の Year 部分）。
// large=true（⛶ 拡大）では旧 _renderYearLargeChart 相当：大きいフォント／角丸＋
// リッチツールチップ（bucketLines）＋クリックでドリルダウン（onDrill）。
export function YearChart({ yr, themePref, large = false, flights = [], onDrill }: {
  yr: Record<string, number>; themePref: string;
  large?: boolean; flights?: Flight[]; onDrill?: (value: string) => void;
}) {
  const years = Object.keys(yr).sort();
  const ref = useChart((): ChartConfiguration<'bar'> => ({
    type: 'bar',
    data: {
      labels: years,
      datasets: [{
        data: years.map((y) => yr[y]),
        backgroundColor: years.map((_, i) => YEAR_COLORS[i % YEAR_COLORS.length] + '70'),
        borderColor: years.map((_, i) => YEAR_COLORS[i % YEAR_COLORS.length]),
        borderWidth: 1.5,
        borderRadius: large ? 8 : 5,
        barPercentage: 0.55,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        ...(large ? { tooltip: { callbacks: { label: (ctx) => bucketLines(flights, (f) => f.date.slice(0, 4) === years[ctx.dataIndex]) } } } : {}),
      },
      scales: {
        y: { beginAtZero: true, grid: chartGrid(), ticks: large ? { ...chartTick(), font: { family: 'Outfit', size: 14 } } : chartTick() },
        x: { grid: { display: false }, ticks: { ...chartTick(), font: { family: 'JetBrains Mono', size: large ? 14 : 11 } } },
      },
      ...(large && onDrill ? {
        onClick: (_e, els) => { if (els.length) { const i = els[0].index; setTimeout(() => onDrill(years[i]), 0); } },
        onHover: (e, els) => { const c = e.native?.target as HTMLElement | undefined; if (c) c.style.cursor = els.length ? 'pointer' : 'default'; },
      } : {}),
    },
  }), [yr, themePref, large, flights]);
  return <canvas ref={ref} />;
}
