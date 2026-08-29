// =============================== MAP HELPERS（Leaflet 2D） ===============================
// 旧 render-map.js の 2D 地図ロジックを移植（インライン地図分）。命令型 Leaflet を扱うので
// React コンポーネント（MapCard）から呼ぶ純粋寄りのヘルパに切り出す。
// 太平洋中心レイアウト（mapLng で西半球を +360 シフト）＝Africa→Europe→Asia→Pacific→Americas。
import L from 'leaflet';
import { GeodesicLine } from 'leaflet.geodesic';
import { AP } from '../data/airports';
import { cssVar } from './css-var';
import type { Flight } from './compute';

// 西半球の経度を東へシフト（アメリカが左端に来る／世界ラップ問題を避ける）。
export function mapLng(lng: number): number {
  return lng < -25 ? lng + 360 : lng;
}

// ---------------------------- 背景地図（basemap）の唯一の窓口 ----------------------------
// タイルの URL と帰属表示を画面側に書かない。差し替えるときはここだけを直す
// （CLAUDE.md「共通の境界モジュールを迂回しない」と同じ作法）。
const BASEMAP_KEY = import.meta.env.VITE_CARTO_BASEMAP_KEY ?? '';

// 現テーマのタイル URL（dark_all / light_all）。CSS 変数 --map-tile-style から決定。
export function currentTileUrl(): string {
  const style = cssVar('--map-tile-style') === 'light' ? 'light_all' : 'dark_all';
  const base = `https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png`;
  return BASEMAP_KEY ? `${base}?key=${encodeURIComponent(BASEMAP_KEY)}` : base;
}

// 帰属表示（attribution）。**提供元の利用条件で表示が必須**＝消さない。
// 背景地図を差し替えるときは、この文字列も必ず一緒に替える。
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors ' +
  '&copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>';

export const TILE_OPTS: L.TileLayerOptions = {
  subdomains: 'abcd', maxZoom: 18, noWrap: false, attribution: TILE_ATTRIBUTION,
};

// ルート＋空港マーカーを描き直す。layers（呼び出し側の配列）を clear→再投入する。
// fitMaxZoom: fitBounds 上限（インライン=3）。
// 戻り値：fit した既定表示の bounds（「表示リセット」で再フィットするのに使う）。空なら null。
export function drawMapLayers(map: L.Map, data: Flight[], layers: L.Layer[], fitMaxZoom: number): L.LatLngBounds | null {
  layers.forEach((l) => map.removeLayer(l));
  layers.length = 0;

  const apCount: Record<string, number> = {};
  data.forEach((f) => {
    apCount[f.dep.trim()] = (apCount[f.dep.trim()] || 0) + 1;
    apCount[f.arr.trim()] = (apCount[f.arr.trim()] || 0) + 1;
  });

  // ルートが触れた側（右=自然位置 / 左=大西洋越えで -360）を集計し、後段でマーカーを描く。
  const markerSides: Record<string, Set<'left' | 'right'>> = {};
  const useSide = (code: string, side: 'left' | 'right') => {
    (markerSides[code] ||= new Set<'left' | 'right'>()).add(side);
  };
  const routeSet = new Set<string>();
  const routeOpts = { color: cssVar('--map-route-line'), weight: 1.5, opacity: 0.35, dashArray: '6,4', wrap: false, steps: 8 };
  data.forEach((f) => {
    const d = f.dep.trim(), a = f.arr.trim();
    const key = [d, a].sort().join('-');
    if (routeSet.has(key)) return;
    routeSet.add(key);
    const p1 = AP[d], p2 = AP[a];
    if (!p1 || !p2) return;
    const m1 = mapLng(p1.lng), m2 = mapLng(p2.lng);
    let drawLng1 = m1, drawLng2 = m2;
    if (m2 - m1 > 180) { drawLng2 = m2 - 360; useSide(d, 'right'); useSide(a, 'left'); }
    else if (m1 - m2 > 180) { drawLng1 = m1 - 360; useSide(d, 'left'); useSide(a, 'right'); }
    else { useSide(d, 'right'); useSide(a, 'right'); }
    const line = new GeodesicLine([[p1.lat, drawLng1], [p2.lat, drawLng2]], routeOpts);
    line.addTo(map);
    layers.push(line);
  });

  // 空港マーカー（見た目＋タッチ用の不可視ヒットエリア）。fitBounds は primary のみ見る。
  const primaryMarkers: L.CircleMarker[] = [];
  const addMarkerAt = (code: string, count: number, lng: number, isPrimary: boolean) => {
    const a = AP[code];
    const isHub = count >= 10;
    const size = isHub ? 14 : Math.max(6, Math.min(12, count * 1.5 + 4));
    const color = isHub ? cssVar('--amber') : cssVar('--red');
    const latlng: L.LatLngExpression = [a.lat, lng];
    const marker = L.circleMarker(latlng, { radius: size / 2, fillColor: color, fillOpacity: 0.8, color, weight: 1, opacity: 0.3, interactive: false });
    marker.addTo(map);
    layers.push(marker);
    if (isPrimary) primaryMarkers.push(marker);
    const hitR = Math.max(size / 2, 12);
    const hit = L.circleMarker(latlng, { radius: hitR, fillOpacity: 0, opacity: 0, weight: 0 });
    hit.addTo(map);
    hit.bindTooltip(`<b>${code}</b> — ${a.city}<br>${count} flights`, { className: 'map-tooltip', direction: 'top', offset: [0, -8] });
    layers.push(hit);
  };
  Object.entries(apCount).forEach(([code, count]) => {
    if (!AP[code]) return;
    const m = mapLng(AP[code].lng);
    const sides = markerSides[code] || new Set<'left' | 'right'>(['right']);
    const hasRight = sides.has('right'), hasLeft = sides.has('left');
    if (hasRight) addMarkerAt(code, count, m, true);
    if (hasLeft) addMarkerAt(code, count, m - 360, !hasRight);
  });

  if (primaryMarkers.length > 0) {
    const group = L.featureGroup(primaryMarkers);
    const bounds = group.getBounds().pad(0.05);
    map.fitBounds(bounds, { maxZoom: fitMaxZoom });
    return bounds;
  }
  return null;
}

// =============================== GEOGRAPHIC LINES（IDL + 赤道） ===============================
// Natural Earth の geojson から国際日付変更線・赤道を取得し、太平洋中心レイアウトに合わせて
// 経度シフト＋不連続点で分割、-360/0/+360 の複製描画で世界ループ領域にも線を出す。初回 fetch はキャッシュ。
interface GeoLinesData { dateline: [number, number][][]; equator: [number, number][][]; }
let _geoLinesPromise: Promise<GeoLinesData | null> | null = null;

// GeoJSON geometry（[lng,lat]）→ Leaflet 用 [[lat, mapLng], ...] の配列の配列（不連続点で分割）。
function geomToLatlngs(geom: { type: string; coordinates: number[][] | number[][][] } | null): [number, number][][] {
  if (!geom) return [];
  const lineStrings: number[][][] = [];
  if (geom.type === 'LineString') lineStrings.push(geom.coordinates as number[][]);
  else if (geom.type === 'MultiLineString') (geom.coordinates as number[][][]).forEach((ls) => lineStrings.push(ls));
  const result: [number, number][][] = [];
  lineStrings.forEach((ls) => {
    let cur: [number, number][] = [];
    let prevLng: number | null = null;
    ls.forEach((coord) => {
      const lng = coord[0], lat = coord[1];
      const m = mapLng(lng);
      if (prevLng !== null && Math.abs(m - prevLng) > 180) {
        if (cur.length >= 2) result.push(cur);
        cur = [];
      }
      cur.push([lat, m]);
      prevLng = m;
    });
    if (cur.length >= 2) result.push(cur);
  });
  return result;
}

function loadGeoLines(): Promise<GeoLinesData | null> {
  if (_geoLinesPromise) return _geoLinesPromise;
  _geoLinesPromise = fetch('https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_geographic_lines.geojson')
    .then((r) => r.json())
    .then((geo) => {
      if (!geo || !Array.isArray(geo.features)) return null;
      const pick = (name: string) => geo.features.find((f: { properties?: { name?: string } }) => f && f.properties && f.properties.name === name);
      const idl = pick('International Date Line');
      const eq = pick('Equator');
      return { dateline: idl ? geomToLatlngs(idl.geometry) : [], equator: eq ? geomToLatlngs(eq.geometry) : [] };
    })
    .catch((e) => { console.warn('Failed to load geographic lines:', e); _geoLinesPromise = null; return null; });
  return _geoLinesPromise;
}

function drawRepeatedPolylines(map: L.Map, arr: [number, number][][], style: L.PolylineOptions, layers: L.Layer[]): void {
  const offsets = [-360, 0, 360];
  arr.forEach((seg) => offsets.forEach((off) => {
    const shifted = seg.map((p) => [p[0], p[1] + off]) as L.LatLngExpression[];
    const pl = L.polyline(shifted, style);
    pl.addTo(map);
    layers.push(pl);
  }));
}

// IDL（amber 点線）＋赤道（紫の点々）を追加。fetch 完了後に描画（layers に push）。
export function addGeoLines(map: L.Map, layers: L.Layer[]): void {
  loadGeoLines().then((data) => {
    if (!data) return;
    drawRepeatedPolylines(map, data.dateline, { color: cssVar('--map-idl'), weight: 1.2, opacity: 0.55, dashArray: '4,4', interactive: false }, layers);
    drawRepeatedPolylines(map, data.equator, { color: cssVar('--map-equator'), weight: 1, opacity: 0.45, dashArray: '2,5', interactive: false }, layers);
  });
}
