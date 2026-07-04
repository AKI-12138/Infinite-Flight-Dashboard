import { BAR_GRADIENTS } from '../lib/viz-colors';
import { fmtHM } from '../lib/format';

// Top-N 横バーのカード（旧 render.js renderBars + カード外枠の移植）。
// Aircraft / Airlines / Routes / Airports / Countries / Cities で共用。
// ⚠️ 旧版の「All」トグルは拡大オーバーレイ（別モーダル）を開く＝後の手順。いまは onAll に notReady を渡し、
//    表示は常に Top 5 のまま（active は Top 5 に固定）。
export interface BarCardProps {
  title: string;
  colorKey: keyof typeof BAR_GRADIENTS;
  data: [string, number][]; // computeAll の sorted 済み（降順）
  minsMap?: Record<string, number>; // 併記する総飛行時間（機材／航空会社のみ）
  onAll: () => void;
}

export function BarCard({ title, colorKey, data, minsMap, onAll }: BarCardProps) {
  const rows = data.slice(0, 5);
  // 旧 renderBars は「表示中の 5 件」で max / total を取る（share は Top5 内比率）。
  const max = rows[0]?.[1] || 1;
  const total = rows.reduce((s, d) => s + d[1], 0) || 1;
  const [c1, c2] = BAR_GRADIENTS[colorKey];
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">{title}</div>
        <div className="card-actions">
          <div className="toggle">
            <button className="toggle-btn active" type="button">Top 5</button>
            <button className="toggle-btn" type="button" onClick={onAll}>All</button>
          </div>
        </div>
      </div>
      <div className="bars-compact">
        {rows.length === 0 ? (
          <div style={{ padding: '20px 4px', color: 'var(--text-3)', fontSize: 12, textAlign: 'center' }}>No data</div>
        ) : (
          rows.map(([label, count]) => {
            const pct = ((count / max) * 100).toFixed(0);
            const share = ((count / total) * 100).toFixed(0);
            return (
              <div className="bar-row" key={label}>
                <span className="bar-label">{label}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg,${c1},${c2})` }}>{count}</div>
                </div>
                {minsMap && <span className="bar-time">{fmtHM(minsMap[label] || 0)}</span>}
                <span className="bar-pct">{share}%</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
