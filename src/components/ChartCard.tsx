import type { ReactNode } from 'react';

// チャート用カードの外枠（旧 index.html の .card + .card-header + .chart-wrap）。
// actions＝⛶ の左に置く追加アクション（表示形式トグル等・2026-07-11）。
export function ChartCard({ title, onExpand, actions, children }: {
  title: string; onExpand: () => void; actions?: ReactNode; children: ReactNode;
}) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">{title}</div>
        <div className="card-actions">
          {actions}
          <button className="card-expand-btn" type="button" onClick={onExpand} title="Expand">⛶</button>
        </div>
      </div>
      <div className="chart-wrap">{children}</div>
    </div>
  );
}
