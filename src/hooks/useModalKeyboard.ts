import { useEffect, useRef } from 'react';
import { pushEscape } from '../lib/escape-stack';
import { pushTrap } from '../lib/focus-trap';

// モーダル/オーバーレイ共通のキーボード＆スクロール制御。
// 開いている間：①背後スクロールをロック、②ESC を escape-stack 経由で登録（重なっても一番上だけ閉じる）、
// ③フォーカストラップ（Tab をモーダル内で循環・開いたら中へフォーカス移動・閉じたらトリガーへ復帰）。
// escape=false で ESC 無効（Restore のように必ず選択させたい窓）。
// autoFocus=false で「開いた時にフォーカスを動かさない」（自前でフォーカス管理する窓）。
// trapFocus=false で Tab 循環を無効化。
// 返り値の ref を **モーダルの一番外側の要素**（.modal-overlay など）に付けると、その中でフォーカスが循環する。
export function useModalKeyboard<T extends HTMLElement = HTMLDivElement>(
  open: boolean,
  onClose: () => void,
  opts: { lockScroll?: boolean; escape?: boolean; autoFocus?: boolean; trapFocus?: boolean } = {},
) {
  const { lockScroll = true, escape = true, autoFocus = true, trapFocus = true } = opts;
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (!open) return;
    const cleanups: Array<() => void> = [];
    if (escape) cleanups.push(pushEscape(onClose));
    if (lockScroll) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      cleanups.push(() => { document.body.style.overflow = prev; });
    }
    if (trapFocus && ref.current) cleanups.push(pushTrap(ref.current, autoFocus));
    return () => cleanups.forEach((c) => c());
  }, [open, onClose, lockScroll, escape, autoFocus, trapFocus]);
  return ref;
}
