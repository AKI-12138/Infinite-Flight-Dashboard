import { AppIcon } from './icons/AppIcon';

// 空状態カード（旧 index.html の #emptyState を移植）。
// 表示制御は CSS（body.is-empty / body:not(.is-empty) #emptyState）に委ねる＝App が body クラスを切替。
// Import / Add はモーダル（後の手順）を開く。サンプル読込はこの手順で実動作させる。
export interface EmptyStateProps {
  onImport: () => void;
  onAdd: () => void;
  onSample: () => void;
}

export function EmptyState({ onImport, onAdd, onSample }: EmptyStateProps) {
  return (
    <div id="emptyState">
      <div className="empty-card">
        {/* 大きいスポットアイコン。実寸は CSS（.empty-icon .app-icon）で決める＝狭幅で 44px に落とすため。 */}
        <div className="empty-icon"><AppIcon name="flight-route" size={56} /></div>
        <div className="empty-title">Load your flight log</div>
        <div className="empty-sub">
          Your flights stay on this device — never uploaded.<br />
          Import a CSV file, or add your first flight manually.
        </div>
        <div className="empty-actions">
          <button className="btn-primary" onClick={onImport} style={{ background: 'var(--violet)' }}>
            <AppIcon name="import" size={16} />Import CSV
          </button>
          <button className="btn-primary" onClick={onAdd}>
            <span style={{ fontSize: 16 }}>+</span> Add your first flight
          </button>
        </div>
        <div className="empty-sample">
          <button type="button" className="btn-sample" onClick={onSample}>Try it with sample data</button>
        </div>
        <div className="empty-hint">
          <strong>CSV format:</strong> <code>date,dep,arr,aircraft,airline,duration</code> (6 columns)<br />
          <strong>Round-trip:</strong> exported files can be imported back, and edited in any text editor.<br />
          <strong>Auto-saved:</strong> entries are stored in this browser. CSV backup recommended for safety.
        </div>
      </div>
    </div>
  );
}
