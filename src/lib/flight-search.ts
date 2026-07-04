// =============================== FLIGHT LOG SEARCH ===============================
// 旧 render-table.js の filterFlights を純関数化。サポート構文：
//   ・スペース区切りで複数キーワード AND（例：`RJTT ANA 2025`）
//   ・路線：1 トークン内に `RJTT-RJOO` / `RJTT→RJOO` / `RJTT->RJOO` / `RJTT>RJOO`（IATA も自動 ICAO 解決）
//   ・マイナス除外：`-foo`（例：`RJTT -RJOO`）
//   ・通常キーワード：date/dep/arr/aircraft/airline/duration を横断 substring 検索。IATA→ICAO も OR で照合。
// 大小文字は無視。クエリ空欄なら全行。
import { AP } from '../data/airports';
import { normalizeAirport } from './normalize';
import type { Flight } from './compute';

// IATA / ICAO を正準 ICAO に解決。既知空港なら ICAO（4文字大文字）、それ以外は null。
function resolveSearchAirport(token: string): string | null {
  const norm = normalizeAirport(token);
  if (!norm) return null;
  return AP[norm] ? norm : null;
}

export function filterFlightsByQuery<T extends Flight>(flights: T[], query: string): T[] {
  const q = query.trim();
  if (!q) return flights;
  // 路線パターン：コード部は [A-Z]+ のみ（日付の 2025-06 を誤検出しないため）
  const routeRe = /^([A-Z]{2,4})(?:->|→|>|-)([A-Z]{2,4})$/i;
  const tokens = q.split(/\s+/);
  const routes: { dep: string; arr: string }[] = [];
  const includes: (string | { any: string[] })[] = [];
  const excludes: string[] = [];
  for (const t of tokens) {
    if (t.startsWith('-') && t.length > 1) {
      excludes.push(t.slice(1).toLowerCase());
      continue;
    }
    const m = t.match(routeRe);
    if (m) {
      const dep = resolveSearchAirport(m[1]) || m[1].toUpperCase();
      const arr = resolveSearchAirport(m[2]) || m[2].toUpperCase();
      routes.push({ dep, arr });
    } else {
      const lower = t.toLowerCase();
      const resolved = resolveSearchAirport(t);
      if (resolved && resolved.toLowerCase() !== lower) {
        includes.push({ any: [lower, resolved.toLowerCase()] }); // IATA→ICAO の OR
      } else {
        includes.push(lower);
      }
    }
  }
  return flights.filter((f) => {
    if (routes.length > 0) {
      const ok = routes.some((r) => f.dep.toUpperCase() === r.dep && f.arr.toUpperCase() === r.arr);
      if (!ok) return false;
    }
    const hay = `${f.date} ${f.dep} ${f.arr} ${f.ac} ${f.al} ${f.t}`.toLowerCase();
    for (const inc of includes) {
      if (typeof inc === 'string') {
        if (!hay.includes(inc)) return false;
      } else if (!inc.any.some((s) => hay.includes(s))) {
        return false;
      }
    }
    for (const exc of excludes) {
      if (hay.includes(exc)) return false;
    }
    return true;
  });
}
