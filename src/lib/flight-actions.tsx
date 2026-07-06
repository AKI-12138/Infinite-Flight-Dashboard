// 全削除（Clear all）の確認つきアクション（旧 confirmDeleteAll + executeDelete の 'all' 分岐）。
// ヘッダの ≡「Clear all」とフライトログの「Clear All」ボタンの両方から呼ぶ。
import { DataSource } from './datasource';
import { memoStore } from './memo-store';
import { requestConfirm } from './confirm';
import { showToast } from './toast';

export function confirmDeleteAll(): void {
  const n = DataSource.count;
  if (n === 0) return;
  const memoCnt = memoStore.count;
  requestConfirm({
    title: 'Delete ALL Flights?',
    // 旧版と同じく「all N flights」を太字＋改行（他 2 つの削除確認と表記を揃える）。
    message: <>This will permanently remove <strong>all {n} flights</strong> from your log.
      {memoCnt > 0 && <><br />All saved flight notes ({memoCnt}) will be deleted too.</>}<br />This action cannot be undone.</>,
    confirmLabel: '🗑️ Delete',
    onConfirm: () => {
      // Clear all は「全部消す」意図なので localStorage も明示クリア（次回 Restore を出さない）。
      DataSource.clearAll();
      DataSource.clearStorage();
      showToast(`🗑️ ${n} flight${n > 1 ? 's' : ''} deleted`, 'red');
    },
  });
}
