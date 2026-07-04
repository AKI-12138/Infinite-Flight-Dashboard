import { parseMin, type Flight } from './compute';

// 拡大チャートのリッチツールチップ（旧 render-charts.js の _bucketLines）。
// その点（年/月/曜日）に属するフライトを pred で絞り、「N flights · XhYYm」＋上位3エアラインを返す。
// flights はフィルタ適用後の全フライト（拡大チャートは getFiltered 相当を受け取る）。
export function bucketLines(flights: Flight[], pred: (f: Flight) => boolean): string | string[] {
  const arr = flights.filter(pred);
  if (arr.length === 0) return ' 0 flights';
  let mins = 0;
  const al: Record<string, number> = {};
  arr.forEach((f) => { mins += parseMin(f.t); if (f.al) al[f.al] = (al[f.al] || 0) + 1; });
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const top = Object.entries(al).sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([k, v]) => `${k} ${v}`).join(' · ');
  const lines = [` ${arr.length} flight${arr.length !== 1 ? 's' : ''} · ${h}h${String(m).padStart(2, '0')}m`];
  if (top) lines.push(' ' + top);
  return lines;
}
