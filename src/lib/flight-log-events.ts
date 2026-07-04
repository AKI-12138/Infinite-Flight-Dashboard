// ヘッダ ≡ の「Search flights」→ フライトログの検索欄へフォーカス（旧 focusFlightSearch）。
// ヘッダとテーブルは別ツリーなので、モジュールイベントで疎結合に繋ぐ。FlightLog が購読する。
let _listener: (() => void) | null = null;

export function focusFlightSearch(): void {
  _listener?.();
}

export function _setFocusSearchListener(fn: () => void): () => void {
  _listener = fn;
  return () => { if (_listener === fn) _listener = null; };
}
