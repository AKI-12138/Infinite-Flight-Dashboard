// ESC キーの一元管理（旧 main.js の単一 keydown ハンドラ＋優先順位の React 版）。
// 各オーバーレイは開いている間 pushEscape(close) で自分の閉じ処理を「スタックの一番上」に積む。
// ESC を押すと **一番上（最後に開いたモーダル）だけ** を閉じる＝重なったモーダルで
// 下の層まで一緒に閉じてしまう問題を防ぐ。
let _stack: Array<() => void> = [];
let _installed = false;

function _onKey(e: KeyboardEvent) {
  if (e.key !== 'Escape') return;
  const top = _stack[_stack.length - 1];
  if (top) {
    e.stopPropagation();
    top();
  }
}

// close ハンドラをスタックに積む。返り値のクリーンアップで取り除く（effect の戻り値に使う）。
export function pushEscape(close: () => void): () => void {
  if (!_installed) { document.addEventListener('keydown', _onKey); _installed = true; }
  _stack.push(close);
  return () => {
    const i = _stack.lastIndexOf(close);
    if (i >= 0) _stack.splice(i, 1);
  };
}
