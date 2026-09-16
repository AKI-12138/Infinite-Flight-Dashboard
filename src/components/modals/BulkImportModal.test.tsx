// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BulkImportModal } from './BulkImportModal';
import { ConfirmDialog } from '../ConfirmDialog';
import { DataSource, type StoredFlight } from '../../lib/datasource';
import { memoStore } from '../../lib/memo-store';
import { buildFullBackup } from '../../lib/backup';

// フルバックアップ復元の「確認を出す／出さない」契約を凍結する（オーナー判断 2026-09-16）。
//   ①失うものが無い（フライト0件かつメモ0件）→ 確認モーダルを出さずに即復元。
//     ＝ ConfirmDialog は ⚠️＋赤ボタン固定なので、空の状態で出すと
//       「your current 0 flights を置き換える／cannot be undone」という嘘の警告になるため。
//   ②既存データがある → 従来どおり確認モーダルを出し、押すまで置き換えない（破壊的操作の確認を壊さない）。
// このガードは「確認が出るのが普通」に見えるぶん静かに退行しやすいので、両方向を留める。

const BACKUP_FLIGHT: StoredFlight = {
  id: 'backup-1', no: 1, date: '2025-03-01', dep: 'RJTT', arr: 'RJOO', ac: 'B738', al: 'ANA', t: '1h00m',
};
const BACKUP_JSON = buildFullBackup([BACKUP_FLIGHT], {}, {});

beforeEach(() => {
  localStorage.clear();
  DataSource.clearAll();
  memoStore.clearAll();
});
afterEach(cleanup);

// モーダルを開き、Flights タブの textarea にバックアップ JSON を入れて取込ボタンを押す。
function pasteBackupAndSubmit() {
  render(<><BulkImportModal open onClose={() => {}} /><ConfirmDialog /></>);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: BACKUP_JSON } });
  // バックアップ判別時はボタンのラベルが「Import Flights」から変わる＝判別できている証拠も兼ねる。
  fireEvent.click(screen.getByRole('button', { name: '↺ Restore Backup' }));
}

describe('BulkImportModal — フルバックアップ復元の確認', () => {
  it('フライト0件・メモ0件なら確認を出さずに復元する', () => {
    pasteBackupAndSubmit();
    expect(screen.queryByText('Restore Full Backup?')).not.toBeInTheDocument();
    expect(DataSource.count).toBe(1);
    expect(DataSource.flights[0].id).toBe('backup-1'); // id ごと復元＝メモの紐づけが保たれる
  });

  it('既存フライトがあるなら確認を出し、押すまで置き換えない', () => {
    DataSource.addFlights([{ date: '2024-01-01', dep: 'RJAA', arr: 'KLAX', ac: 'B77W', al: 'JAL', t: '10h00m' }]);
    pasteBackupAndSubmit();
    expect(screen.getByText('Restore Full Backup?')).toBeInTheDocument();
    expect(DataSource.count).toBe(1);
    expect(DataSource.flights[0].dep).toBe('RJAA'); // まだ置き換わっていない

    fireEvent.click(screen.getByRole('button', { name: '↺ Restore' }));
    expect(DataSource.count).toBe(1);
    expect(DataSource.flights[0].dep).toBe('RJTT'); // 確認後に置き換わる
  });

  it('フライト0件でもメモが残っていれば確認を出す', () => {
    memoStore.save('orphan-note', { notes: 'hello' });
    pasteBackupAndSubmit();
    expect(screen.getByText('Restore Full Backup?')).toBeInTheDocument();
  });
});
