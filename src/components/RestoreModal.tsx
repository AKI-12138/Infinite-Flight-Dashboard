import { formatSavedAt } from '../lib/restore';
import { useModalKeyboard } from '../hooks/useModalKeyboard';

// 「Welcome back」復元モーダル（旧 #restoreOverlay）。新セッションで前回データが見つかったとき表示。
// ✓ Restore / + Start fresh のみ（背景クリック・ESC では閉じない＝必ずどちらか選ぶ）。
// ESC は無効（escape:false）。フォーカスは中に移し（Restore ボタン）Tab を中で循環させる。
export function RestoreModal({ open, summary, onRestore, onStartFresh }: {
  open: boolean;
  summary: { count: number; savedAt: Date | null } | null;
  onRestore: () => void;
  onStartFresh: () => void;
}) {
  const modalRef = useModalKeyboard(open, () => {}, { escape: false });

  if (!open || !summary) return null;

  return (
    <div ref={modalRef} className="restore-overlay show" id="restoreOverlay">
      <div className="restore-box">
        <div className="restore-icon" aria-hidden="true">
          <svg viewBox="0 0 100 50" xmlns="http://www.w3.org/2000/svg">
            <path d="M 50 25 C 70 5 95 5 95 25 C 95 45 70 45 50 25 C 30 5 5 5 5 25 C 5 45 30 45 50 25 Z"
              fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="restore-title">Welcome back</div>
        <div className="restore-desc">
          We found <strong>{summary.count} flights</strong> from your last session.<br />
          {summary.savedAt && <span>Last saved <strong>{formatSavedAt(summary.savedAt)}</strong>.</span>}
        </div>
        <div className="restore-note">Saved on your device · not sent anywhere.</div>
        <div className="restore-actions">
          <button className="btn-primary" onClick={onRestore}>✓ Restore</button>
          <button className="btn-outline" onClick={onStartFresh}>+ Start fresh</button>
        </div>
      </div>
    </div>
  );
}
