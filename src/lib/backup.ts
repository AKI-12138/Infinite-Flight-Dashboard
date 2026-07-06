// =============================== FULL BACKUP（JSON フルバックアップ） ===============================
// フライト（id 付き）＋カスタム空港＋フライトメモを 1 ファイルの JSON に書き出し/復元する。
// CSV エクスポート（統計データのみ・メモ無し）と違い、id を保存するのでメモとの紐づけが復元後も保たれる。
// 組み立て（build）と検証（parse）は純ロジック＝ここに置き、DL/取込の実行は UI 層が行う。
import type { StoredFlight, CustomAirport } from './datasource';
import type { FlightMemo } from './memo-store';

export const BACKUP_FORMAT = 'IF_Dashboard_Backup';
export const BACKUP_VERSION = 1;

export interface FullBackup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string; // ISO 8601
  flights: StoredFlight[];
  customAirports: Record<string, CustomAirport>;
  memos: Record<string, FlightMemo>;
}

export function buildFullBackup(
  flights: StoredFlight[],
  customAirports: Record<string, CustomAirport>,
  memos: Record<string, FlightMemo>,
): string {
  const backup: FullBackup = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    flights,
    customAirports,
    memos,
  };
  return JSON.stringify(backup, null, 2);
}

// バックアップ JSON の検証つきパース。形式違い・壊れた JSON は null（呼び出し側でエラー表示）。
// フライト行は最低限の型（date/dep/arr/ac/al/t が文字列）だけ確認する。
export function parseFullBackup(text: string): FullBackup | null {
  let obj: unknown;
  try { obj = JSON.parse(text); } catch { return null; }
  if (!obj || typeof obj !== 'object') return null;
  const b = obj as Partial<FullBackup>;
  if (b.format !== BACKUP_FORMAT) return null;
  if (typeof b.version !== 'number' || b.version < 1) return null;
  if (!Array.isArray(b.flights)) return null;
  const flightsOk = b.flights.every((f) =>
    f && typeof f === 'object' &&
    ['date', 'dep', 'arr', 'ac', 'al', 't'].every((k) => typeof (f as unknown as Record<string, unknown>)[k] === 'string'),
  );
  if (!flightsOk) return null;
  return {
    format: BACKUP_FORMAT,
    version: b.version,
    exportedAt: typeof b.exportedAt === 'string' ? b.exportedAt : '',
    flights: b.flights as StoredFlight[],
    customAirports: (b.customAirports && typeof b.customAirports === 'object') ? b.customAirports : {},
    memos: (b.memos && typeof b.memos === 'object') ? b.memos : {},
  };
}

// テキストが「フルバックアップ JSON らしい」かの軽い判定（Import 画面での自動判別用）。
export function looksLikeBackup(text: string): boolean {
  const t = text.trim();
  return t.startsWith('{') && t.includes(BACKUP_FORMAT);
}

export function buildBackupFilename(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `if-dashboard-backup_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}
