// フォーカストラップの一元管理（escape-stack の兄弟）。
// モーダルを開いている間、Tab / Shift+Tab を「そのモーダルの中」で循環させ、
// 背後の要素へフォーカスが逃げないようにする（＝キーボードだけでモーダルを完結できる）。
// 重なったモーダルでは **一番上（最後に開いた）だけ** がトラップする（下の層は無視）。
// 開いた時にモーダル内へフォーカスを移し、閉じた時に元の要素（トリガーのボタン等）へ戻す。

type Trap = { container: HTMLElement };
let _stack: Trap[] = [];
let _installed = false;

// Tab で移動できる要素を DOM 順で列挙（非表示・disabled・tabindex=-1 は除外）。
function focusables(root: HTMLElement): HTMLElement[] {
  const sel = [
    'a[href]', 'button:not([disabled])', 'input:not([disabled])',
    'select:not([disabled])', 'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');
  return Array.from(root.querySelectorAll<HTMLElement>(sel))
    // 画面に見えている要素だけ（display:none や折り畳み内は除外）。
    .filter((el) => el.getClientRects().length > 0);
}

function _onKey(e: KeyboardEvent) {
  if (e.key !== 'Tab') return;
  const top = _stack[_stack.length - 1];
  if (!top) return;
  const items = focusables(top.container);
  if (items.length === 0) { e.preventDefault(); return; }
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement as HTMLElement | null;
  // フォーカスがモーダルの外に出ていたら中へ引き戻す。
  if (!active || !top.container.contains(active)) {
    e.preventDefault();
    (e.shiftKey ? last : first).focus();
    return;
  }
  // 端で折り返す（Tab で最後→最初、Shift+Tab で最初→最後）。
  if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
}

// 初期フォーカス先：先頭付近（最初の3つ）に入力欄（input/select/textarea）があればそれを優先
// ＝データ入力モーダルで開いた瞬間に入力できる。無ければ最初の可フォーカス要素（多くは ✕ や Cancel）。
// 「先頭付近だけ」に限るのは、下の方にある入力欄（例：Data check のルックアップ）へ飛んで
// スクロールが跳ねるのを防ぐため。
function initialTarget(container: HTMLElement): HTMLElement | null {
  const items = focusables(container);
  if (items.length === 0) return null;
  const near = items.slice(0, 3);
  const field = near.find((el) => el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA');
  return field || items[0];
}

// トラップを積む。autoFocus=true なら開いた瞬間にモーダル内へフォーカスを移す。
// 返り値のクリーンアップでトラップを外し、元の要素へフォーカスを戻す（effect の戻り値で使う）。
export function pushTrap(container: HTMLElement, autoFocus = true): () => void {
  if (!_installed) { document.addEventListener('keydown', _onKey, true); _installed = true; }
  const prevFocus = document.activeElement as HTMLElement | null;
  const trap: Trap = { container };
  _stack.push(trap);
  if (autoFocus) {
    // レイアウト確定後にフォーカス（描画直後は要素サイズが 0 で拾えないことがある）。
    requestAnimationFrame(() => {
      if (_stack[_stack.length - 1] !== trap) return; // 既に上に別モーダルが乗ったら何もしない
      const t = initialTarget(container);
      if (t) t.focus();
    });
  }
  return () => {
    const i = _stack.lastIndexOf(trap);
    if (i >= 0) _stack.splice(i, 1);
    // トリガー要素がまだ DOM にあればフォーカスを戻す（マウス相当の自然な復帰）。
    if (prevFocus && document.contains(prevFocus) && typeof prevFocus.focus === 'function') {
      requestAnimationFrame(() => prevFocus.focus());
    }
  };
}
