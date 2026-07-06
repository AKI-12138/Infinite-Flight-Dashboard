// =============================== MEMO STORE（フライトメモの保存層） ===============================
// フライト1件ごとの詳細メモ（v-speed・時刻・燃料・METAR・自由記述など）を localStorage に永続化する。
// - キーは StoredFlight.id（安定 ID）。no（日付順の通し番号）は振り直されるので使わない。
// - CSV（フライトログ）には一切影響させない（別キー保存・エクスポートはフルバックアップ JSON でのみ）。
// - DataSource と同じ購読モデル（subscribe + version）で React（useSyncExternalStore）に繋ぐ。
// - 将来 Supabase 化するときは、この保存層の中身だけ差し替える（シグネチャ維持＝datasource と同じ流儀）。
//
// ⚠️ datasource.ts から import しない（datasource 側が削除連動でこちらを import するため、
//    循環参照になる）。ストレージ判定は自前で行う（datasource._testStorageAvailable と同等）。

// メモ本体。fields は「項目キー → 入力文字列」の平坦なマップ（項目定義は memo-config.ts が唯一の正）。
// 全項目任意入力＝空文字の項目は保存時に落とす。全項目空なら メモ自体を削除する。
export interface FlightMemo {
  fields: Record<string, string>;
  updatedAt: number; // Unix ms
}

const _STORAGE_KEY_MEMOS = 'if-dashboard:memos:v1';

function _testStorageAvailable(): boolean {
  try {
    const k = '__if-dashboard-memo-test__';
    localStorage.setItem(k, '1');
    const ok = localStorage.getItem(k) === '1';
    localStorage.removeItem(k);
    return ok;
  } catch {
    return false;
  }
}
const STORAGE_AVAILABLE = _testStorageAvailable();

let _memos: Record<string, FlightMemo> = _load();
let _version = 0;
const _listeners = new Set<() => void>();

function _load(): Record<string, FlightMemo> {
  if (!STORAGE_AVAILABLE) return {};
  try {
    const raw = localStorage.getItem(_STORAGE_KEY_MEMOS);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

function _persist(): void {
  if (!STORAGE_AVAILABLE) return;
  try {
    localStorage.setItem(_STORAGE_KEY_MEMOS, JSON.stringify(_memos));
  } catch (e) {
    // 容量超過等でも全体は動かす（datasource の自動保存と同じ姿勢）
    console.warn('Failed to save memos to localStorage:', e);
  }
}

function _notify(): void {
  _version++;
  _listeners.forEach((l) => l());
}

// 空文字・空白のみの項目を落とした fields を返す（保存の正準形）。
export function cleanMemoFields(fields: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  Object.entries(fields).forEach(([k, v]) => {
    const t = String(v ?? '').trim();
    if (t) out[k] = t;
  });
  return out;
}

export const memoStore = {
  // ---- 購読（React useSyncExternalStore 用） ----
  subscribe(listener: () => void): () => void {
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
  },
  getVersion(): number { return _version; },

  // ---- 読み取り ----
  get(flightId: string): FlightMemo | null { return _memos[flightId] ?? null; },
  has(flightId: string): boolean { return !!_memos[flightId]; },
  get count(): number { return Object.keys(_memos).length; },
  // フルバックアップ用：全メモのスナップショット（コピー）を返す。
  all(): Record<string, FlightMemo> { return { ..._memos }; },

  // ---- 書き込み ----
  // 保存：空項目を落とし、全項目空ならメモごと削除（＝「全部消したら無かったことに」）。
  save(flightId: string, fields: Record<string, string>): void {
    const clean = cleanMemoFields(fields);
    if (Object.keys(clean).length === 0) {
      if (_memos[flightId]) { delete _memos[flightId]; _persist(); _notify(); }
      return;
    }
    _memos[flightId] = { fields: clean, updatedAt: Date.now() };
    _persist();
    _notify();
  },

  delete(flightId: string): void {
    if (!_memos[flightId]) return;
    delete _memos[flightId];
    _persist();
    _notify();
  },

  // フライト削除に連動して呼ぶ（datasource.removeByIds / clearAll から）。
  deleteMany(flightIds: string[]): void {
    let changed = false;
    flightIds.forEach((id) => { if (_memos[id]) { delete _memos[id]; changed = true; } });
    if (changed) { _persist(); _notify(); }
  },

  clearAll(): void {
    if (Object.keys(_memos).length === 0) return;
    _memos = {};
    _persist();
    _notify();
  },

  // フルバックアップ復元用：丸ごと入れ替え。
  replaceAll(memos: Record<string, FlightMemo>): void {
    _memos = memos && typeof memos === 'object' ? { ...memos } : {};
    _persist();
    _notify();
  },

  // 明示的に localStorage からも消す（Clear All 連動）。
  clearStorage(): void {
    if (!STORAGE_AVAILABLE) return;
    try { localStorage.removeItem(_STORAGE_KEY_MEMOS); } catch { /* ignore */ }
  },
};
