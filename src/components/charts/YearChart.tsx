import { useEffect, useRef } from 'react';
import type { ChartConfiguration } from 'chart.js';
import { chartGrid, chartTick } from '../../lib/charts';
import { YEAR_COLORS } from '../../lib/viz-colors';
import { bucketLines } from '../../lib/chart-bucket';
import type { Flight } from '../../lib/compute';
import { useChart } from './useChart';

// カード（非拡大）で表示する最大年数。年は今後も増え続ける唯一の軸なので、
// カードは「直近 N 年」に固定し、全期間は ⛶ 拡大（横スクロール）で見せる（オーナー判断 2026-07-08）。
const CARD_MAX_YEARS = 10;
// 拡大表示で 1 年（1 本）に確保する最小幅 px。総幅がパネルを超えたら横スクロールになる。
const LARGE_BAR_MIN_W = 72;

// 年別フライト数の棒グラフ（旧 render-charts.js renderCharts の Year 部分）。
// large=true（⛶ 拡大）では旧 _renderYearLargeChart 相当：大きいフォント／角丸＋
// リッチツールチップ（bucketLines）＋クリックでドリルダウン（onDrill）＋全期間（横スクロール）。
export function YearChart({ yr, themePref, large = false, flights = [], onDrill }: {
  yr: Record<string, number>; themePref: string;
  large?: boolean; flights?: Flight[]; onDrill?: (value: string) => void;
}) {
  const allYears = Object.keys(yr).sort();
  // カードは直近 CARD_MAX_YEARS 年だけ。拡大は全期間。
  const years = large ? allYears : allYears.slice(-CARD_MAX_YEARS);
  const hiddenCount = allYears.length - years.length;
  // 色は「全期間の並び」基準で割り当てる＝カードと拡大で同じ年が同じ色になる。
  const colorOffset = allYears.length - years.length;

  const ref = useChart((): ChartConfiguration<'bar'> => ({
    type: 'bar',
    data: {
      labels: years,
      datasets: [{
        data: years.map((y) => yr[y]),
        backgroundColor: years.map((_, i) => YEAR_COLORS[(colorOffset + i) % YEAR_COLORS.length] + '70'),
        borderColor: years.map((_, i) => YEAR_COLORS[(colorOffset + i) % YEAR_COLORS.length]),
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

  // 拡大：年数が多いとき内側の器を広げて横スクロールにする（Chart.js は親幅いっぱいに描く）。
  // 初期位置は右端＝直近の年から見せる（古い年は左へスクロール）。
  const scrollRef = useRef<HTMLDivElement>(null);
  const needScroll = large && years.length > CARD_MAX_YEARS;
  useEffect(() => {
    if (needScroll && scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
  }, [needScroll, years.length]);

  if (large) {
    return (
      <div ref={scrollRef} className="chart-scroll-x">
        <div className="chart-scroll-inner" style={needScroll ? { minWidth: years.length * LARGE_BAR_MIN_W } : undefined}>
          <canvas ref={ref} />
        </div>
      </div>
    );
  }
  return (
    <>
      <canvas ref={ref} />
      {/* 直近10年に切り詰めたときの案内（⛶ で全期間） */}
      {hiddenCount > 0 && <span className="chart-truncate-hint">last {CARD_MAX_YEARS} yrs · ⛶ for all</span>}
    </>
  );
}
