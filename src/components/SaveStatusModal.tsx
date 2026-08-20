import { type ReactNode } from 'react';
import { useModalKeyboard } from '../hooks/useModalKeyboard';

export type SaveState = 'ok' | 'error' | 'disabled';

// 保存ステータスの詳細ポップアップ（旧 #saveStatusOverlay + openSaveStatusInfo）。
// ⚙️ の保存ステータス行クリックで開く。状態（ok/error/disabled）で見出し・色・本文を切替。
export function SaveStatusModal({ open, status, onClose, onBackup }: {
  open: boolean; status: SaveState; onClose: () => void; onBackup: () => void;
}) {
  const modalRef = useModalKeyboard(open, onClose);
  if (!open) return null;

  let boxClass = '', glyph = '✓', title = 'Auto-saved';
  let desc: ReactNode, note = '';
  if (status === 'disabled') {
    boxClass = ' is-disabled'; glyph = '○'; title = 'Auto-save unavailable';
    desc = (<>This browser blocks storage in the current environment (typically <strong>file://</strong> direct-open).<br />Open via the hosted site or a local HTTP server (<code>python3 -m http.server</code>) for auto-save to work.</>);
    note = 'Your data exists only in memory until you export to CSV.';
  } else if (status === 'error') {
    boxClass = ' is-error'; glyph = '!'; title = 'Auto-save failed';
    desc = (<>The last save attempt failed. Storage may be <strong>full</strong>, or restricted by the browser.<br />Please back up your data via CSV Export.</>);
    note = 'Newer changes may not be persisted.';
  } else {
    desc = (<>Your flights are automatically saved to this device's storage.<br /><strong>CSV backup recommended</strong> for safety.</>);
    note = 'Saved on your device · not sent anywhere.';
  }

  return (
    <div ref={modalRef} className="restore-overlay show" id="saveStatusOverlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={'restore-box' + boxClass}>
        <div className="restore-icon" aria-hidden="true">
          <span style={{ fontSize: 30, fontWeight: 700, lineHeight: 1 }}>{glyph}</span>
        </div>
        <div className="restore-title">{title}</div>
        <div className="restore-desc">{desc}</div>
        <div className="restore-note">{note}</div>
        <div className="restore-actions">
          <button className="btn-primary" onClick={() => { onBackup(); onClose(); }}>Back up as CSV</button>
          <button className="btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
