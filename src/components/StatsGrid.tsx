import { computeAll, computeSetStats, type Flight } from '../lib/compute';
import { emitStatExpand, type StatExpandKind } from '../lib/dashboard-events';
import { activatable } from '../lib/a11y';

// 総飛行時間（分）→「XhYm」形式（旧 render.js renderStats と同じ表記。分が 0 なら h のみ）。
function fmtFlightTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m ? m + 'm' : ''}`;
}

// ヘッダ内の 6 枚サマリーカード（旧 render.js renderStats の移植）。
// Flights / Aircraft / Routes / Airports / Countries/Regions / Flight Time。
// 各カードは `.is-clickable`＝クリックで対応する拡大を開く（emitStatExpand 経由）。
//   Flights→フライトログ全画面／Aircraft・Routes・Airports・Countries→バー拡大／Flight Time→Top Flights 拡大。
export function StatsGrid({ flights }: { flights: Flight[] }) {
  const s = computeAll(flights);
  const { mins } = computeSetStats(flights);
  const boxes: [string, string, StatExpandKind][] = [
    [String(flights.length), 'Flights', 'flightlog'],
    [String(s.ac.length), 'Aircraft', 'aircraft'],
    [String(s.rt.length), 'Routes', 'routes'],
    [String(s.ap.length), 'Airports', 'airports'],
    [String(s.co.length), 'Countries/Regions', 'countries'],
    [fmtFlightTime(mins), 'Flight Time', 'flighttime'],
  ];
  return (
    <div className="stats-grid" id="statsGrid">
      {boxes.map(([num, lbl, kind]) => (
        <div
          className="stat-box is-clickable" key={lbl}
          onClick={() => emitStatExpand(kind)}
          aria-label={`${lbl}: ${num}. Expand`}
          {...activatable(() => emitStatExpand(kind))}
        >
          <div className="num">{num}</div>
          <div className="lbl">{lbl}</div>
        </div>
      ))}
    </div>
  );
}
