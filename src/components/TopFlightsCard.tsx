import { useState } from 'react';
import { parseMin, type Flight } from '../lib/compute';
import { TIME_GRADIENT } from '../lib/viz-colors';

// 個別フライトを飛行時間で並べたランキング（旧 render.js renderTopFlightsBars の移植）。
// Longest / Shortest トグル。⛶ 拡大（全件・ソート）は後の手順 → onExpand に notReady。
export function TopFlightsCard({ flights, onExpand }: { flights: Flight[]; onExpand: () => void }) {
  const [mode, setMode] = useState<'longest' | 'shortest'>('longest');
  const [c1, c2] = TIME_GRADIENT;

  const sorted = flights
    .slice()
    .sort((a, b) => {
      const diff = parseMin(b.t) - parseMin(a.t);
      return mode === 'shortest' ? -diff : diff;
    })
    .slice(0, 5);
  // バー幅は「表示中 5 件の最長」を 100% にする（Shortest でもスケールが効く）。
  // 空配列（起動直後の 0 件）でも parseMin に undefined を渡さないよう ?? '' でガード。
  const maxMin = parseMin(sorted[0]?.t ?? '') || 1;

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">⏱️ Top Flights by Time</div>
        <div className="card-actions">
          <div className="toggle">
            <button
              className={'toggle-btn' + (mode === 'longest' ? ' active' : '')}
              type="button" onClick={() => setMode('longest')}
            >Longest</button>
            <button
              className={'toggle-btn' + (mode === 'shortest' ? ' active' : '')}
              type="button" onClick={() => setMode('shortest')}
            >Shortest</button>
          </div>
          <button className="card-expand-btn" type="button" onClick={onExpand} title="View all flights ranked">⛶</button>
        </div>
      </div>
      <div className="bars-compact">
        {sorted.length === 0 ? (
          <div style={{ padding: '20px 4px', color: 'var(--text-3)', fontSize: 12, textAlign: 'center' }}>No flights to rank</div>
        ) : (
          sorted.map((f, i) => {
            const mins = parseMin(f.t);
            const widthPct = Math.max(2, (mins / maxMin) * 100).toFixed(0);
            return (
              <div className="bar-row" key={`${f.date}-${f.dep}-${f.arr}-${i}`} title={`${f.date}  ·  ${f.al || ''}`}>
                <span className="bar-label">{f.dep}→{f.arr}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${widthPct}%`, background: `linear-gradient(90deg,${c1},${c2})` }}>{f.t}</div>
                </div>
                <span className="bar-pct" style={{ width: 54, minWidth: 54, textAlign: 'right' }}>{f.ac}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
