import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  THEME_KEY,
  THEME_CYCLE,
  type ThemePref,
  resolveStoredTheme,
  applyEffectiveTheme,
} from '../lib/theme';

// テーマ（auto/light/dark）を管理する React フック。旧 main.js の applyTheme /
// _watchOsThemeChanges 相当を React 化。値の変化で <html data-theme> と localStorage を更新し、
// 'auto' のときだけ OS のテーマ変更に追従する。
export interface UseTheme {
  pref: ThemePref;
  setTheme: (p: ThemePref) => void;
  cycleTheme: () => void;
}

export function useTheme(): UseTheme {
  const [pref, setPref] = useState<ThemePref>(() => resolveStoredTheme());

  // pref 変更 → 永続化＋<html data-theme> 反映。
  // ⚠️ useLayoutEffect（描画前・全 passive effect より前）で data-theme を確定させる。
  //    useEffect だと子コンポーネント（地図タイル・チャート色）の passive effect が先に走り、
  //    cssVar() が 1 回前のテーマ色を読んでしまう（child-before-parent の effect 順序）。
  useLayoutEffect(() => {
    try { localStorage.setItem(THEME_KEY, pref); } catch { /* 保存失敗は致命的ではない */ }
    applyEffectiveTheme(pref);
  }, [pref]);

  // OS のテーマ設定変更を監視。保存値が 'auto' のときだけリアルタイム追従。
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => { if (pref === 'auto') applyEffectiveTheme('auto'); };
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, [pref]);

  const setTheme = useCallback((p: ThemePref) => setPref(p), []);
  const cycleTheme = useCallback(
    () => setPref((cur) => THEME_CYCLE[(THEME_CYCLE.indexOf(cur) + 1) % THEME_CYCLE.length]),
    [],
  );

  return { pref, setTheme, cycleTheme };
}
