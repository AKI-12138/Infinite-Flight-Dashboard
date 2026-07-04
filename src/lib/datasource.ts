// =============================== DATA SOURCE ===============================
// Flight history と custom airports を localStorage に永続化する「データ倉庫」。
// UI とデータの唯一の境界（single boundary）。UI は必ずここの窓口を通す。
// 将来 Supabase 等へ移すときは load() / _persistAfterChange() の中身だけ差し替える
// ＝メソッドのシグネチャは維持する（CLAUDE.md の鉄則）。
//
// 旧版（バニラ JS）との違い：
//   - 単発コールバック（onDirtyChange / onAutoSave / onAutoSaveError）を廃止し、
//     複数購読可能な subscribe() ＋ バージョンカウンタに置換（React の useSyncExternalStore 用）。
//   - グローバル `let flights` は廃止。読み取りは DataSource.flights か React フック経由。
import type { Flight } from './compute';
import { AP } from '../data/airports';

// 保存されるフライトは通し番号 no を持つ（日付順に採番）。
export interface StoredFlight extends Flight { no: number; }
// カスタム空港（内蔵 DB に無い空港。parse の manual 追加や既存カスタム）。
export interface CustomAirport { lat: number; lng: number; city: string; co: string; ct: string; }
export type ExportKind = 'flights' | 'airports';

// localStorage キー（バージョン付き：将来フォーマットを変えても旧データを安全に弾ける）
const _STORAGE_KEY_FLIGHTS = 'if-dashboard:flights:v1';
const _STORAGE_KEY_AIRPORTS = 'if-dashboard:custom-airports:v1';
// 「最後に保存した時刻」（Unix ms 文字列）— Restore モーダルの "saved at 14:32" 表示用
const _STORAGE_KEY_SAVED_AT = 'if-dashboard:saved-at:v1';
// Restore モーダルで「Start fresh」を選んだ印（sessionStorage）。
const _SESSION_OPT_OUT_RESTORE = 'if-dashboard:opt-out-restore';
// CSV エクスポート用ファイル名プレフィックス（ユーザー設定、空ならデフォルト）
const _STORAGE_KEY_EXPORT_PREFIX_FLIGHTS  = 'if-dashboard:export-prefix:flights:v1';
const _STORAGE_KEY_EXPORT_PREFIX_AIRPORTS = 'if-dashboard:export-prefix:airports:v1';
export const EXPORT_PREFIX_DEFAULTS: Record<ExportKind, string> = { flights: 'flightslog', airports: 'airports' };

// ファイル名に安全に使える文字だけ残す：英数字 / _ / - のみ許可、他は _ に変換。
// 最大 40 文字、前後の空白は trim、空文字なら null を返す（呼び出し側でデフォルトに戻す）。
export function sanitizeFilenamePrefix(s: unknown): string | null {
  const t = String(s == null ? '' : s).trim().replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 40);
  return t.length ? t : null;
}

// `getExportPrefix('flights')` などで現在の保存値を取得。未設定なら EXPORT_PREFIX_DEFAULTS を返す。
export function getExportPrefix(kind: ExportKind): string {
  const key = kind === 'airports' ? _STORAGE_KEY_EXPORT_PREFIX_AIRPORTS : _STORAGE_KEY_EXPORT_PREFIX_FLIGHTS;
  const def = EXPORT_PREFIX_DEFAULTS[kind] || 'export';
  if(!STORAGE_AVAILABLE) return def;
  try {
    const v = localStorage.getItem(key);
    return (v && sanitizeFilenamePrefix(v)) || def;
  } catch {
    return def;
  }
}

// `setExportPrefix('flights', 'mylog')` で保存。空文字ならキーごと削除（デフォルトに戻す）。
export function setExportPrefix(kind: ExportKind, value: string): void {
  if(!STORAGE_AVAILABLE) return;
  const key = kind === 'airports' ? _STORAGE_KEY_EXPORT_PREFIX_AIRPORTS : _STORAGE_KEY_EXPORT_PREFIX_FLIGHTS;
  const clean = sanitizeFilenamePrefix(value);
  try {
    if(clean) localStorage.setItem(key, clean);
    else localStorage.removeItem(key);
  } catch {
    // 保存できなくても致命的ではない（次回もデフォルトを使うだけ）
  }
}

// `flightslog_2026-05-23.csv` 形式を組み立てる。日付は実行時の today。
export function buildExportFilename(prefix: string): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const ymd = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const safe = sanitizeFilenamePrefix(prefix) || 'export';
  return `${safe}_${ymd}.csv`;
}

// 起動時に localStorage が実際に書き込み可能か検証する。
// true = 使用可能 / false = 使えない（シークレット・容量超過・無効化・file:// 制限など）。
function _testStorageAvailable(): boolean {
  try {
    const k = '__if-dashboard-test__';
    localStorage.setItem(k, '1');
    const ok = localStorage.getItem(k) === '1';
    localStorage.removeItem(k);
    return ok;
  } catch {
    return false;
  }
}
export const STORAGE_AVAILABLE = _testStorageAvailable();

// =============================== 内部状態 ===============================
let _flights: StoredFlight[] = [];         // [{no, date, dep, arr, ac, al, t}, ...]
let _customAirports: Record<string, CustomAirport> = {};

// カスタム空港を実行中の AP テーブル（data/airports の const）へ反映（旧 _hydrateCustomAirports）。
// AP は静的 const＝リロードのたびに組み込み分だけで作り直されるので、これを呼ばないと
// 過去に手動追加／Import したカスタム空港が地図・カウント・国内/国際判定から消える。
// 組み込み空港は上書きしない（!AP[icao] のときだけ足す）。
function _mergeCustomIntoAP() {
  Object.entries(_customAirports).forEach(([icao, data]) => {
    if(icao && data && !AP[icao]) AP[icao] = data;
  });
}
let _dirty = false;          // true = メモリ状態が最後に取り込み/書き出した CSV と乖離
let _autoSaveEnabled = true; // 一括ロード中など、保存を一時停止したい局面で false
let _version = 0;            // 変更のたびに +1（React の getSnapshot 用の安定した識別子）
let _saveError: Error | null = null; // 直近の自動保存エラー（無ければ null）

// React（と将来の UI）が購読するリスナ集合。データ・dirty・保存いずれの変化でも通知。
const _listeners = new Set<() => void>();
function _notify(){
  _version++;
  _listeners.forEach(l => l());
}

// 自動保存が「成功」したときだけ通知する別チャンネル（旧 main.js の _onAutoSave 相当）。
// UI 側（App）で「✓ Auto-saved · CSV backup recommended」トーストを出すのに使う。
// _notify（毎変更）とは別＝保存スキップ／保存失敗では発火しない。
const _savedListeners = new Set<() => void>();
function _notifySaved(){ _savedListeners.forEach(l => l()); }

function _renumber(){
  _flights.sort((a,b) => a.date.localeCompare(b.date));
  _flights.forEach((f,i) => f.no = i + 1);
}
function _key(f: Flight){
  // 重複検出キー：date/dep/arr/aircraft/airline/duration が同じ = 同一フライト
  return [f.date, f.dep, f.arr, f.ac, (f.al||'').trim().toLowerCase(), f.t].join('|');
}

// データ変更後に呼ぶ：自動保存 + 通知。
// _autoSaveEnabled が false の間は I/O をスキップ（連続変更の最後に 1 回呼ぶ運用）。
function _persistAfterChange(){
  if(!_autoSaveEnabled) return;
  if(!STORAGE_AVAILABLE){
    _saveError = new Error('Storage unavailable');
    return;
  }
  try {
    localStorage.setItem(_STORAGE_KEY_FLIGHTS, JSON.stringify(_flights));
    localStorage.setItem(_STORAGE_KEY_AIRPORTS, JSON.stringify(_customAirports));
    localStorage.setItem(_STORAGE_KEY_SAVED_AT, String(Date.now()));
    // [Start fresh] 後に新しくデータを追加/編集/削除した場合は opt-out を解除（次回は自動復元）。
    try { sessionStorage.removeItem(_SESSION_OPT_OUT_RESTORE); } catch { /* ignore */ }
    _saveError = null;
    _notifySaved(); // 保存成功 → UI に通知（旧 _onAutoSave）
  } catch(e) {
    // 容量超過（QuotaExceededError 等）でも全体は動かす。
    console.warn('Auto-save to localStorage failed:', e);
    _saveError = e instanceof Error ? e : new Error(String(e));
  }
}

// =============================== DataSource（単一境界） ===============================
export const DataSource = {
  // ---- 購読（React useSyncExternalStore 用） ----
  subscribe(listener: () => void): () => void {
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
  },
  // 自動保存が成功したときだけ発火（旧 _onAutoSave）。UI の「✓ Auto-saved」トースト用。
  onSaved(listener: () => void): () => void {
    _savedListeners.add(listener);
    return () => { _savedListeners.delete(listener); };
  },
  getVersion(): number { return _version; },
  get saveError(): Error | null { return _saveError; },

  // ---- 読み取り ----
  get flights(): StoredFlight[] { return _flights; },
  get customAirports(): Record<string, CustomAirport> { return _customAirports; },
  get dirty(): boolean { return _dirty; },
  get count(): number { return _flights.length; },

  markClean(){ _dirty = false; _notify(); },
  markDirty(){ _dirty = true;  _notify(); },

  // フライト一覧を丸ごと入れ替え（フル CSV 再読込で使用）
  replaceAll(newFlights: Flight[]){
    _flights = newFlights.map(f => ({...f, no: 0}));
    _renumber();
    _dirty = false;
    _persistAfterChange();
    _notify();
  },

  // フライトを追加。戻り値 {added, duplicates}
  addFlights(newFlights: Flight[], opts: { skipDuplicates?: boolean } = {}){
    const { skipDuplicates = true } = opts;
    const existing = new Set(_flights.map(_key));
    const added: Flight[] = [], duplicates: Flight[] = [];
    newFlights.forEach(f => {
      if(skipDuplicates && existing.has(_key(f))){
        duplicates.push(f);
      } else {
        _flights.push({...f, no:0});
        existing.add(_key(f));
        added.push(f);
      }
    });
    _renumber();
    if(added.length){
      _dirty = true;
      _persistAfterChange();
    }
    _notify();
    return {added, duplicates};
  },

  addOne(f: Flight){
    _flights.push({...f, no:0});
    _renumber();
    _dirty = true;
    _persistAfterChange();
    _notify();
  },

  removeByIds(ids: number[]): number {
    const set = new Set(ids);
    const before = _flights.length;
    _flights = _flights.filter(f => !set.has(f.no));
    _renumber();
    const removed = before - _flights.length;
    if(removed){
      _dirty = true;
      _persistAfterChange();
    }
    _notify();
    return removed;
  },

  clearAll(): number {
    const n = _flights.length;
    _flights = [];
    if(n){
      _dirty = true;
      _persistAfterChange();
    }
    _notify();
    return n;
  },

  // カスタム空港（内蔵 DB に無い空港）を追加。戻り値 = 追加件数。
  addAirports(newAPs: Record<string, CustomAirport>): number {
    let added = 0;
    Object.entries(newAPs).forEach(([icao, data]) => {
      if(!_customAirports[icao]){ _customAirports[icao] = data; added++; }
      if(!AP[icao]) AP[icao] = data;   // 地図・カウントに即反映（組み込みは上書きしない）
    });
    if(added){
      _dirty = true;
      _persistAfterChange();
    }
    _notify();
    return added;
  },

  // ---- ストレージ層 ----
  isStorageAvailable(){ return STORAGE_AVAILABLE; },

  // localStorage に前回データがあるか（Restore モーダル表示判定用）
  hasStoredData(): boolean {
    if(!STORAGE_AVAILABLE) return false;
    try {
      const raw = localStorage.getItem(_STORAGE_KEY_FLIGHTS);
      if(!raw) return false;
      const arr = JSON.parse(raw);
      return Array.isArray(arr) && arr.length > 0;
    } catch {
      return false;
    }
  },

  // 前回データの「件数」「最新フライト日付」「最終保存時刻」をプレビュー用に返す。
  storedDataSummary(): { count: number; latestDate: string; savedAt: Date | null } | null {
    if(!STORAGE_AVAILABLE) return null;
    try {
      const arr = JSON.parse(localStorage.getItem(_STORAGE_KEY_FLIGHTS) || '[]');
      if(!Array.isArray(arr) || arr.length === 0) return null;
      const latest = arr.reduce((m: string, f: StoredFlight) => (f.date > m ? f.date : m), '');
      const savedAtRaw = localStorage.getItem(_STORAGE_KEY_SAVED_AT);
      const savedAt = savedAtRaw ? new Date(parseInt(savedAtRaw, 10)) : null;
      return { count: arr.length, latestDate: latest, savedAt };
    } catch {
      return null;
    }
  },

  // Async ロード：localStorage から flights + customAirports を復元。
  // BaaS 移行時はこの中身を fetch('/api/flights') に差し替えるだけ。
  // 戻り値：復元に成功して件数が 1 以上なら true。
  //
  // 重要：_flights は同じ配列参照を維持して中身だけ入れ替える（参照を切り替えると
  // 外部が保持した古い参照が空のまま残るバグを避ける）。
  async load(): Promise<boolean> {
    if(!STORAGE_AVAILABLE) return false;
    try {
      const rawF = localStorage.getItem(_STORAGE_KEY_FLIGHTS);
      const rawA = localStorage.getItem(_STORAGE_KEY_AIRPORTS);
      const arr  = rawF ? JSON.parse(rawF) : [];
      const aps  = rawA ? JSON.parse(rawA) : {};
      if(Array.isArray(arr) && arr.length){
        // 自動保存を抑止しながら一括復元（ロード中の重複書き込みを防ぐ）
        _autoSaveEnabled = false;
        _flights.length = 0;
        arr.forEach((f: StoredFlight) => _flights.push({...f}));
        _customAirports = (aps && typeof aps === 'object') ? aps : {};
        _mergeCustomIntoAP();   // 復元したカスタム空港を AP に戻す（地図・カウントへ反映）
        _renumber();
        _autoSaveEnabled = true;
        _dirty = false; // 復元直後は dirty ではない
        _notify();
        return true;
      }
      return false;
    } catch(e) {
      console.warn('Failed to load from localStorage:', e);
      return false;
    }
  },

  // 明示的に localStorage を消す（ヘッダ Clear ボタン等から呼ばれる想定）
  clearStorage(){
    if(!STORAGE_AVAILABLE) return;
    try {
      localStorage.removeItem(_STORAGE_KEY_FLIGHTS);
      localStorage.removeItem(_STORAGE_KEY_AIRPORTS);
      localStorage.removeItem(_STORAGE_KEY_SAVED_AT);
    } catch(e) {
      console.warn('Failed to clear localStorage:', e);
    }
  },
};
