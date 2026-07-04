// 起動時の「前回データ復元」判定（旧 main.js の _bootstrap 内ロジック）。
// - 新セッション＋保存データあり＋opt-out していない → Restore モーダルを出す（自動復元しない）。
// - 同一セッションのリフレッシュ → 黙って復元（silent）。
// - opt-out（Start fresh 済み）or 保存データ無し → 何もしない（空状態）。
//
// 判定は「セッションフラグを 1 回だけ立てる」副作用を含むため、module ロード時に一度だけ実行する
// （React StrictMode の effect 二重呼び出しでもぶれないよう、effect ではなくここで確定）。
import { DataSource } from './datasource';

const SESSION_FLAG = 'if-dashboard:session-flag';
const OPT_OUT = 'if-dashboard:opt-out-restore';

export type RestoreDecision =
  | { mode: 'modal'; summary: { count: number; latestDate: string; savedAt: Date | null } }
  | { mode: 'silent' }
  | { mode: 'none' };

function _readSessionState(): { isNewSession: boolean; isOptedOut: boolean } {
  let isNewSession = true, isOptedOut = false;
  try {
    isNewSession = !sessionStorage.getItem(SESSION_FLAG);
    isOptedOut = !!sessionStorage.getItem(OPT_OUT);
  } catch { /* sessionStorage 不可環境：新規扱い・opt-out なし */ }
  return { isNewSession, isOptedOut };
}

// セッションを「決定済み」にする＝以降このタブのリフレッシュは自動復元（silent）扱いになる。
// ⚠️ 復元モーダルを「表示しただけ」では立てない（＝未決定のまま更新したら Welcome back を再表示）。
//    ユーザーが Restore / Start fresh を選んだ時（App 側）と、silent/none に確定した時だけ立てる。
export function markSessionSeen() { try { sessionStorage.setItem(SESSION_FLAG, '1'); } catch { /* ignore */ } }

export function setOptOut() { try { sessionStorage.setItem(OPT_OUT, '1'); } catch { /* ignore */ } }
export function clearOptOut() { try { sessionStorage.removeItem(OPT_OUT); } catch { /* ignore */ } }

// 「Last saved 〜」表示用の相対時刻（旧 _formatSavedAt）。
export function formatSavedAt(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (dayDiff === 0) return `today at ${time}`;
  if (dayDiff === 1) return `yesterday at ${time}`;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} at ${time}`;
}

// module ロード時に 1 回だけ確定（セッションフラグの副作用もここで 1 回）。
export const INITIAL_RESTORE: RestoreDecision = (() => {
  const { isNewSession, isOptedOut } = _readSessionState();
  if (DataSource.hasStoredData() && !isOptedOut) {
    if (isNewSession) {
      const summary = DataSource.storedDataSummary();
      // モーダルは「未決定」の状態。ここでは seen フラグを立てない
      // ＝この画面のまま更新しても、また Welcome back を出す（ユーザーの選択を待つ）。
      if (summary) return { mode: 'modal', summary };
    }
    markSessionSeen(); // 同一セッションの更新 → 黙って復元。以降も silent。
    // ⚠️ 最初の描画“前”（module 初期化時）に同期ロードする。load() は async だが中身は同期
    // （localStorage を読むだけ）なので、ここで呼べば初回レンダーからデータありになり、
    // 「一瞬だけ空状態が出てから戻る」ちらつきを防げる（旧: App の useEffect で描画後にロードしていた）。
    void DataSource.load();
    return { mode: 'silent' };
  }
  markSessionSeen(); // データ無し / opt-out 済み → 空状態。同一セッションでは再判定しない。
  return { mode: 'none' };
})();
