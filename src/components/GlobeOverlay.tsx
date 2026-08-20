import { useEffect, useRef, useState } from 'react';
import type { GlobeInstance } from 'globe.gl';
import type { StoredFlight } from '../lib/datasource';
import { createGlobe, updateGlobeData, applyGlobeTheme, preloadGlobeHiRes } from '../lib/globe-helpers';
import { useModalKeyboard } from '../hooks/useModalKeyboard';

// 3D 地球儀オーバーレイ（旧 index.html の #globeOverlay + render-map.js の Globe 分）。
// 常時マウントし open で .show を切替（globe.gl は初回オープン時に dynamic import で生成・以後保持）。
export function GlobeOverlay({ flights, themePref, open, onClose }: {
  flights: StoredFlight[]; themePref: string; open: boolean; onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeInstance | null>(null);
  const pausedRef = useRef(false);
  const resumeTimer = useRef<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(false); // 初回生成中（テクスチャ DL 待ち）はスピナー表示。
  const readyTimer = useRef<number | null>(null);

  function resizeGlobe() {
    const g = globeRef.current, c = containerRef.current;
    if (g && c) g.width(c.clientWidth).height(c.clientHeight);
  }

  // 初回オープンで globe を生成（可視状態＝正しいサイズ）。以後は resize のみ。
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      if (globeRef.current) { resizeGlobe(); return; }
      const container = containerRef.current;
      if (!container) return;
      setLoading(true); // 生成開始＝テクスチャ（外部CDN画像）の DL 待ちの間スピナーを出す。
      const globe = await createGlobe(container);
      if (cancelled) { globe._destructor(); return; }
      globeRef.current = globe;
      // 自転：ゆっくり自動回転。操作中は一時停止、離して 4 秒で再開（手動 ⏸ 中は再開しない）。
      const controls = globe.controls();
      controls.autoRotate = !pausedRef.current;
      controls.autoRotateSpeed = 0.4;
      controls.addEventListener('start', () => {
        controls.autoRotate = false;
        if (resumeTimer.current) { clearTimeout(resumeTimer.current); resumeTimer.current = null; }
      });
      controls.addEventListener('end', () => {
        if (resumeTimer.current) clearTimeout(resumeTimer.current);
        if (pausedRef.current) return;
        resumeTimer.current = window.setTimeout(() => { if (!pausedRef.current) controls.autoRotate = true; }, 4000);
      });
      updateGlobeData(globe, flights);
      preloadGlobeHiRes(globe);
      resizeGlobe();
      // 準備完了（テクスチャ読込＋初回描画）でスピナー解除。onGlobeReady は globe.gl 公式イベント
      // （型定義には無いが dist に存在）。保険：万一発火しなくても最大 10 秒で必ず消す。
      const done = () => {
        if (readyTimer.current) { clearTimeout(readyTimer.current); readyTimer.current = null; }
        if (!cancelled) setLoading(false);
      };
      const g = globe as GlobeInstance & { onGlobeReady?: (cb: () => void) => unknown };
      if (typeof g.onGlobeReady === 'function') g.onGlobeReady(done); else done();
      readyTimer.current = window.setTimeout(done, 10000);
    })();
    return () => { cancelled = true; if (readyTimer.current) { clearTimeout(readyTimer.current); readyTimer.current = null; } };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // オープン時にサイズ再計算（パネルアニメ後）。
  useEffect(() => { if (open) setTimeout(resizeGlobe, 60); }, [open]);
  // コンテナのサイズ変化に追従して globe を再サイズ（レイアウト確定・ウィンドウ変更・開き直しで
  // 中心がずれないように）。globe.gl は自動リサイズしないので明示的に width/height を合わせ続ける。
  useEffect(() => {
    const c = containerRef.current;
    if (!c || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => resizeGlobe());
    ro.observe(c);
    return () => ro.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // データ変化 → ポイント/アーク更新。
  useEffect(() => { if (globeRef.current) updateGlobeData(globeRef.current, flights); }, [flights]);
  // テーマ変化 → 色・テクスチャ再適用。
  useEffect(() => { if (globeRef.current) applyGlobeTheme(globeRef.current); }, [themePref]);

  // オープン中は背後スクロールをロック＋ESC で閉じる（重なっても一番上だけ）。
  const modalRef = useModalKeyboard(open, onClose);

  // アンマウント時に破棄（three.js のクリーンアップ）。
  useEffect(() => () => { globeRef.current?._destructor(); globeRef.current = null; }, []);

  function togglePause() {
    const next = !pausedRef.current;
    pausedRef.current = next;
    setPaused(next);
    const g = globeRef.current;
    if (!g) return;
    const controls = g.controls();
    if (next) {
      controls.autoRotate = false;
      if (resumeTimer.current) { clearTimeout(resumeTimer.current); resumeTimer.current = null; }
    } else {
      controls.autoRotate = true;
    }
  }

  return (
    <div ref={modalRef} className={'globe-overlay' + (open ? ' show' : '')} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="globe-panel">
        <div className="globe-header">
          <h3>3D Globe</h3>
          <div className="globe-header-actions">
            <button className="globe-rotate-btn" onClick={togglePause} title={paused ? 'Resume rotation' : 'Pause rotation'} aria-label={paused ? 'Resume rotation' : 'Pause rotation'}>
              {paused ? '▶' : '⏸'}
            </button>
            <button className="btn-close" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="globe-body">
          <div id="globeContainer" ref={containerRef}></div>
          {loading && (
            <div className="globe-loading" aria-live="polite">
              <div className="globe-spinner" aria-hidden="true"></div>
              <span>Loading globe…</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
