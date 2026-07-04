// Data check：フライトに含まれる空港/機材のうち、データセット（AP / 機材正準表）に無いものを集計。
// 旧 main.js の _computeUnrecognized の React 化（純関数）。UI（DataCheckModal・⚙ ステータス）が使う。
import { AP } from '../data/airports';
import { AIRCRAFT_CANONICAL_TABLE } from '../data/aircraft';
import type { Flight } from './compute';

export interface UnrecognizedResult {
  air: Record<string, { count: number; routes: string[] }>;
  acft: Record<string, number>;
}

export function computeUnrecognized(flights: Flight[]): UnrecognizedResult {
  const air: Record<string, { count: number; routes: Set<string> }> = {};
  const acft: Record<string, number> = {};
  flights.forEach((f) => {
    const seen = new Set<string>();  // 同一便で同じ未収録コードを二重カウントしない
    [f.dep, f.arr].forEach((code) => {
      if (code && !AP[code]) {
        if (!air[code]) air[code] = { count: 0, routes: new Set() };
        if (!seen.has(code)) { air[code].count++; seen.add(code); }
        air[code].routes.add(`${f.dep || '?'}→${f.arr || '?'}`);
      }
    });
    const ac = f.ac;
    if (ac && !(ac in AIRCRAFT_CANONICAL_TABLE)) {
      acft[ac] = (acft[ac] || 0) + 1;
    }
  });
  // Set → string[] へ（React で扱いやすく）。
  const airOut: UnrecognizedResult['air'] = {};
  Object.entries(air).forEach(([code, info]) => { airOut[code] = { count: info.count, routes: [...info.routes] }; });
  return { air: airOut, acft };
}

// 未収録の総数（空港＋機材）。⚙ データ収録ステータスのバッジ用。
export function unrecognizedCount(flights: Flight[]): number {
  const { air, acft } = computeUnrecognized(flights);
  return Object.keys(air).length + Object.keys(acft).length;
}
