import type { ChartConfiguration, TooltipItem } from 'chart.js';
import { cssVar, chartFont } from '../../lib/charts';
import { CT_COLORS } from '../../lib/viz-colors';
import { useChart } from './useChart';

// 大陸ドーナツ（旧 render-charts.js renderCharts の Continent 部分）。
// large=true（⛶ 拡大）では旧 _renderContinentsLargeChart 相当：cutout/角丸/凡例を大型化。
export function ContinentChart({ ct, themePref, large = false }: { ct: [string, number][]; themePref: string; large?: boolean }) {
  const total = ct.reduce((sum, d) => sum + d[1], 0);
  const ref = useChart((): ChartConfiguration<'doughnut'> => ({
    type: 'doughnut',
    data: {
      labels: ct.map((d) => d[0]),
      datasets: [{
        data: ct.map((d) => d[1]),
        backgroundColor: ct.map((d) => CT_COLORS[d[0]] || '#4d5f7a'),
        borderWidth: 0,
        borderRadius: large ? 6 : 4,
        spacing: large ? 4 : 3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: large ? '58%' : '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: large
            ? { color: cssVar('--chart-legend-strong'), font: { family: 'Outfit', size: 14 }, padding: 20, usePointStyle: true, pointStyleWidth: 12 }
            : { color: cssVar('--chart-legend'), font: chartFont, padding: 14, usePointStyle: true, pointStyleWidth: 8 },
        },
        tooltip: {
          callbacks: {
            label: (ctx: TooltipItem<'doughnut'>) => {
              const v = ctx.parsed;
              const pct = total ? ((v / total) * 100).toFixed(1) : '0.0';
              return ` ${v} flights (${pct}%)`;
            },
          },
        },
      },
    },
  }), [ct, themePref]);
  return <canvas ref={ref} />;
}
