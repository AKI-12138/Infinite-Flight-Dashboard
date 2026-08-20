import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { StoredFlight } from '../lib/datasource';
import { currentTileUrl, TILE_OPTS, drawMapLayers, addGeoLines } from '../lib/map-helpers';
import { useModalKeyboard } from '../hooks/useModalKeyboard';

// 拡大 2D 地図オーバーレイ（旧 #mapOverlay + render-map.js の initMapExpanded）。
// インライン地図と同じ描画（Leaflet 再利用）。fitMaxZoom=5 で広めに寄せる。
// 常時マウントし open で .show を切替（Leaflet は初回オープン時に生成・以後保持）。
export function MapExpandedOverlay({ flights, themePref, open, onClose }: {
  flights: StoredFlight[]; themePref: string; open: boolean; onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const routeLayers = useRef<L.Layer[]>([]);
  const geoLayers = useRef<L.Layer[]>([]);
  const homeBounds = useRef<L.LatLngBounds | null>(null); // 既定表示（「表示リセット」で戻す先）。

  // 初回オープンで生成（可視＝正しいサイズ）。以後は invalidateSize のみ。
  useEffect(() => {
    if (!open) return;
    const el = containerRef.current;
    if (!el) return;
    if (!mapRef.current) {
      const m = L.map(el, {
        center: [20, 100], zoom: 2, zoomControl: true, attributionControl: false,
        worldCopyJump: false, minZoom: 1, maxBounds: [[-85, -30], [85, 340]], maxBoundsViscosity: 1.0,
      });
      tileRef.current = L.tileLayer(currentTileUrl(), TILE_OPTS).addTo(m);
      mapRef.current = m;
      addGeoLines(m, geoLayers.current);
      homeBounds.current = drawMapLayers(m, flights, routeLayers.current, 5);
    }
    setTimeout(() => mapRef.current?.invalidateSize(), 60);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // データ／テーマ変化 → ルート再描画。
  useEffect(() => { if (mapRef.current) homeBounds.current = drawMapLayers(mapRef.current, flights, routeLayers.current, 5); }, [flights, themePref]);

  // 「表示リセット」：パン/ズームを既定の全体表示（初期 fitBounds と同じ）へスムーズに戻す。
  const resetView = () => {
    const m = mapRef.current;
    if (m && homeBounds.current) m.fitBounds(homeBounds.current, { maxZoom: 5 });
  };
  // テーマ変化 → タイル差し替え。
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !tileRef.current) return;
    m.removeLayer(tileRef.current);
    tileRef.current = L.tileLayer(currentTileUrl(), TILE_OPTS).addTo(m);
  }, [themePref]);

  // オープン中は背後スクロールをロック＋ESC で閉じる（重なっても一番上だけ）。
  const modalRef = useModalKeyboard(open, onClose);

  // アンマウント時に破棄。
  useEffect(() => () => { mapRef.current?.remove(); mapRef.current = null; }, []);

  return (
    <div ref={modalRef} className={'map-overlay' + (open ? ' show' : '')} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="map-panel">
        <div className="map-panel-header">
          <h3>Route Map</h3>
          <div className="map-panel-actions">
            <button className="map-reset-btn" onClick={resetView} title="Reset view (fit all)">⌖</button>
            <button className="btn-close" onClick={onClose}>✕</button>
          </div>
        </div>
        <div id="flightMapExpanded" ref={containerRef}></div>
      </div>
    </div>
  );
}
