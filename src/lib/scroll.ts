// 画面内スクロールの共通ヘルパー（フェーズK-1／K-3・2026-08-18）。
//
// ⚠️ ここを通す理由は 2 つ。
//  1. **OS の「動きを減らす」設定に従う**：J-1 で CSS 側の動きは `prefers-reduced-motion` に
//     対応させたが、JS の `behavior:'smooth'` は素通りしていた（＝方針の抜け穴）。
//  2. **上に貼り付いている帯の分だけ手前で止める**：フィルターバーが `position:sticky; top:0`
//     なので、素直に飛ぶと見出しがバーの裏に隠れる。位置合わせは CSS の
//     `scroll-margin-top`（= `--sticky-top` ＋ 余白）に任せ、その値は
//     FilterBar が実測して `:root` へ書き込む（setStickyTop）。

/** OS の「動きを減らす」設定が ON か。 */
export function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function behavior(): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}

/** ページ最上部へ戻る。 */
export function scrollToTop(): void {
  window.scrollTo({ top: 0, behavior: behavior() });
}

/** id の要素へ飛ぶ（無ければ何もしない）。貼り付き帯の分は scroll-margin-top が吸収する。 */
export function scrollToId(id: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: behavior(), block: 'start' });
}

/**
 * 上に貼り付く帯の高さ（px）を `:root` の `--sticky-top` に記録する。
 * 貼り付き前でもバーの高さは同じで、下方向へ飛べば必ず貼り付くので、
 * `.stuck` かどうかに関係なく実測値をそのまま入れる。
 * 通知バナー（sticky top:0・z-index 上位）は同じ 0 位置に重なるだけで
 * 高さは足し算にならないため、バー高だけを見る。
 */
export function setStickyTop(px: number): void {
  document.documentElement.style.setProperty('--sticky-top', `${Math.round(px)}px`);
}
