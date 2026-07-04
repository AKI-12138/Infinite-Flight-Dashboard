import type { ReactNode } from 'react';

// チャート用カードの外枠（旧 index.html の .card + .card-header + .chart-wrap）。
// ⛶ 拡大ボタンは後の手順（拡大オーバーレイ）で本実装。いまは onExpand に notReady を渡す。
export function ChartCard({ title, onExpand, children }: { title: string; onExpand: () => void; children: ReactNode }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">{title}</div>
        <div className="card-actions">
          <button className="card-expand-btn" type="button" onClick={onExpand} title="Expand">⛶</button>
        </div>
      </div>
      <div className="chart-wrap">{children}</div>
    </div>
  );
}
