import { useEffect, useState } from 'react';
import { useDataSourceStatus } from '../hooks/useDataSource';

const MSG_UNAVAILABLE = 'Auto-save is not available on this device. Your data exists only in memory and will be lost on close. Open via a local HTTP server or the hosted site, and back up via CSV Export.';
const MSG_SAVE_FAILED = 'Failed to auto-save (storage may be full or restricted). Please export to CSV as a backup.';

// 上部の通知バナー（旧 #notifyBanner）。保存不可 / 保存失敗を赤バナーで常設表示（✕ で閉じる）。
// 成功通知はトースト側（Toast）に任せる。エラーだけをここで扱う。
export function NotifyBanner() {
  const { storageAvailable, saveError } = useDataSourceStatus();
  const message = !storageAvailable ? MSG_UNAVAILABLE : (saveError ? MSG_SAVE_FAILED : '');
  const [dismissed, setDismissed] = useState('');

  // メッセージが変わったら（新しいエラー）閉じフラグをリセット。
  useEffect(() => { setDismissed((d) => (d === message ? d : '')); }, [message]);

  const show = !!message && dismissed !== message;
  if (!show) return null;

  return (
    <div className="notify-banner notify-error show" id="notifyBanner">
      <span className="notify-msg">{message}</span>
      <button className="notify-close" onClick={() => setDismissed(message)} aria-label="Dismiss">✕</button>
    </div>
  );
}
