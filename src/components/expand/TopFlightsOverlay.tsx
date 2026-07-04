import { useEffect, useState } from 'react';
import { parseMin, type Flight } from '../../lib/compute';
import { TIME_GRADIENT } from '../../lib/viz-colors';
import { useModalKeyboard } from '../../hooks/useModalKeyboard';

type SortKey = 'time-desc' | 'time-asc' | 'date-desc' | 'date-asc';

// Top Flights の ⛶ で開く全件ランキング（旧 #flightsOverlay + _renderFlightsExpanded）。
// フィルタ適用後の全フライトを、選んだソートで縦リスト表示。背景クリック / ✕ / ESC で閉じる。
export function TopFlightsOverlay({ open, flights, onClose }: { open: boolean; flights: Flight[]; onClose: () => void }) {
  const [sort, setSort] = useState<SortKey>('time-desc');

  // autoFocus=false：開いた瞬間に並び替え select を自動フォーカスして枠が出るのを防ぐ（オーナー指摘）。
  const modalRef = useModalKeyboard(open, onClose, { autoFocus: false });
  useEffect(() => { if (open) setSort('time-desc'); }, [open]); // 開くたび既定に戻す

  if (!open) return null;

  const sorted = flights.slice().sort((a, b) => {
    switch (sort) {
      case 'time-asc': return parseMin(a.t) - parseMin(b.t);
      case 'date-desc': return String(b.date).localeCompare(String(a.date));
      case 'date-asc': return String(a.date).localeCompare(String(b.date));
      default: return parseMin(b.t) - parseMin(a.t); // time-desc
    }
  });
  const maxMin = Math.max(...sorted.map((f) => parseMin(f.t)), 1) || 1;
  const [c1, c2] = TIME_GRADIENT;

  return (
    <div ref={modalRef} className="flights-overlay show" id="flightsOverlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flights-panel">
        <div className="flights-panel-header">
          <h3>⏱️ Top Flights by Time</h3>
          <div className="expanded-sort">
            <label className="expanded-sort-label">Sort</label>
            <select className="expanded-sort-select" value={sort} onChange={(e) => { setSort(e.target.value as SortKey); e.currentTarget.blur(); }}>
              <option value="time-desc">Time ▾ (Longest)</option>
              <option value="time-asc">Time ▴ (Shortest)</option>
              <option value="date-desc">Date ▾ (Newest)</option>
              <option value="date-asc">Date ▴ (Oldest)</option>
            </select>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <div className="flights-panel-body" id="flightsExpandedScroll">
          {sorted.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>No flights match current filters</div>
          ) : sorted.map((f, i) => {
            const mins = parseMin(f.t);
            const widthPct = Math.max(2, (mins / maxMin) * 100).toFixed(0);
            return (
              <div className="flight-row" key={`${f.date}-${f.dep}-${f.arr}-${i}`} title={f.al || ''}>
                <span className="flight-row-rank">#{i + 1}</span>
                <span className="flight-row-date">{f.date}</span>
                <span className="flight-row-route">{f.dep} → {f.arr}</span>
                <span className="flight-row-ac">{f.ac}</span>
                <span className="flight-row-airline">{f.al || ''}</span>
                <div className="flight-row-track"><div className="flight-row-fill" style={{ width: `${widthPct}%`, background: `linear-gradient(90deg,${c1},${c2})` }}>{f.t}</div></div>
              </div>
            );
          })}
        </div>
        <div className="flights-panel-footer">
          <div><div className="total-label">{flights.length}</div><div className="total-sub">total flights</div></div>
        </div>
      </div>
    </div>
  );
}
