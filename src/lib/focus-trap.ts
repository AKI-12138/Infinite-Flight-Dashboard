// フォーカストラップの一元管理（escape-stack の兄弟）。
// モーダルを開いている間、Tab / Shift+Tab を「そのモーダルの中」で循環させ、
// 背後の要素へフォーカスが逃げないようにする（＝キーボードだけでモーダルを完結できる）。
// 重なったモーダルでは **一番上（最後に開いた）だけ** がトラップする（下の層は無視）。
// 開いた時にモーダル内へフォーカスを移し、閉じた時に元の要素（トリガーのボタン等）へ戻す。

import { lastInputModality } from './input-modality';

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
// ＝データ入力モーダルで開いた瞬間に入力できる。
// 「先頭付近だけ」に限るのは、下の方にある入力欄（例：Data check のルックアップ）へ飛んで
// スクロールが跳ねるのを防ぐため。
//
// 入力欄が無いとき（ボタンだけの窓）は【直前の操作がキーボードだったときだけ】最初のボタンへ。
// ポインタ操作や「まだ何も操作していない＝自動で開いた窓」では null を返し、
// 呼び出し側が中立の入れ物（container 自身）へフォーカスする（ADV-011・2026-08-18）。
//   → 理由：塗りつぶしボタンの外に青い枠が残ると「選択済み・押されたまま」に見えるため。
//     枠を消すのではなく【枠が要る人（キーボード）にだけ出す】ことで両立させる。
//   ⚠️ 入力欄は modality に関係なく従来どおりフォーカスする。カーソルが出るのが正しい姿で、
//      枠が出ても「入力できる場所」の合図として自然なため。
function initialTarget(container: HTMLElement): HTMLElement | null {
  const items = focusables(container);
  if (items.length === 0) return null;
  const near = items.slice(0, 3);
  const field = near.find((el) => el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA');
  if (field) return field;
  return lastInputModality() === 'keyboard' ? items[0] : null;
}

// 中立フォーカス：container 自身へフォーカスする。
// Tab では拾われない tabindex="-1" を（無ければ）付け、外すときは元に戻す。
// data-focus-neutral は「これはプログラムが当てた中立フォーカスで、枠は出さない」という印
// （foundation.css の *:focus-visible をこの要素だけ打ち消す）。
function focusNeutral(container: HTMLElement): () => void {
  const hadTabIndex = container.hasAttribute('tabindex');
  if (!hadTabIndex) container.setAttribute('tabindex', '-1');
  container.setAttribute('data-focus-neutral', '');
  // preventScroll：全画面の幕にフォーカスするだけなので、背後のスクロール位置を動かさない。
  container.focus({ preventScroll: true });
  return () => {
    if (!hadTabIndex) container.removeAttribute('tabindex');
    container.removeAttribute('data-focus-neutral');
  };
}

// トラップを積む。autoFocus=true なら開いた瞬間にモーダル内へフォーカスを移す。
// 返り値のクリーンアップでトラップを外し、元の要素へフォーカスを戻す（effect の戻り値で使う）。
export function pushTrap(container: HTMLElement, autoFocus = true): () => void {
  if (!_installed) { document.addEventListener('keydown', _onKey, true); _installed = true; }
  const prevFocus = document.activeElement as HTMLElement | null;
  const trap: Trap = { container };
  _stack.push(trap);
  let undoNeutral: (() => void) | null = null;
  if (autoFocus) {
    // レイアウト確定後にフォーカス（描画直後は要素サイズが 0 で拾えないことがある）。
    requestAnimationFrame(() => {
      if (_stack[_stack.length - 1] !== trap) return; // 既に上に別モーダルが乗ったら何もしない
      const t = initialTarget(container);
      if (t) t.focus();
      // 当て先が無い＝ボタンだけの窓をマウス/自動で開いた場合。中立の入れ物へ移す。
      // フォーカスを窓の外（背後のトリガー）に置いたままにしないのが目的で、
      // ここから Tab を1回押せば最初の操作要素へ移り、そこで初めて枠が出る。
      else undoNeutral = focusNeutral(container);
    });
  }
  return () => {
    const i = _stack.lastIndexOf(trap);
    if (i >= 0) _stack.splice(i, 1);
    if (undoNeutral) { undoNeutral(); undoNeutral = null; }
    // トリガー要素がまだ DOM にあればフォーカスを戻す（マウス相当の自然な復帰）。
    if (prevFocus && document.contains(prevFocus) && typeof prevFocus.focus === 'function') {
      requestAnimationFrame(() => prevFocus.focus());
    }
  };
}
