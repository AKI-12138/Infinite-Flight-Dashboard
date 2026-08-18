import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { StoredFlight } from '../lib/datasource';
import { currentTileUrl, TILE_OPTS, drawMapLayers, addGeoLines } from '../lib/map-helpers';

// インライン 2D ルートマップ（旧 index.html の .map-section + render-map.js の initMap/renderMap）。
// 命令型 Leaflet を useRef/useEffect でラップ（CLAUDE.md 方針）。
// ⚠️ 3D Globe（🌏）と拡大（⛶）は 5-4b で本実装。いまは notReady 仮置き。
// このコンポーネントはデータがある時だけマウントする（App 側で gating）＝可視状態で Leaflet を初期化。
export function MapCard({ flights, themePref, onGlobe, onExpand }: {
  flights: StoredFlight[]; themePref: string; onGlobe: () => void; onExpand: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const routeLayers = useRef<L.Layer[]>([]);
  const geoLayers = useRef<L.Layer[]>([]);
  const homeBounds = useRef<L.LatLngBounds | null>(null); // 既定表示（「表示リセット」で戻す先）。

  // 初期化（マウント時 1 回）。
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const m = L.map(el, {
      center: [20, 100], zoom: 2, zoomControl: true, attributionControl: false,
      worldCopyJump: false, minZoom: 1, maxBounds: [[-85, -30], [85, 340]], maxBoundsViscosity: 1.0,
    });
    tileRef.current = L.tileLayer(currentTileUrl(), TILE_OPTS).addTo(m);
    mapRef.current = m;
    addGeoLines(m, geoLayers.current);
    return () => {
      m.remove();
      mapRef.current = null; tileRef.current = null;
      routeLayers.current = []; geoLayers.current = [];
    };
  }, []);

  // テーマ変化 → タイル URL を差し替え（dark_all ↔ light_all）。
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !tileRef.current) return;
    m.removeLayer(tileRef.current);
    tileRef.current = L.tileLayer(currentTileUrl(), TILE_OPTS).addTo(m);
  }, [themePref]);

  // データ／テーマ変化 → ルート＋マーカーを描き直す（色は cssVar から再取得）。
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    homeBounds.current = drawMapLayers(m, flights, routeLayers.current, 3);
  }, [flights, themePref]);

  // 「表示リセット」：パン/ズームを既定の全体表示（初期 fitBounds と同じ）へスムーズに戻す。
  const resetView = () => {
    const m = mapRef.current;
    if (m && homeBounds.current) m.fitBounds(homeBounds.current, { maxZoom: 3 });
  };

  return (
    <div className="map-section" id="sec-map">
      <div className="map-card">
        <div className="map-header">
          <h3>🗺️ Route Map</h3>
          <div className="map-legend">
            <span><span className="dot" style={{ background: 'var(--amber)' }}></span> Hub</span>
            <span><span className="dot" style={{ background: 'var(--red)' }}></span> Airport</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 20, height: 2, background: 'var(--accent)', borderRadius: 1, opacity: 0.6 }}></span> Route
            </span>
          </div>
          <div className="map-actions">
            <button className="map-globe-btn" onClick={onGlobe}>🌏 3D Globe</button>
            <button className="map-expand-btn" onClick={resetView} title="Reset view (fit all)">⌖</button>
            <button className="map-expand-btn" onClick={onExpand} title="Expand">⛶</button>
          </div>
        </div>
        <div id="flightMap" ref={containerRef}></div>
      </div>
    </div>
  );
}
