import type { ChartConfiguration, TooltipItem } from 'chart.js';
import { cssVar, chartFont, chartGrid, chartTick } from '../../lib/charts';
import { CT_COLORS } from '../../lib/viz-colors';
import { useChart } from './useChart';
import type { ChartMode } from '../../hooks/useChartMode';

// 大陸ドーナツ（旧 render-charts.js renderCharts の Continent 部分）。
// large=true（⛶ 拡大）では旧 _renderContinentsLargeChart 相当：cutout/角丸/凡例を大型化。
// mode='bar'（2026-07-11）は横棒に切り替え：構成比のドーナツに対し、少ない大陸どうしの
// 実数比較が読める補完形。色は同じ大陸色（実体に固定）・大陸名は軸ラベルが凡例代わり。
export function ContinentChart({ ct, themePref, large = false, mode = 'default' }: {
  ct: [string, number][]; themePref: string; large?: boolean; mode?: ChartMode;
}) {
  const total = ct.reduce((sum, d) => sum + d[1], 0);
  const pctLabel = (v: number) => {
    const pct = total ? ((v / total) * 100).toFixed(1) : '0.0';
    return ` ${v} flights (${pct}%)`;
  };
  const ref = useChart((): ChartConfiguration<'doughnut'> | ChartConfiguration<'bar'> => {
    if (mode === 'bar') {
      return {
        type: 'bar',
        data: {
          labels: ct.map((d) => d[0]),
          datasets: [{
            data: ct.map((d) => d[1]),
            // 塗り＋縁は YearChart（既存の棒）と同じ流儀：色+'70' の半透明塗り＋実線の縁。
            backgroundColor: ct.map((d) => (CT_COLORS[d[0]] || '#4d5f7a') + '70'),
            borderColor: ct.map((d) => CT_COLORS[d[0]] || '#4d5f7a'),
            borderWidth: 1.5,
            borderRadius: large ? 8 : 5,
            barPercentage: 0.55,
          }],
        },
        options: {
          indexAxis: 'y', // 横棒＝長い大陸名がそのまま軸に載る
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }, // 軸ラベルが凡例代わり
            tooltip: { callbacks: { label: (ctx: TooltipItem<'bar'>) => pctLabel(ctx.parsed.x ?? 0) } },
          },
          scales: {
            x: { beginAtZero: true, grid: chartGrid(), ticks: { ...chartTick(), precision: 0, font: { family: 'JetBrains Mono', size: large ? 13 : 11 } } },
            y: { grid: { display: false }, ticks: { ...chartTick(), color: cssVar(large ? '--chart-legend-strong' : '--chart-legend'), font: { family: 'Outfit', size: large ? 14 : 12 } } },
          },
        },
      };
    }
    return {
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
              label: (ctx: TooltipItem<'doughnut'>) => pctLabel(ctx.parsed),
            },
          },
        },
      },
    };
  }, [ct, themePref, mode, large]);
  return <canvas ref={ref} />;
}
