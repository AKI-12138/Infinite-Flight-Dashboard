// =============================== CHART.JS SETUP ===============================
// Chart.js v4 はツリーシェイク方式：使うコントローラ・要素・スケール・プラグインを
// 明示的に register する。旧版は CDN の全部入り UMD を読んでいたが、React 版では必要分だけ。
// 依存: doughnut（大陸）/ bar（年）/ line（月・曜日）+ 各スケール + Filler（塗り）+ Tooltip/Legend。
import {
  Chart,
  DoughnutController, ArcElement,
  BarController, BarElement,
  LineController, LineElement, PointElement,
  CategoryScale, LinearScale,
  Filler, Tooltip, Legend,
} from 'chart.js';

Chart.register(
  DoughnutController, ArcElement,
  BarController, BarElement,
  LineController, LineElement, PointElement,
  CategoryScale, LinearScale,
  Filler, Tooltip, Legend,
);

export { Chart };
export { cssVar } from './css-var';
import { cssVar } from './css-var';

// チャート内の共通フォント（UI は Outfit）。
export const chartFont = { family: 'Outfit', size: 11 } as const;

// 軸グリッド／目盛りの色（テーマ変数）。getter で最新値を取る。
export function chartGrid() {
  return { color: cssVar('--chart-grid') };
}
export function chartTick() {
  return { color: cssVar('--chart-tick'), font: chartFont };
}
