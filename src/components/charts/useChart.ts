import { useEffect, useRef } from 'react';
import type { ChartConfiguration, ChartType } from 'chart.js';
import { Chart } from '../../lib/charts';

// 命令型ライブラリ（Chart.js）を React でラップする共通フック（CLAUDE.md 方針）。
// canvas の ref を返し、deps が変わるたびに Chart を破棄→再生成する。
// deps には「データ」と「テーマ」を渡す：データ変化で内容更新、テーマ変化で CSS 変数由来の色を再取得。
// T はチャート種別（'doughnut'/'bar'/'line'）。種別ごとの固有オプション（cutout 等）を型で許可する。
export function useChart<T extends ChartType>(buildConfig: () => ChartConfiguration<T>, deps: unknown[]) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const chart = new Chart(el, buildConfig());
    return () => chart.destroy();
    // buildConfig は毎レンダー新規だが、再構築は deps（データ／テーマ）で制御する。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}
