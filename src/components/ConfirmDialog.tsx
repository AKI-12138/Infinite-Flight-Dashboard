import { useCallback, useEffect, useState } from 'react';
import { _setConfirmListener, type ConfirmRequest } from '../lib/confirm';
import { useModalKeyboard } from '../hooks/useModalKeyboard';

// 破壊的操作の確認モーダル（旧 index.html の #confirmOverlay）。
// requestConfirm() で開き、Cancel / 背景クリック / ESC で閉じる。確認ボタンで onConfirm を実行。
// ⚠️ Enter では確認しない（誤爆で破壊的操作が走らないよう＝旧版と同じ。閉じるのは ESC/Cancel/背景のみ）。
export function ConfirmDialog() {
  const [req, setReq] = useState<ConfirmRequest | null>(null);
  const close = useCallback(() => setReq(null), []);

  useEffect(() => _setConfirmListener(setReq), []);
  const modalRef = useModalKeyboard(!!req, close);

  if (!req) return null;

  return (
    <div ref={modalRef} className="confirm-overlay show" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="confirm-box">
        <div className="confirm-icon">⚠️</div>
        <div className="confirm-title">{req.title}</div>
        <div className="confirm-desc">{req.message}</div>
        <div className="confirm-actions">
          <button className="btn-cancel" onClick={close}>Cancel</button>
          <button className="btn-danger-solid" onClick={() => { req.onConfirm(); close(); }}>{req.confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
