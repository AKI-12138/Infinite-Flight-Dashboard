// Add Flight フォームの autocomplete 候補データ（旧 render.js の getACData）。
// type ごとに {code, detail} のリストを返す。UI 層（AutocompleteInput）が絞り込み・描画する。
import { AP } from '../data/airports';
import { AIRCRAFT_CANONICAL_TABLE } from '../data/aircraft';
import { AIRLINE_TABLE } from '../data/airlines';
import type { Flight } from './compute';

export interface ACItem { code: string; detail: string }
export type ACType = 'airport' | 'aircraft' | 'airline' | 'time-h' | 'time-m';

export function getACData(type: ACType, flights: Flight[]): ACItem[] {
  if (type === 'airport') {
    return Object.entries(AP).map(([code, data]) => ({ code, detail: data.city + ', ' + data.co }));
  }
  if (type === 'aircraft') {
    // 候補は data/aircraft の正準コード表＋既存データの機材（単一ソース）。
    const set = new Set<string>();
    flights.forEach((f) => set.add(f.ac));
    Object.keys(AIRCRAFT_CANONICAL_TABLE).forEach((a) => set.add(a));
    return [...set].filter(Boolean).sort().map((code) => ({ code, detail: '' }));
  }
  if (type === 'airline') {
    // 候補は航空会社DB（data/airlines）の正準名をベースに、既存データの航空会社を混ぜる（単一ソース）。
    // detail に IATA/ICAO 等の別名を入れておく＝「ANA」等コードで打っても絞り込める（AutocompleteInput は
    // code と detail の両方を includes 判定する）。航空会社を足すときは data/airlines を編集すれば両方に反映。
    const detailByName = new Map<string, string>();
    Object.entries(AIRLINE_TABLE).forEach(([name, aliases]) => {
      detailByName.set(name, aliases.slice(0, 2).join(' · '));
    });
    flights.forEach((f) => { if (f.al && !detailByName.has(f.al)) detailByName.set(f.al, ''); });
    return [...detailByName.entries()]
      .filter(([code]) => code)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([code, detail]) => ({ code, detail }));
  }
  // Flight Time（分離入力）：FR24 風の固定ドロップダウン。h=0..23 / m=0,5,...,55。
  const values: string[] = [];
  if (type === 'time-h') { for (let i = 0; i <= 23; i++) values.push(String(i)); }
  else { for (let i = 0; i < 60; i += 5) values.push(String(i)); }
  return values.map((code) => ({ code, detail: '' }));
}
