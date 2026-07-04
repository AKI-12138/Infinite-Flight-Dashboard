// =============================== GLOBE HELPERS（Globe.gl 3D） ===============================
// 旧 render-map.js の 3D 地球儀ロジックを移植。three.js を含み重いので、createGlobe 内で
// **dynamic import('globe.gl')** して初回オープン時にだけロードする（初期バンドルに含めない）。
// 型のみの import（GlobeInstance）はコンパイル時に消えるのでバンドルに影響しない。
import type { GlobeInstance } from 'globe.gl';
import { AP } from '../data/airports';
import { cssVar } from './css-var';
import type { Flight } from './compute';

// テーマ別の地球テクスチャ（Light=Blue Marble 昼 / Dark=Earth Night 夜）。4k を優先し失敗時は 2k。
const GLOBE_TEX = {
  light: { hi: 'https://cdn.jsdelivr.net/gh/turban/webgl-earth@master/images/2_no_clouds_4k.jpg', lo: 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg' },
  dark: { hi: 'https://cdn.jsdelivr.net/gh/turban/webgl-earth@master/images/5_night_4k.jpg', lo: 'https://unpkg.com/three-globe/example/img/earth-night.jpg' },
};
const globeTexResolved: { light: string | null; dark: string | null } = { light: null, dark: null };

function themeKey(): 'light' | 'dark' {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}
function globeTextureUrl(): string {
  const k = themeKey();
  return globeTexResolved[k] || GLOBE_TEX[k].lo;
}
// 4k をバックグラウンド検証し、成功したら昇格＆現テーマなら即張り替え。
export function preloadGlobeHiRes(globe: GlobeInstance): void {
  (['light', 'dark'] as const).forEach((key) => {
    if (globeTexResolved[key]) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { globeTexResolved[key] = GLOBE_TEX[key].hi; if (themeKey() === key) globe.globeImageUrl(GLOBE_TEX[key].hi); };
    img.onerror = () => { globeTexResolved[key] = GLOBE_TEX[key].lo; };
    img.src = GLOBE_TEX[key].hi;
  });
}

// ツールチップ HTML（テーマ色を都度読む）。
function globeLabelHTML(html: string): string {
  const bg = cssVar('--bg-card'), border = cssVar('--border'), text = cssVar('--text');
  return `<div style="background:${bg};border:1px solid ${border};color:${text};padding:6px 10px;border-radius:6px;`
    + `font-family:Outfit,sans-serif;font-size:12px;box-shadow:0 4px 16px rgba(0,0,0,0.25);">${html}</div>`;
}

// 国境ポリゴン（Natural Earth 50m）。初回 fetch をモジュールキャッシュ（再オープンで再取得しない）。
let _polygonsData: object[] | null = null;
let _polygonsPromise: Promise<object[] | null> | null = null;
function loadGlobePolygons(globe: GlobeInstance): void {
  if (_polygonsData) { globe.polygonsData(_polygonsData); return; }
  if (!_polygonsPromise) {
    _polygonsPromise = fetch('https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_50m_admin_0_countries.geojson')
      .then((r) => r.json())
      .then((geo) => {
        if (geo && Array.isArray(geo.features)) {
          // 南極は形が大きすぎて見栄えを損ねるので除外。
          _polygonsData = geo.features.filter((f: { properties?: { ADMIN?: string } }) => !f.properties || f.properties.ADMIN !== 'Antarctica');
        }
        return _polygonsData;
      })
      .catch((e) => { console.warn('Failed to load country polygons for globe:', e); _polygonsPromise = null; return null; });
  }
  _polygonsPromise.then((data) => { if (data) globe.polygonsData(data); });
}

// 3D 地球儀を生成（dynamic import で globe.gl を遅延ロード）。
export async function createGlobe(container: HTMLElement): Promise<GlobeInstance> {
  const { default: Globe } = await import('globe.gl');
  const globe = new Globe(container)
    .globeImageUrl(globeTextureUrl())
    .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
    .backgroundColor('rgba(0,0,0,0)')
    .atmosphereColor(cssVar('--globe-atmosphere'))
    .atmosphereAltitude(0.15)
    .polygonsData([])
    .polygonCapColor(() => cssVar('--globe-poly-cap'))
    .polygonSideColor(() => cssVar('--globe-poly-side'))
    .polygonStrokeColor(() => cssVar('--globe-poly-stroke'))
    .polygonAltitude(0.01)
    .polygonLabel((obj: object) => {
      const d = obj as { properties?: { ADMIN?: string; NAME?: string } };
      const name = (d.properties && (d.properties.ADMIN || d.properties.NAME)) || '';
      return globeLabelHTML(`<b>${name}</b>`);
    })
    .pointsData([])
    .pointLat('lat').pointLng('lng').pointAltitude(0.01).pointRadius('size').pointColor('color')
    .pointLabel((obj: object) => {
      const d = obj as { code: string; city: string; count: number };
      return globeLabelHTML(`<b style="color:${cssVar('--accent')}">${d.code}</b> — ${d.city}<br>${d.count} flights`);
    })
    .arcsData([])
    .arcStartLat('startLat').arcStartLng('startLng').arcEndLat('endLat').arcEndLng('endLng')
    .arcColor(() => cssVar('--globe-arc'))
    .arcAltitudeAutoScale(0.4).arcStroke(0.4).arcDashLength(0.4).arcDashGap(0.15).arcDashAnimateTime(2500);
  loadGlobePolygons(globe);
  return globe;
}

// 空港ポイント＋ルートアーク（旧 renderGlobeData）。
export function updateGlobeData(globe: GlobeInstance, flights: Flight[]): void {
  const apCount: Record<string, number> = {};
  flights.forEach((f) => {
    apCount[f.dep.trim()] = (apCount[f.dep.trim()] || 0) + 1;
    apCount[f.arr.trim()] = (apCount[f.arr.trim()] || 0) + 1;
  });
  const points: object[] = [];
  Object.entries(apCount).forEach(([code, count]) => {
    const a = AP[code];
    if (!a) return;
    const isHub = count >= 10;
    points.push({
      lat: a.lat, lng: a.lng, code, city: a.city, count,
      size: isHub ? 0.55 : Math.max(0.25, Math.min(0.5, count * 0.04 + 0.2)),
      color: isHub ? cssVar('--amber') : cssVar('--red'),
    });
  });
  const arcs: object[] = [];
  const seen = new Set<string>();
  flights.forEach((f) => {
    const d = f.dep.trim(), a = f.arr.trim();
    const key = [d, a].sort().join('-');
    if (seen.has(key)) return;
    seen.add(key);
    const p1 = AP[d], p2 = AP[a];
    if (!p1 || !p2) return;
    arcs.push({ startLat: p1.lat, startLng: p1.lng, endLat: p2.lat, endLng: p2.lng });
  });
  globe.pointsData(points).arcsData(arcs);
}

// テーマ切替時に色＆テクスチャを再適用し、データ再代入で強制 redraw。
export function applyGlobeTheme(globe: GlobeInstance): void {
  globe
    .globeImageUrl(globeTextureUrl())
    .atmosphereColor(cssVar('--globe-atmosphere'))
    .polygonCapColor(() => cssVar('--globe-poly-cap'))
    .polygonSideColor(() => cssVar('--globe-poly-side'))
    .polygonStrokeColor(() => cssVar('--globe-poly-stroke'))
    .arcColor(() => cssVar('--globe-arc'));
  globe.polygonsData(globe.polygonsData());
  globe.pointsData(globe.pointsData());
  globe.arcsData(globe.arcsData());
}
