import type { KeyboardEvent } from 'react';

// クリック可能な非ボタン要素（div/span/th など）を「ボタン相当」にするための共通プロップ。
// マウスの onClick に加え、キーボードの Enter / Space でも発火させる（旧版はマウス専用だった箇所の底上げ）。
// 使い方：<div {...activatable(handler)}>…</div>（onClick は別途付けても、この onKeyDown が Enter/Space を拾う）。
//   role="button" ＋ tabIndex=0 でフォーカス可能になり、styles.css の *:focus-visible が枠を出す。
export function activatable(onActivate: () => void): {
  role: 'button';
  tabIndex: 0;
  onKeyDown: (e: KeyboardEvent) => void;
} {
  return {
    role: 'button',
    tabIndex: 0,
    onKeyDown: (e: KeyboardEvent) => {
      // IME 変換中の確定 Enter は無視（他モーダルの送信と同じ規約）。
      if (e.nativeEvent.isComposing) return;
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault(); // Space でのページスクロールを止める
        onActivate();
      }
    },
  };
}
