// =============================== SELF-CHECK（アプリ内セルフチェック） ===============================
// 設定メニュー「Self-check」から実行する軽量診断。開発時の自動テスト（vitest・281件）は
// 公開中のアプリ内では実行できないため、その**要点**（正規化・集計・CSV/バックアップ往復・
// データ整合性・ストレージ）を、実際にユーザーのブラウザで動かして検査する。
// ＝「今この環境でアプリの土台が正しく動いているか」を見る（開発テストの代替ではなく現場版）。
//
// 各チェックは純粋に読み取り（＋一時キーの書き込み→即削除）のみ。ユーザーデータは変更しない。
import { DataSource, STORAGE_AVAILABLE } from './datasource';
import { memoStore } from './memo-store';
import { normalizeDate, normalizeTime, normalizeAirport } from './normalize';
import { parseMin, DURATION_BUCKETS, type Flight } from './compute';
import { buildFlightCSV, parseBulkFlights } from './parse';
import { buildFullBackup, parseFullBackup } from './backup';
import { AP } from '../data/airports';

export interface CheckResult {
  key: string;
  label: string;   // ユーザー向けの短い名前（英語 UI）
  ok: boolean;
  detail?: string; // 失敗時の説明（何が起きているか・どうすればよいか）
}

// 例外はチェック失敗として扱う共通ラッパ（診断パネル自体は落とさない）。
function check(key: string, label: string, fn: () => string | null): CheckResult {
  try {
    const err = fn();
    return err ? { key, label, ok: false, detail: err } : { key, label, ok: true };
  } catch (e) {
    return { key, label, ok: false, detail: `Unexpected error: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export function runSelfChecks(): CheckResult[] {
  const results: CheckResult[] = [];

  // 1) ブラウザ保存（localStorage）が使えるか
  results.push(check('storage', 'Browser storage (auto-save)', () =>
    STORAGE_AVAILABLE ? null : 'localStorage is not available — auto-save is off (private mode or blocked storage).'));

  // 2) 保存済みデータが壊れていないか（保存が無いのは正常）
  results.push(check('saved-data', 'Saved flight data readable', () => {
    if (!STORAGE_AVAILABLE) return null; // 保存不可環境では対象外
    const raw = localStorage.getItem('if-dashboard:flights:v1');
    if (!raw) return null;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? null : 'Saved data exists but is not in the expected format.';
  }));

  // 3) フライト ID の整合性（メモ紐づけの土台）
  results.push(check('flight-ids', 'Flight IDs (notes linkage base)', () => {
    const ids = DataSource.flights.map((f) => f.id);
    if (ids.some((id) => !id)) return 'Some flights are missing an internal ID.';
    if (new Set(ids).size !== ids.length) return 'Duplicate internal flight IDs found.';
    return null;
  }));

  // 4) メモ保存の読み書き（一時キーで往復して即削除）
  results.push(check('memo-store', 'Flight notes storage', () => {
    const testId = '__self-check__';
    memoStore.save(testId, { notes: 'ok' });
    const ok = memoStore.get(testId)?.fields.notes === 'ok';
    memoStore.delete(testId);
    return ok ? null : 'Could not write/read flight notes.';
  }));

  // 5) メモの紐づけ（どのフライトにも属さないメモが無いか。CSV から復元すると起こり得る）
  results.push(check('memo-links', 'Notes linked to flights', () => {
    const flightIds = new Set(DataSource.flights.map((f) => f.id));
    const orphans = Object.keys(memoStore.all()).filter((id) => !flightIds.has(id));
    return orphans.length === 0 ? null :
      `${orphans.length} saved note${orphans.length > 1 ? 's are' : ' is'} not linked to any flight (this happens after restoring from CSV — restore from a Full Backup JSON to keep notes linked).`;
  }));

  // 6) 入力の正規化（境界の要・代表ケース）
  results.push(check('normalize', 'Input normalization', () => {
    if (normalizeDate('2025/6/1') !== '2025-06-01') return 'Date normalization is broken.';
    if (normalizeTime('1:30') !== '1h30m') return 'Time normalization is broken.';
    if (normalizeAirport('rjtt') !== 'RJTT') return 'Airport normalization is broken.';
    return null;
  }));

  // 7) 集計ロジック（代表ケース＋飛行時間バケットの不変条件）
  results.push(check('compute', 'Stats computation', () => {
    if (parseMin('1h30m') !== 90) return 'Duration parsing is broken.';
    for (let i = 0; i < DURATION_BUCKETS.length; i++) {
      const b = DURATION_BUCKETS[i];
      if (b.min >= b.max) return 'Duration buckets are invalid (min >= max).';
      if (i > 0 && DURATION_BUCKETS[i - 1].max !== b.min) return 'Duration buckets are not contiguous.';
    }
    return null;
  }));

  // 8) CSV 書き出し→取り込みの往復（エクスポートしたものが読み戻せるか）
  results.push(check('csv-roundtrip', 'CSV export → import round-trip', () => {
    const sample: Flight = { date: '2025-01-01', dep: 'RJTT', arr: 'RJOO', ac: 'B738', al: 'ANA', t: '1h00m' };
    const rows = parseBulkFlights(buildFlightCSV([sample]));
    const r = rows.find((x) => x.valid);
    if (!r || !r.valid) return 'Exported CSV could not be parsed back.';
    const same = r.date === sample.date && r.dep === sample.dep && r.arr === sample.arr && r.t === sample.t;
    return same ? null : 'CSV round-trip changed the data.';
  }));

  // 9) フルバックアップの往復（書き出した JSON が復元できる形か）
  results.push(check('backup-roundtrip', 'Full Backup (JSON) round-trip', () => {
    const json = buildFullBackup(DataSource.flights, DataSource.customAirports, memoStore.all());
    const parsed = parseFullBackup(json);
    if (!parsed) return 'Backup JSON could not be parsed back.';
    return parsed.flights.length === DataSource.count ? null : 'Backup JSON lost flights in round-trip.';
  }));

  // 10) 空港データベースの整合性（座標・国・大陸が全件そろっているか）
  results.push(check('airport-db', 'Airport database integrity', () => {
    const bad = Object.entries(AP).filter(([icao, a]) =>
      !icao || !a || !Number.isFinite(a.lat) || !Number.isFinite(a.lng) || !a.city || !a.co || !a.ct);
    return bad.length === 0 ? null : `${bad.length} airport entr${bad.length > 1 ? 'ies are' : 'y is'} malformed (${bad.slice(0, 3).map(([i]) => i).join(', ')}${bad.length > 3 ? ', …' : ''}).`;
  }));

  return results;
}
