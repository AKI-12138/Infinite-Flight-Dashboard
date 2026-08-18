import { useEffect, useRef, useState } from 'react';
import { scrollToId } from '../../lib/scroll';

// セクションへ飛ぶ小さな導線（フェーズK-3・2026-08-18）。
//
// なぜ必要か：375px 幅では 1 ページが約 5,500px（約 7 画面分）あり、地図・ランキング・
// 推移・フライト表へ行くには延々とスワイプするしかなかった。中身を隠すタブ化はせず、
// 「今の一本道のまま、目的地へ一足で行ける」だけを足す。
//
// なぜ画面下の固定バーにしないか：下端はトースト（bottom:28px）と iOS Safari の
// ブラウザ UI がいる。既に上端へ貼り付くフィルターバーがあるので、その中へ同居させれば
// 貼り付き・重なり順・背景の仕組みを丸ごと再利用でき、新しい固定要素を増やさずに済む。
//
// なぜチップを 5 個並べずメニュー 1 個にするか：5 個並べると横スクロールが必要になり、
// さらにバーの高さが変わって「上に貼り付く高さ」がぶれる（＝飛び先の位置補正もぶれる）。
// メニューなら押す的は 1 つだけで、バーの高さは変わらない。
const TARGETS: { id: string; label: string }[] = [
  { id: 'statsGrid', label: 'Overview' },
  { id: 'sec-map', label: 'Map' },
  { id: 'sec-breakdowns', label: 'Breakdowns' },
  { id: 'sec-trends', label: 'Trends' },
  { id: 'sec-log', label: 'Flight Log' },
];

export function SectionJump({ onBeforeJump }: { onBeforeJump: () => void }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // メニュー外クリック / ESC で閉じる（ヘッダーメニューと同じ作法）。
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function jump(id: string) {
    setOpen(false);
    // 先にフィルターを畳む。展開中のバーは上端に貼り付いたまま画面の 1/3 を占め、
    // その高さの分だけ飛び先が下にずれてしまうため。
    onBeforeJump();
    // 畳んだ結果の高さが確定し、FilterBar が --sticky-top を測り直すのを待ってから飛ぶ
    // （rAF 2 回＝「レイアウト確定後の次の描画」）。
    requestAnimationFrame(() => requestAnimationFrame(() => scrollToId(id)));
  }

  return (
    <div ref={wrapRef} className={'jump-wrap' + (open ? ' open' : '')}>
      <button
        type="button" className="jump-btn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu" aria-expanded={open}
        title="Jump to a section"
      >
        <span>Jump</span>
        <span className="jump-arrow" aria-hidden="true">▾</span>
      </button>
      <div className="jump-menu" role="menu" aria-label="Jump to a section">
        {TARGETS.map((t) => (
          <button key={t.id} type="button" className="jump-item" role="menuitem" onClick={() => jump(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
