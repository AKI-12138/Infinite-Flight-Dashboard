import { useState } from 'react';
import { STORAGE_AVAILABLE } from '../lib/datasource';

// チャートの表示形式トグル（円⇄棒・線⇄棒）の選択を localStorage に記憶する小さなフック
// （オーナー指定 2026-07-11）。'default'＝従来の見た目（ドーナツ/折れ線）、'bar'＝棒グラフ。
// カードごとに独立（key: 'continents' | 'month' | 'weekday'）。既定は必ず 'default'
// ＝見た目を変えない原則（CLAUDE.md）。
export type ChartMode = 'default' | 'bar';
const _KEY = 'if-dashboard:chart-modes:v1';

function _loadAll(): Record<string, ChartMode> {
  if (!STORAGE_AVAILABLE) return {};
  try {
    const raw = localStorage.getItem(_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === 'object' ? obj : {};
  } catch { return {}; }
}

export function useChartMode(card: string): [ChartMode, (m: ChartMode) => void] {
  const [mode, setModeState] = useState<ChartMode>(() => (_loadAll()[card] === 'bar' ? 'bar' : 'default'));
  const setMode = (m: ChartMode) => {
    setModeState(m);
    if (!STORAGE_AVAILABLE) return;
    try {
      const all = _loadAll();
      if (m === 'default') delete all[card]; // 既定は「保存なし」で表す
      else all[card] = m;
      localStorage.setItem(_KEY, JSON.stringify(all));
    } catch { /* 保存できなくても致命的でない */ }
  };
  return [mode, setMode];
}
